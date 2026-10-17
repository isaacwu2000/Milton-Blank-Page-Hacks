import { JOINTS, toolSchema, type Analysis, type Expr, type Frame, type ToolConfig } from './domain';
type Unit = 'point'|'length'|'speed'|'acceleration'|'angle'|'number'|'time';
type Value = number | [number,number] | null;
const fields:Record<string,Unit>={x:'length',y:'length',vx:'speed',vy:'speed',ax:'acceleration',ay:'acceleration'};
export const CAPABILITIES = `JSON math operations: point(joint), x/y/vx/vy/ax/ay(joint), speed(joint), acceleration(joint), time, constant(value), metric(metric=id), angle(point A, point vertex B, point C) in degrees, distance(point A, point B), add/subtract(same units), multiply/divide(one dimensionless operand; divide same units produces number), abs, sqrt(number), min/max/mean/range(frame metric reference) for summary metrics. Numeric literals are dimensionless. Unit types: length, speed, acceleration, angle, number, time. Frame references may reference earlier frame metrics. Summary operations may only aggregate a frame metric. Missing or low-confidence points yield null. No JavaScript/Python/eval. Do not call pixel displacement jump height in meters unless calibrated and the rubric states the plane and baseline assumptions.`;

/** Validates operation signatures, dependencies, dimensions, and expression bounds before evaluation. */
export function validateTool(raw:unknown):ToolConfig {
 const tool=toolSchema.parse(raw); let nodes=0; const known=new Map<string,{unit:Unit;scope:string}>();
 for(const metric of tool.metrics){
  if(known.has(metric.id))throw Error(`Duplicate metric: ${metric.id}`);
  function type(e:Expr,depth=0):Unit {
   if(++nodes>500||depth>16)throw Error('Calculation is too complex.');
   if(typeof e==='number')return 'number'; const a=e.args??[];
   const expect=(count:number)=>{if(a.length!==count)throw Error(`${e.op} needs ${count} arguments.`)};
   if(['point','x','y','vx','vy','ax','ay','speed','acceleration'].includes(e.op)){
    expect(0);if(!e.joint||!JOINTS.includes(e.joint))throw Error(`${e.op} needs a supported joint.`);
    return e.op==='point'?'point':e.op==='speed'?'speed':e.op==='acceleration'?'acceleration':fields[e.op];
   }
   if(e.op==='constant'){expect(0);if(e.value===undefined)throw Error('Constant needs a value.');return 'number'}
   if(e.op==='time'){expect(0);return 'time'}
   if(e.op==='metric'){expect(0);const ref=known.get(e.metric??'');if(!ref||ref.scope!=='frame')throw Error('Metric references must name an earlier frame metric.');return ref.unit}
   if(['max','min','mean','range'].includes(e.op)){
    expect(1);if(metric.scope!=='summary'||typeof a[0]==='number'||a[0].op!=='metric')throw Error('Summary needs a frame metric reference.');return type(a[0],depth+1);
   }
   const units=a.map(v=>type(v,depth+1));
   if(e.op==='angle'||e.op==='distance'){expect(e.op==='angle'?3:2);if(units.some(u=>u!=='point'))throw Error(`${e.op} needs points.`);return e.op==='angle'?'angle':'length'}
   if(e.op==='abs'||e.op==='sqrt'){expect(1);if(units[0]==='point'||(e.op==='sqrt'&&units[0]!=='number'))throw Error('Unsupported unary units.');return units[0]}
   expect(2);if(units.includes('point'))throw Error('Use distance or angle for points.');
   if(['add','subtract'].includes(e.op)&&units[0]===units[1])return units[0];
   if(e.op==='multiply'&&units.includes('number'))return units[0]==='number'?units[1]:units[0];
   if(e.op==='divide'&&units[1]==='number')return units[0];
   if(e.op==='divide'&&units[0]===units[1])return 'number';
   throw Error(`Unsupported operation or incompatible units: ${e.op}`);
  }
  if(metric.scope==='summary'&&!(typeof metric.formula==='object'&&['min','max','mean','range'].includes(metric.formula.op)))throw Error('Summary must aggregate a frame metric.');
  if(type(metric.formula)!==metric.unit)throw Error(`Unit mismatch for ${metric.name}.`);
  known.set(metric.id,{unit:metric.unit,scope:metric.scope});
 }
 return tool;
}

