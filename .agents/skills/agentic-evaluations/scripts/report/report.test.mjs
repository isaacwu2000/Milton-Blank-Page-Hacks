import { test, expect } from 'bun:test';
import { buildReport } from './report.mjs';

const report = (checks) => ({ schemaVersion: 1, runId: 'test', skillVersion: '1', rubricVersion: '1', appVersion: 'unknown', evaluator: 'fixture', findings: ['Fixture only.'], cases: [{ id: 'algebra-training', scenarioVersion: '1', family: 'algebra', split: 'training', attempt: 1, status: 'complete', expectedChecks:checks.map(value=>value.id), checks, sessions: [] }] });
const check = (successes, opportunities) => ({ id: 'sync', category: 'prep', kind: 'rate', status: 'observed', successes, opportunities, evidence: ['turn 2: proposal confirmed'], note: 'Eligible practice.', observations: Number.isSafeInteger(opportunities) && opportunities>0 && opportunities<1000 ? Array.from({length:opportunities},(_,index)=>({turn:String(index+1),expected:'Update',actual:index<successes?'Updated':'Not updated',success:index<successes,evidence:'fixture turn '+String(index+1)})) : [] });

test('report shows an x/y success rate and an 80% Wilson interval', () => {
 const result = buildReport(report([check(5,10)]));
 expect(result.metrics[0]).toMatchObject({successes:5, opportunities:10, rate:0.5});
 expect(result.metrics[0].interval[0]).toBeCloseTo(0.312,2);
 expect(result.metrics[0].interval[1]).toBeCloseTo(0.688,2);
 expect(result.metrics[0].correlated).toBe(true);
});

test('rejects impossible counts, fractional successes, and judgments without evidence', () => {
 for (const counts of [[4,3],[-1,3],[0.5,3],[1,0],[1,Infinity]]) expect(() => buildReport(report([check(...counts)]))).toThrow();
 expect(() => buildReport(report([{...check(1,1),evidence:[]}]))).toThrow();
});

test('category rollups preserve unknowns and exclude retries and opportunity ratios', () => {
 const unknown = {id:'route',category:'visual',kind:'binary',status:'unable-to-verify',note:'Tool route hidden.',evidence:['UI only shows graph title']};
 const run=report([{id:'render',category:'visual',kind:'binary',status:'observed',successes:1,opportunities:1,note:'Rendered.',evidence:['initial.png']},unknown,check(4,6)]);
 run.cases.push({...run.cases[0],attempt:2,expectedChecks:['sync'],checks:[{...check(6,6)}]});
 const result=buildReport(run);
 expect(result.categories.find(row=>row.label==='visual')).toMatchObject({successes:0,opportunities:0,unknown:1});
 expect(result.categories.find(row=>row.label==='prep')).toMatchObject({successes:0,opportunities:0});
 expect(result.retries).toBe(1);
 expect(result.metrics).toHaveLength(3);
});

test('comparisons require matching evaluator and scenario versions and preserve paired counts', () => {
 const before=report([check(2,6)]), after=report([check(4,6)]);
 expect(buildReport(after,before).comparisons[0]).toMatchObject({before:{successes:2,opportunities:6},after:{successes:4,opportunities:6}});
 expect(buildReport(after,before).comparisons[0].delta).toBeCloseTo(1/3,8);
 for(const field of ['skillVersion','rubricVersion','evaluator']) expect(()=>buildReport({...after,[field]:'changed'},before)).toThrow();
 expect(()=>buildReport({...after,cases:[{...after.cases[0],scenarioVersion:'2'}]},before)).toThrow();
});

test('zero/all success intervals remain bounded and excluded cases never count as passed', () => {
 const zero=buildReport(report([check(0,1)])).metrics[0];
 const all=buildReport(report([check(1,1)])).metrics[0];
 expect(zero.interval[0]).toBe(0);
 expect(zero.interval[1]).toBeCloseTo(0.622,2);
 expect(all.interval[0]).toBeCloseTo(0.378,2);
 expect(all.interval[1]).toBeCloseTo(1,12);
 const run=report([{...check(1,1),kind:'binary'}]); run.cases[0].status='incomplete';
 expect(buildReport(run).subjects).toHaveLength(0);
});

test('a missing declared rubric check cannot inflate a score', () => {
 const run=report([{...check(1,1),kind:'binary'}]);
 run.cases[0].expectedChecks=['sync','diagnosis'];
 expect(()=>buildReport(run)).toThrow('Missing declared');
});

test('a contradictory opportunity ledger is rejected rather than silently reported', () => {
 const observation={turn:'2',expected:'Update date',actual:'Date changed',success:true,evidence:'date.png'};
 const run=report([{...check(0,1),observations:[observation]}]);
 expect(()=>buildReport(run)).toThrow('ledger');
});

