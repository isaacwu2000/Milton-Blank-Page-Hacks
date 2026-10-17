const INK = '#17252b', TEAL = '#28685b', MUTED = '#566970';
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

/** Defines gallery views from complete first attempts, with splits and event units kept distinct. */
export function buildCharts(report) {
 const primary = report.metrics.filter(metric => metric.attempt === 1 && metric.caseStatus === 'complete');
 const charts = [];
 for(const split of ['training','held-out']) {
  charts.push({id:`categories-${split}`,title:`Behavior categories · ${split}`,subtitle:'One required-binary outcome per case/category. Dots: pass rate; lines: 80% Wilson interval.',type:'rate',rows:report.categories.filter(row=>row.split===split)});
  charts.push({id:`subjects-${split}`,title:`Subject families · ${split}`,subtitle:'One outcome per case across required binary checks; unknowns remain excluded.',type:'rate',rows:report.subjects.filter(row=>row.split===split)});
  const rows = primary.filter(metric=>metric.split===split);
  charts.push({id:`checks-${split}`,title:`Observed checks · ${split}`,subtitle:'Each case/check is shown separately. Event ratios are approximate for correlated turns.',type:'rate',rows:rows.map(row=>({...row,label:`${row.caseId} / ${row.id}`}))});
  charts.push({id:`opportunities-${split}`,title:`Opportunity success · ${split}`,subtitle:'Successful eligible events / observed opportunities. 80% Wilson intervals assume independent events; chat turns are correlated.',type:'rate',rows:rows.filter(row=>row.kind==='rate').map(row=>({...row,label:`${row.caseId} / ${row.id}`}))});
  const failures=new Map(), coverage=new Map();
  for(const scenario of report.cases.filter(scenario=>scenario.split===split && scenario.attempt===1 && scenario.status==='complete')) for(const check of scenario.checks) {
   if(check.status==='observed' && check.successes < check.opportunities) {
    const row=failures.get(check.id) ?? {label:check.id,value:0}; row.value++; failures.set(check.id,row);
   }
   if(check.status!=='observed') {
    const label=`${check.category}: ${check.status}`;
    const row=coverage.get(label) ?? {label,value:0}; row.value++; coverage.set(label,row);
   }
  }
  charts.push({id:`failures-${split}`,title:`Recurring check failures · ${split}`,subtitle:'Number of independent cases with at least one failed event/check; not number of messages.',type:'count',rows:[...failures.values()].sort((a,b)=>b.value-a.value)});
  charts.push({id:`coverage-${split}`,title:`Excluded evidence · ${split}`,subtitle:'Unverifiable and non-applicable check counts. These are excluded from observed rates.',type:'count',rows:[...coverage.values()]});
 }
 const statuses=new Map();
 for(const scenario of report.cases) {
  const label=`${scenario.split} / ${scenario.attempt>1?'retry':'first attempt'} / ${scenario.status}`;
  statuses.set(label,(statuses.get(label)??0)+1);
 }
 charts.push({id:'attempts',title:'Attempt coverage',subtitle:'Complete, blocked and incomplete attempts, with retries retained separately.',type:'count',rows:[...statuses].map(([label,value])=>({label,value}))});
 charts.push({id:'comparison',title:'Matched before/after rates',subtitle:'Same evaluator and scenario/check versions. Earlier and current endpoints; no claim of significance.',type:'paired',rows:report.comparisons});
 charts.push({id:'change',title:'Matched rate changes',subtitle:'Current minus earlier rate in percentage points. Paired changes are descriptive; Wilson intervals are not difference intervals.',type:'delta',rows:report.comparisons.map(row=>({label:row.label,value:row.delta*100}))});
 return charts.flatMap(chart => chart.rows.length>18 ? Array.from({length:Math.ceil(chart.rows.length/18)},(_,index)=>({...chart,id:`${chart.id}-${index+1}`,title:`${chart.title} (${index+1})`,rows:chart.rows.slice(index*18,(index+1)*18)})) : [chart]);
}