/** Calculates JSON metrics using only measured tracks; missing evidence stays missing. */
export function calculate(tool:ToolConfig,analysis:Analysis,scale=1,ground=analysis.ground){
 const frameValues:Record<string,(number|null)[]>={}; const summaries:Record<string,number|null>={};
 function evalExpr(e:Expr,frame:Frame,index:number):Value {
  if(typeof e==='number')return e;const args=e.args??[];
  const p=e.joint?frame.joints[e.joint]:undefined;
  if(['point','x','y','vx','vy','ax','ay','speed','acceleration'].includes(e.op)){
   if(!p||p.confidence<0.35)return null;
   if(e.op==='point')return [p.x*scale,(ground-p.y)*scale];
   if(e.op==='speed')return p.vx===null||p.vy===null?null:Math.hypot(p.vx,p.vy)*scale;
   if(e.op==='acceleration')return p.ax===null||p.ay===null?null:Math.hypot(p.ax,p.ay)*scale;
   if(e.op==='x')return p.x*scale;if(e.op==='y')return (ground-p.y)*scale;
   const value=p[e.op as 'vx'|'vy'|'ax'|'ay'];return value===null?null:value*scale*(e.op==='vy'||e.op==='ay'?-1:1);
  }
  if(e.op==='constant')return e.value??null;if(e.op==='time')return frame.time;
  if(e.op==='metric')return frameValues[e.metric??'']?.[index]??null;
  if(['max','min','mean','range'].includes(e.op)){
   const ref=args[0];const all=typeof ref==='object'?frameValues[ref.metric??'']??[]:[];
   const valid=all.filter((v):v is number=>v!==null);if(!valid.length)return null;
   return e.op==='max'?Math.max(...valid):e.op==='min'?Math.min(...valid):e.op==='range'?Math.max(...valid)-Math.min(...valid):valid.reduce((a,b)=>a+b,0)/valid.length;
  }
  const a=args.map(v=>evalExpr(v,frame,index));if(a.some(v=>v===null))return null;
  if(e.op==='distance'){const [p,q]=a as [number[],number[]];return Math.hypot(p[0]-q[0],p[1]-q[1])}
  if(e.op==='angle'){
   const [p,q,r]=a as [number[],number[],number[]];const u=[p[0]-q[0],p[1]-q[1]],v=[r[0]-q[0],r[1]-q[1]];
   const d=Math.hypot(...u)*Math.hypot(...v);return d<1e-9?null:Math.acos(Math.max(-1,Math.min(1,(u[0]*v[0]+u[1]*v[1])/d)))*180/Math.PI;
  }
  const [x,y]=a as number[];const result=({add:()=>x+y,subtract:()=>x-y,multiply:()=>x*y,divide:()=>y===0?NaN:x/y,abs:()=>Math.abs(x),sqrt:()=>Math.sqrt(x)} as Record<string,()=>number>)[e.op]?.();
  return result!==undefined&&Number.isFinite(result)?result:null;
 }
 validateTool(tool);
 for(const m of tool.metrics){if(m.scope==='frame')frameValues[m.id]=analysis.frames.map((f,i)=>{const v=evalExpr(m.formula,f,i);return typeof v==='number'&&Number.isFinite(v)?v:null});else {const v=analysis.frames.length?evalExpr(m.formula,analysis.frames[0],0):null;summaries[m.id]=typeof v==='number'?v:null}}
 return {frames:frameValues,summaries};
}
export function unitLabel(unit:string,calibrated:boolean){return ({length:calibrated?'m':'px',speed:calibrated?'m/s':'px/s',acceleration:calibrated?'m/s²':'px/s²',angle:'°',time:'s',number:''} as Record<string,string>)[unit]??''}