test('report requires the declared checklist and event ledgers for observed ratios', () => {
 const run=report([check(1,2)]);
 delete run.cases[0].expectedChecks;
 expect(()=>buildReport(run)).toThrow('expectedChecks');
 const noLedger=report([check(1,2)]);
 delete noLedger.cases[0].checks[0].observations;
 expect(()=>buildReport(noLedger)).toThrow('ledger');
});

test('version 2 requires exact run times and keeps deployment identity separate', () => {
 const run={...report([check(1,1)]),skillVersion:'2',startedAt:'2026-10-03T19:00:00.123Z',endedAt:'2026-10-03T19:01:00.456Z',timeZone:'America/New_York',localCommit:'fixture-sha',deployedCommit:'unknown'};
 expect(buildReport(run).deployedCommit).toBe('unknown');
 for(const bad of [{startedAt:'2026-10-03'},{endedAt:'2026-10-03T18:00:00.000Z'},{timeZone:'invalid'},{localCommit:''}]) expect(()=>buildReport({...run,...bad})).toThrow();
});

test('Plus Minus Interesting findings require ordered references and evidence records', () => {
 const run={...report([check(1,1)]),summary:{plus:[{id:'P1',text:'Correct graph.',records:['turn 1: graph displayed']}],minus:[],interesting:[]}};
 expect(buildReport(run).summary.plus[0].id).toBe('P1');
 expect(()=>buildReport({...run,summary:{...run.summary,plus:[{id:'M1',text:'Graph',records:['turn 1']}]}})).toThrow();
 expect(()=>buildReport({...run,summary:{...run.summary,plus:[{id:'P1',text:'Graph',records:[]}]}})).toThrow();
});


test('version 4 enforces direct evidence, three Plus findings, and alternating devices', () => {
 const item={id:'P1',text:'Graph displayed.',records:['turn 1'],screenshots:[{path:'graph.png',caption:'Actual graph.'}]};
 const run={...report([check(1,1)]),skillVersion:'4',startedAt:'2026-10-03T19:00:00.123Z',endedAt:'2026-10-03T19:01:00.456Z',timeZone:'America/New_York',localCommit:'fixture-sha',deployedCommit:'unknown',summary:{minus:[],plus:[item],interesting:[]},evaluatorNotes:{minus:[],plus:[],interesting:[],auxiliaryFailures:[]}};
 Object.assign(run.cases[0],{device:'mobile',viewport:{width:390,height:844}});
 expect(buildReport(run).cases[0].device).toBe('mobile');
 expect(()=>buildReport({...run,summary:{...run.summary,plus:[{...item,screenshots:[]}]}})).toThrow('screenshots');
 expect(()=>buildReport({...run,summary:{...run.summary,plus:[item,item,item,item]}})).toThrow('three Plus');
 expect(()=>buildReport({...run,evaluatorNotes:{...run.evaluatorNotes,plus:[item,item,item,item]}})).toThrow('three Plus');
 expect(()=>buildReport({...run,cases:[{...run.cases[0],device:'desktop'}]})).toThrow('alternate');
});


test('version 6 permits a continued desktop start and preserves device alternation', () => {
 const run={...report([check(1,1)]),skillVersion:'6',startingDevice:'desktop',startedAt:'2026-10-03T19:00:00.123Z',endedAt:'2026-10-03T19:01:00.456Z',timeZone:'America/New_York',localCommit:'fixture',deployedCommit:'unknown'};
 Object.assign(run.cases[0],{device:'desktop',viewport:{width:1440,height:900}});
 expect(buildReport(run).cases[0].device).toBe('desktop');
 expect(()=>buildReport({...run,startingDevice:undefined})).toThrow('startingDevice');
 expect(()=>buildReport({...run,cases:[{...run.cases[0],device:'mobile'}]})).toThrow('alternate');
});


test('version 6 rejects viewport evidence mislabeled as another device', () => {
 const run={...report([check(1,1)]),skillVersion:'6',startingDevice:'desktop',startedAt:'2026-10-03T19:00:00.123Z',endedAt:'2026-10-03T19:01:00.456Z',timeZone:'America/New_York',localCommit:'fixture',deployedCommit:'unknown'};
 Object.assign(run.cases[0],{device:'desktop',viewport:{width:1440,height:900}});
 expect(buildReport(run).cases[0].viewport.width).toBe(1440);
 expect(buildReport({...run,cases:[{...run.cases[0],status:'blocked',viewport:{width:433,height:1000}}]}).cases[0].status).toBe('blocked');
 for (const viewport of [{width:390,height:844},{width:0,height:900},{width:1440,height:-1}]) {
  expect(()=>buildReport({...run,cases:[{...run.cases[0],viewport}]})).toThrow('viewport');
 }
});
