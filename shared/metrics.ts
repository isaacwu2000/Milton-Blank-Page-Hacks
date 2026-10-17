import { JOINTS, toolSchema, type Analysis, type Expr, type Frame, type ToolConfig } from './domain';
type Unit = 'point'|'length'|'speed'|'acceleration'|'angle'|'number'|'time';
type Value = number | [number,number] | null;
const fields:Record<string,Unit>={x:'length',y:'length',vx:'speed',vy:'speed',ax:'acceleration',ay:'acceleration'};
const jointOps=['point','x','y','vx','vy','ax','ay','speed','acceleration'];
const reducers=['max','min','mean','range','initial','final'];
export const CAPABILITIES = `JSON math operations (no executable code): point(joint), x/y/vx/vy/ax/ay(joint), speed(joint), acceleration(joint), time, constant(value), metric(metric=id). point values support midpoint(point A, point B), x(point), y(point), angle(point A, point vertex B, point C) in degrees, distance(point A, point B). Scalar arithmetic: add/subtract(same units), multiply(one dimensionless operand, or speed*time=length, acceleration*time=speed), divide(by number, same units=number, length/time=speed, speed/time=acceleration), abs, sqrt(number). Numbers/constants are dimensionless. Summary reducers max/min/mean/range/initial/final take exactly one {op:'metric',metric:'earlier_frame_id'}; reducers ignore missing samples except initial/final which use the exact first/last sample. Summaries may combine reducers and earlier summary metrics using arithmetic. Frame metrics may reference earlier frame metrics. No forward references or cycles. Unit types: length, speed, acceleration, angle, number, time. Coordinates: x starts at left edge, y increases upward from initial foot baseline; distances are pixels unless calibrated (then meters), time is seconds. Target length/speed/acceleration thresholds are SI units and must not be evaluated before calibration. Missing, non-finite, or confidence below 0.35 yields null. Angle of overlapping points yields null. Single-camera measurements are 2D projections; do not assert true jump height without calibration and baseline/plane assumptions.`;

/** Reject invalid dimensions, mixed scopes and executable content before saving. */
export function validateTool(raw:unknown):ToolConfig {
 const tool=toolSchema.parse(raw); let nodes=0; const known=new Map<string,{unit:Unit;scope:string}>();
 for(const metric of tool.metrics){
  if(known.has(metric.id))throw Error(`Duplicate metric: ${metric.id}`);
  function type(e:Expr,depth=0,insideReducer=false):Unit {
   if(++nodes>500||depth>16)throw Error('Calculation is too complex.');
   if(typeof e==='number')return 'number'; const args=e.args??[];
   const expect=(count:number)=>{if(args.length!==count)throw Error(`${e.op} needs ${count} arguments.`)};
   const allowed=['op','args',...(jointOps.includes(e.op)?['joint']:[]),...(e.op==='constant'?['value']:[]),...(e.op==='metric'?['metric']:[])];
   if(Object.keys(e).some(key=>!allowed.includes(key)))throw Error(`Unexpected property for ${e.op}.`);
   if(reducers.includes(e.op)){
    expect(1);const ref=args[0];
    if(metric.scope!=='summary'||insideReducer||typeof ref==='number'||ref.op!=='metric')throw Error('Summary reducer needs one earlier frame metric reference.');
    return type(ref,depth+1,true);
   }
   if(e.op==='metric'){
    expect(0);const ref=known.get(e.metric??'');
    const scope=insideReducer?'frame':metric.scope;
    if(!ref||ref.scope!==scope)throw Error(`Metric reference must name an earlier ${scope} metric${metric.scope==='summary'&&!insideReducer?' (use a reducer for frame metrics)':''}.`);
    return ref.unit;
   }
   if(e.op==='constant'){expect(0);if(e.value===undefined)throw Error('Constant needs a value.');return 'number'}
   if(metric.scope==='summary'&&(jointOps.includes(e.op)||e.op==='time'))throw Error('Summary measurements must use a frame metric reducer.');
   if(jointOps.includes(e.op)){
    if((e.op==='x'||e.op==='y')&&args.length===1){if(e.joint||type(args[0],depth+1)!=='point')throw Error('Coordinate needs one point or a joint.');return 'length'}
    expect(0);if(!e.joint||!JOINTS.includes(e.joint))throw Error(`${e.op} needs a supported joint.`);
    return e.op==='point'?'point':e.op==='speed'?'speed':e.op==='acceleration'?'acceleration':fields[e.op];
   }
   if(e.op==='time'){expect(0);return 'time'}
   const units=args.map(value=>type(value,depth+1));
   if(['angle','distance','midpoint'].includes(e.op)){expect(e.op==='angle'?3:2);if(units.some(unit=>unit!=='point'))throw Error(`${e.op} needs points.`);return e.op==='angle'?'angle':e.op==='midpoint'?'point':'length'}
   if(e.op==='abs'||e.op==='sqrt'){expect(1);if(units[0]==='point'||(e.op==='sqrt'&&units[0]!=='number'))throw Error('Unsupported unary units.');return units[0]}
   expect(2);if(units.includes('point'))throw Error('Use distance, midpoint or angle for points.');
   const [left,right]=units;
   if(['add','subtract'].includes(e.op)&&left===right)return left;
   if(e.op==='multiply'){
    if(left==='number'||right==='number')return left==='number'?right:left;
    if((left==='time'&&right==='speed')||(right==='time'&&left==='speed'))return 'length';
    if((left==='time'&&right==='acceleration')||(right==='time'&&left==='acceleration'))return 'speed';
   }
   if(e.op==='divide'){
    if(right==='number')return left;if(left===right)return 'number';
    if(right==='time'&&left==='length')return 'speed';if(right==='time'&&left==='speed')return 'acceleration';
   }
   throw Error(`Unsupported operation or incompatible units: ${e.op}`);
  }
  if(type(metric.formula)!==metric.unit)throw Error(`Unit mismatch for ${metric.name}.`);
  if(metric.target&&metric.target.min!==undefined&&metric.target.max!==undefined&&metric.target.min>metric.target.max)throw Error(`Target minimum exceeds maximum for ${metric.name}.`);
  known.set(metric.id,{unit:metric.unit,scope:metric.scope});
 }
 return tool;
}

