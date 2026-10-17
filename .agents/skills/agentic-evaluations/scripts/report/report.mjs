const Z80 = 1.2815515655446004;

/** Returns a two-sided 80% Wilson interval for an observed binomial count. */
function wilson(successes, opportunities) {
 if (!opportunities) return null;
 const proportion = successes / opportunities;
 const squared = Z80 * Z80;
 const denominator = 1 + squared / opportunities;
 const center = (proportion + squared / (2 * opportunities)) / denominator;
 const radius = Z80 * Math.sqrt(proportion * (1 - proportion) / opportunities + squared / (4 * opportunities * opportunities)) / denominator;
 return [Math.max(0, center - radius), Math.min(1, center + radius)];
}

function requireText(value, label) {
 if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be nonempty text.`);
}

/** Validates counts and evidence before any scores or output files are produced. */
function validate(run) {
 if (run.schemaVersion !== 1) throw new Error('Unsupported schemaVersion.');
 for (const key of ['runId','skillVersion','rubricVersion','appVersion','evaluator']) requireText(run[key],key);
 if (!Array.isArray(run.findings) || !Array.isArray(run.cases) || !run.cases.length) throw new Error('findings and nonempty cases are required.');
 run.findings.forEach(value => requireText(value,'finding'));
 if (['2','3','4','5','6'].includes(run.skillVersion)) {
  for (const key of ['startedAt','endedAt']) {
   if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(run[key] ?? '') || !Number.isFinite(Date.parse(run[key]))) throw new Error(`${key} requires an exact UTC timestamp.`);
  }
  if (Date.parse(run.endedAt) < Date.parse(run.startedAt)) throw new Error('Run end precedes start.');
  for (const key of ['timeZone','localCommit','deployedCommit']) requireText(run[key],key);
  try { new Intl.DateTimeFormat('en',{timeZone:run.timeZone}); } catch { throw new Error('Invalid timeZone.'); }
 }
 if (run.evaluatorNotes) {
  if (run.evaluatorNotes.plus?.length > 3) throw new Error('Evaluator report permits at most three Plus findings.');
  for (const section of ['minus','plus','interesting']) {
   if (!Array.isArray(run.evaluatorNotes[section])) throw new Error(`evaluatorNotes.${section} must be an array.`);
   run.evaluatorNotes[section].forEach(note => requireText(typeof note==='string'?note:note?.text,'evaluator note'));
  }
  if (run.evaluatorNotes.auxiliaryFailures) {
   if (!Array.isArray(run.evaluatorNotes.auxiliaryFailures)) throw new Error('auxiliaryFailures must be an array.');
   run.evaluatorNotes.auxiliaryFailures.forEach(note => requireText(typeof note==='string'?note:note?.text,'auxiliary failure'));
  }
 }
 if (run.summary) {
  if ((run.summary.minus?.length??0)+(run.summary.auxiliaryFailures?.length??0)>10) throw new Error('Report permits at most ten Minus findings.');
  if (run.summary.minusContext !== undefined) requireText(run.summary.minusContext,'failure context');
  if (run.summary.plus?.length > 3) throw new Error('Tutor report permits at most three Plus findings.');
  for (const [section,prefix] of [['plus','P'],['minus','M'],['interesting','I']]) {
   if (!Array.isArray(run.summary[section])) throw new Error(`summary.${section} must be an array.`);
   run.summary[section].forEach((item,index) => {
    if (item.id !== `${prefix}${index+1}`) throw new Error('Summary references must be ordered P, M or I IDs.');
    requireText(item.text,'summary text');
    if (!Array.isArray(item.records) || !item.records.length) throw new Error('Summary items require inline records.');
    item.records.forEach(record => requireText(record,'summary record'));
   });
  }
 }
 if (run.summary?.auxiliaryFailures) {
  if (!Array.isArray(run.summary.auxiliaryFailures)) throw new Error('summary.auxiliaryFailures must be an array.');
  run.summary.auxiliaryFailures.forEach((item,index)=> {
   if (item.id !== `M${run.summary.minus.length+index+1}`) throw new Error('Auxiliary failures continue the Minus references.');
   requireText(item.text,'auxiliary failure');
   if (!Array.isArray(item.records) || !item.records.length) throw new Error('Auxiliary failures require records.');
   item.records.forEach(record=>requireText(record,'auxiliary record'));
  });
 }
 if (['4','5','6'].includes(run.skillVersion)) {
  const findings=[...Object.entries(run.summary??{}).filter(([key])=>key!=='minusContext').flatMap(([,value])=>value),...Object.values(run.evaluatorNotes??{}).flat()];
  for (const item of findings) {
   if (!Array.isArray(item.screenshots) || !item.screenshots.length || !Array.isArray(item.records) || !item.records.length) throw new Error('Every displayed finding requires screenshots and records.');
  }
  const startingDevice=run.skillVersion==='6'?run.startingDevice:'mobile';
  if (!['mobile','desktop'].includes(startingDevice)) throw new Error('startingDevice must be mobile or desktop.');
  run.cases.forEach((scenario,index)=> {
   const expectedDevice=index%2===0?startingDevice:(startingDevice==='mobile'?'desktop':'mobile');
   if (scenario.device !== expectedDevice) throw new Error('Cases must alternate mobile and desktop.');
   if (!Number.isInteger(scenario.viewport?.width) || !Number.isInteger(scenario.viewport?.height)) throw new Error('Case viewport dimensions are required.');
   if (run.skillVersion === '6') {
    const expected = scenario.device === 'mobile' ? [390,844] : [1440,900];
    if (scenario.viewport.width <= 0 || scenario.viewport.height <= 0) throw new Error('Actual viewport dimensions must be positive.');
    if (scenario.status === 'complete' && (scenario.viewport.width !== expected[0] || scenario.viewport.height !== expected[1])) throw new Error('Actual viewport must match the assigned device; record mismatches as blocked before reporting.');
   }
  });
 }
 const seen = new Set();
 for (const scenario of run.cases) {
  for (const key of ['id','scenarioVersion','family']) requireText(scenario[key],key);
  if (!['training','held-out'].includes(scenario.split) || !['complete','incomplete','blocked'].includes(scenario.status)) throw new Error('Invalid case split/status.');
  if (!Number.isSafeInteger(scenario.attempt) || scenario.attempt < 1) throw new Error('attempt must be a positive integer.');
  const identity = `${scenario.id}:${scenario.attempt}`;
  if (seen.has(identity)) throw new Error('Duplicate case attempt.');
  seen.add(identity);
  if (!Array.isArray(scenario.checks) || !Array.isArray(scenario.sessions)) throw new Error('checks/sessions arrays are required.');
  const checkIds = new Set();
  for (const check of scenario.checks) {
   for (const key of ['id','category','note']) requireText(check[key],key);
   if (checkIds.has(check.id)) throw new Error('Duplicate check in case.');
   checkIds.add(check.id);
   if (!['binary','rate'].includes(check.kind) || !['observed','not-applicable','unable-to-verify'].includes(check.status)) throw new Error('Invalid check kind/status.');
   if (!Array.isArray(check.evidence) || !check.evidence.length) throw new Error('Every judgment needs evidence or an explicit unavailable-evidence reason.');
   check.evidence.forEach(value => requireText(value,'evidence'));
   if (check.status === 'observed') {
    if (!Number.isSafeInteger(check.successes) || !Number.isSafeInteger(check.opportunities) || check.successes < 0 || check.opportunities < 1 || check.successes > check.opportunities) throw new Error('Counts require integers 0 <= successes <= opportunities, opportunities > 0.');
    if (check.kind === 'binary' && check.opportunities !== 1) throw new Error('Binary checks have exactly one opportunity.');
    if(check.kind === 'rate' && !check.observations) throw new Error('Observed rates require an opportunity ledger.');
    if (check.observations) {
     if(!Array.isArray(check.observations) || check.observations.length !== check.opportunities || check.observations.filter(event=>event.success===true).length !== check.successes) throw new Error('Opportunity ledger must match success/opportunity counts.');
     for(const event of check.observations) {
      if(typeof event.success !== 'boolean') throw new Error('Opportunity ledger success must be boolean.');
      for(const key of ['turn','expected','actual','evidence']) requireText(event[key],`ledger ${key}`);
     }
    }
   } else if (check.successes != null || check.opportunities != null) throw new Error('Excluded checks must omit counts.');
  }
  {
   if (!Array.isArray(scenario.expectedChecks) || !scenario.expectedChecks.length || new Set(scenario.expectedChecks).size !== scenario.expectedChecks.length) throw new Error('expectedChecks must be unique check IDs.');
   for(const id of scenario.expectedChecks) if(!checkIds.has(id)) throw new Error(`Missing declared rubric check: ${id}.`);
   if(scenario.expectedChecks.length !== checkIds.size) throw new Error('Unexpected check outside declared rubric.');
  }
  for (const session of scenario.sessions) {
   for (const key of ['id','url']) requireText(session[key],key);
   if (typeof session.captureComplete !== 'boolean' || !Array.isArray(session.messages) || !session.messages.length) throw new Error('Sessions require captureComplete and ordered messages.');
   for (const message of session.messages) {
    if (!['student','tutor'].includes(message.role)) throw new Error('Unknown message role.');
    requireText(message.text,'message text');
   }
  }
 }
}

/** Rolls required binary checks into one case outcome; rates stay separate. */
function outcome(checks) {
 const applicable = checks.filter(check => check.kind === 'binary' && check.required !== false && check.status !== 'not-applicable');
 if (applicable.some(check => check.status === 'observed' && check.successes === 0)) return 'fail';
 if (applicable.some(check => check.status === 'unable-to-verify')) return 'unknown';
 return applicable.length ? 'pass' : 'not-applicable';
}

function rollup(rows) {
 const groups = new Map();
 for (const row of rows) {
  const key = `${row.split}:${row.label}`;
  const group = groups.get(key) ?? {label:row.label,split:row.split,successes:0,opportunities:0,unknown:0,notApplicable:0};
  if (['pass','fail'].includes(row.outcome)) { group.opportunities++; if(row.outcome === 'pass') group.successes++; }
  else if (row.outcome === 'unknown') group.unknown++;
  else group.notApplicable++;
  groups.set(key,group);
 }
 return [...groups.values()].map(row => ({...row,rate:row.opportunities ? row.successes/row.opportunities : null,interval:wilson(row.successes,row.opportunities)}));
}

/** Builds numerical report data from reviewer observations; never generates judgments. */
export function buildReport(run, baseline = null) {
 validate(run);
 const metrics = run.cases.flatMap(scenario => scenario.checks.filter(check => check.status === 'observed').map(check => ({...check, caseId:scenario.id, attempt:scenario.attempt, caseStatus:scenario.status, family:scenario.family, split:scenario.split, successes:check.successes, opportunities:check.opportunities, rate:check.successes/check.opportunities, interval:wilson(check.successes,check.opportunities), correlated:check.kind==='rate'})));
 const primary = run.cases.filter(scenario => scenario.attempt === 1 && scenario.status === 'complete');
 const categories = rollup(primary.flatMap(scenario => [...new Set(scenario.checks.map(check => check.category))].map(category => ({label:category,split:scenario.split,outcome:outcome(scenario.checks.filter(check => check.category === category))}))));
 const subjects = rollup(primary.map(scenario => ({label:scenario.family,split:scenario.split,outcome:outcome(scenario.checks)})));
 const comparisons = [];
 if (baseline) {
  const prior = buildReport(baseline);
  for (const field of ['skillVersion','rubricVersion','evaluator']) if(run[field] !== baseline[field]) throw new Error(`Comparison ${field} must match.`);
  for(const scenario of primary) {
   const previous = baseline.cases.find(candidate => candidate.id === scenario.id && candidate.attempt === 1 && candidate.status === 'complete');
   if (!previous) continue;
   if (previous.scenarioVersion !== scenario.scenarioVersion || previous.split !== scenario.split || previous.family !== scenario.family) throw new Error('Comparison scenario versions, families and splits must match.');
   const signature = value => JSON.stringify(value.checks.map(check => [check.id,check.category,check.kind,check.required !== false]).sort((a,b)=>a[0].localeCompare(b[0])));
   if(signature(previous) !== signature(scenario)) throw new Error('Comparison check definitions must match.');
   for(const after of metrics.filter(metric => metric.caseId === scenario.id && metric.attempt === 1)) {
    const before = prior.metrics.find(metric => metric.caseId === scenario.id && metric.id === after.id && metric.attempt === 1);
    if(before) comparisons.push({label:`${scenario.id}: ${after.id}`,split:scenario.split,before,after,delta:after.rate-before.rate});
   }
  }
  if(!comparisons.length) throw new Error('No compatible observed checks to compare.');
 }
 return {...run, comparisons, metrics, categories, subjects, retries:run.cases.filter(scenario => scenario.attempt > 1).length, incomplete:run.cases.filter(scenario => scenario.status !== 'complete').length};
}