/** Renders escaped standalone SVG charts; score labels always retain denominators. */
export function chartSvg(chart) {
 const width=1100,height=Math.max(210,145+chart.rows.length*45),left=430,right=width-200,span=right-left;
 const svg=[`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(chart.title)}"><rect width="100%" height="100%" fill="#ffffff"/><g font-family="Arial,sans-serif" fill="${INK}"><text x="24" y="34" font-size="20" font-weight="bold">${escape(chart.title)}</text>`];
 const subtitles=chart.subtitle.match(/.{1,115}(?:\s|$)/g)??[chart.subtitle];
 subtitles.forEach((text,index)=>svg.push(`<text x="24" y="${60+index*17}" font-size="12" fill="${MUTED}">${escape(text.trim())}</text>`));
 if(!chart.rows.length) svg.push(`<text x="24" y="135" font-size="16" fill="${MUTED}">No eligible observations${chart.type==='paired'||chart.type==='delta'?' or no baseline supplied':''}.</text>`);
 else {
  const countMaximum=Math.max(1,...chart.rows.map(row=>row.value??0));
  const x=value=>left+value*span;
  const ticks=chart.type==='rate'||chart.type==='paired'?[0,.25,.5,.75,1]:chart.type==='delta'?[-100,-50,0,50,100]:[0,countMaximum/2,countMaximum];
  const tx=value=>chart.type==='delta'?x((value+100)/200):chart.type==='count'?x(value/countMaximum):x(value);
  ticks.forEach(value=>svg.push(`<line x1="${tx(value)}" y1="103" x2="${tx(value)}" y2="${height-20}" stroke="#e6edee"/><text x="${tx(value)}" y="100" text-anchor="middle" font-size="12" fill="${MUTED}">${chart.type==='rate'||chart.type==='paired'?`${value*100}%`:value}</text>`));
  chart.rows.forEach((row,index)=>{
   const y=130+index*45;
   const label=row.label.length>57?row.label.slice(0,54)+'...':row.label;
   svg.push(`<text x="24" y="${y+4}" font-size="14"><title>${escape(row.label)}</title>${escape(label)}</text>`);
   if(chart.type==='rate') {
    if(row.rate==null) svg.push(`<text x="${left}" y="${y+4}" font-size="13" fill="${MUTED}">No scored binary outcome</text>`);
    else svg.push(`<line x1="${x(row.interval[0])}" y1="${y}" x2="${x(row.interval[1])}" y2="${y}" stroke="${TEAL}" stroke-width="3"/><circle cx="${x(row.rate)}" cy="${y}" r="5" fill="${TEAL}"/>`);
    svg.push(`<text x="${right+15}" y="${y+4}" font-size="13">${row.rate==null?'n=0':`${row.successes}/${row.opportunities} (${Math.round(row.rate*100)}%)`}</text>`);
    if(row.unknown||row.notApplicable) svg.push(`<text x="${left}" y="${y+20}" font-size="11" fill="${MUTED}">${row.unknown??0} unknown; ${row.notApplicable??0} N/A</text>`);
   } else if(chart.type==='paired') {
    svg.push(`<line x1="${x(row.before.rate)}" y1="${y}" x2="${x(row.after.rate)}" y2="${y}" stroke="${MUTED}"/><circle cx="${x(row.before.rate)}" cy="${y}" r="5" fill="white" stroke="${MUTED}"/><circle cx="${x(row.after.rate)}" cy="${y}" r="5" fill="${TEAL}"/><text x="${right+15}" y="${y+4}" font-size="12">${row.before.successes}/${row.before.opportunities} → ${row.after.successes}/${row.after.opportunities}</text>`);
   } else {
    const zero=tx(0),end=tx(row.value);
    svg.push(`<rect x="${Math.min(zero,end)}" y="${y-8}" width="${Math.max(2,Math.abs(end-zero))}" height="16" fill="${row.value<0?'#9a4c38':TEAL}"/><text x="${right+15}" y="${y+4}" font-size="13">${chart.type==='delta'?row.value.toFixed(1)+' pp':row.value}</text>`);
   }
  });
 }
 return svg.join('')+'</g></svg>';
}

export const escapeHtml=escape;