/** Calculates only from available measurements. Missing evidence remains null. */
export function calculate(tool:ToolConfig,analysis:Analysis,scale=1,ground=analysis.ground){
 validateTool(tool);
 if(!Number.isFinite(scale)||scale<=0||!Number.isFinite(ground))throw Error('Calibration must have a finite ground and positive scale.');
 const frameValues:Record<string,(number|null)[]>={};const summaries:Record<string,number|null>={};
 const finite=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value);
 function evalExpr(e:Expr,frame:Frame,index:number,summary=false):Value {
  if(typeof e==='number')return e;const args=e.args??[];
  if((e.op==='x'||e.op==='y')&&args.length){const point=evalExpr(args[0],frame,index);return Array.isArray(point)?point[e.op==='x'?0:1]:null}
  if(jointOps.includes(e.op)){
   const point=e.joint?frame.joints[e.joint]:undefined;
   if(!point||!finite(point.confidence)||point.confidence<0.35||!finite(point.x)||!finite(point.y))return null;
   if(e.op==='point')return [point.x*scale,(ground-point.y)*scale];
   if(e.op==='speed')return finite(point.vx)&&finite(point.vy)?Math.hypot(point.vx,point.vy)*scale:null;
   if(e.op==='acceleration')return finite(point.ax)&&finite(point.ay)?Math.hypot(point.ax,point.ay)*scale:null;
   if(e.op==='x')return point.x*scale;if(e.op==='y')return (ground-point.y)*scale;
   const value=point[e.op as 'vx'|'vy'|'ax'|'ay'];return finite(value)?value*scale*(e.op==='vy'||e.op==='ay'?-1:1):null;
  }
  if(e.op==='constant')return e.value??null;if(e.op==='time')return finite(frame.time)?frame.time:null;
  if(e.op==='metric')return summary?summaries[e.metric??'']??null:frameValues[e.metric??'']?.[index]??null;
  if(reducers.includes(e.op)){
   const ref=args[0];const all=typeof ref==='object'?frameValues[ref.metric??'']??[]:[];
   if(e.op==='initial')return all[0]??null;if(e.op==='final')return all.at(-1)??null;
   const valid=all.filter(finite);if(!valid.length)return null;
   const min=Math.min(...valid),max=Math.max(...valid);
   return e.op==='max'?max:e.op==='min'?min:e.op==='range'?max-min:valid.reduce((sum,value)=>sum+value/valid.length,0);
  }
  const values=args.map(value=>evalExpr(value,frame,index,summary));if(values.some(value=>value===null))return null;
  if(e.op==='midpoint'){const [p,q]=values as number[][];return [p[0]/2+q[0]/2,p[1]/2+q[1]/2]}
  if(e.op==='distance'){const [p,q]=values as number[][];return Math.hypot(p[0]-q[0],p[1]-q[1])}
  if(e.op==='angle'){
   const [p,q,r]=values as number[][];const ux=p[0]-q[0],uy=p[1]-q[1],vx=r[0]-q[0],vy=r[1]-q[1];
   const uLength=Math.hypot(ux,uy),vLength=Math.hypot(vx,vy);if(uLength===0||vLength===0)return null;
   return Math.acos(Math.max(-1,Math.min(1,(ux/uLength)*(vx/vLength)+(uy/uLength)*(vy/vLength))))*180/Math.PI;
  }
  const [x,y]=values as number[];
  const arithmetic:Record<string,()=>number>={add:()=>x+y,subtract:()=>x-y,multiply:()=>x*y,divide:()=>y===0?NaN:x/y,abs:()=>Math.abs(x),sqrt:()=>Math.sqrt(x)};
  const result=arithmetic[e.op]?.();return finite(result)?result:null;
 }
 for(const metric of tool.metrics){
  if(metric.scope==='frame')frameValues[metric.id]=analysis.frames.map((frame,index)=>{const value=evalExpr(metric.formula,frame,index);return finite(value)?value:null});
  else {const value=analysis.frames.length?evalExpr(metric.formula,analysis.frames[0],0,true):null;summaries[metric.id]=finite(value)?value:null}
 }
 return {frames:frameValues,summaries};
}
/** Physical targets use SI; evaluating them against raw pixels would mislead. */
export function metricTarget(metric:ToolConfig['metrics'][number],calibrated:boolean){
 return !calibrated&&['length','speed','acceleration'].includes(metric.unit)?undefined:metric.target;
}
export function unitLabel(unit:string,calibrated:boolean){return ({length:calibrated?'m':'px',speed:calibrated?'m/s':'px/s',acceleration:calibrated?'m/s²':'px/s²',angle:'°',time:'s',number:''} as Record<string,string>)[unit]??''}
