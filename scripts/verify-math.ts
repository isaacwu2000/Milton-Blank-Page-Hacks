import assert from 'node:assert/strict';
import { sampleTool, type Analysis, type Expr, type ToolConfig } from '../shared/domain';
import { calculate, metricTarget, validateTool } from '../shared/metrics';
import { makeSample } from '../shared/sample';
const p=(x:number,y:number,confidence=1)=>({x,y,confidence,vx:3,vy:4,ax:0,ay:2});
const analysis:Analysis={id:'known',width:100,height:100,ground:20,duration:.2,interval:.1,source:'video',model:'verification fixture',frames:[
 {time:0,joints:{right_shoulder:p(0,10),right_elbow:p(10,10),right_wrist:p(20,10),left_hip:p(5,12),right_hip:p(15,12)}},
 {time:.1,joints:{right_shoulder:p(0,10),right_elbow:p(10,10),right_wrist:p(10,0),left_hip:p(5,7),right_hip:p(15,7)}},
 {time:.2,joints:{right_shoulder:p(10,10),right_elbow:p(10,10),right_wrist:p(10,0),left_hip:p(5,4),right_hip:p(15,4)}}]};
const metric=(id:string,formula:Expr,unit:ToolConfig['metrics'][number]['unit']='number',scope:'frame'|'summary'='frame')=>({id,name:id,description:id,formula,unit,scope});
const tool=(metrics:ToolConfig['metrics'])=>({...sampleTool,metrics});
const joint=(joint:'right_shoulder'|'right_elbow'|'right_wrist'|'left_hip'|'right_hip'):Expr=>({op:'point',joint});
const ref=(metric:string):Expr=>({op:'metric',metric});
const near=(actual:number|null|undefined,expected:number)=>assert.ok(typeof actual==='number'&&Math.abs(actual-expected)<1e-8,`${actual} should equal ${expected}`);
validateTool(sampleTool);
const sample=calculate(sampleTool,makeSample());assert.equal(sample.frames.elbow_angle.length,51);
const known=calculate(sampleTool,analysis);near(known.frames.elbow_angle[0],180);near(known.frames.elbow_angle[1],90);assert.equal(known.frames.elbow_angle[2],null);near(known.summaries.peak_wrist_speed,5);
const custom=tool([
 metric('distance',{op:'distance',args:[joint('right_shoulder'),joint('right_wrist')]},'length'),
 metric('height',{op:'y',args:[{op:'midpoint',args:[joint('left_hip'),joint('right_hip')]}]},'length'),
 metric('vy',{op:'vy',joint:'right_wrist'},'speed'),
 metric('ay',{op:'ay',joint:'right_wrist'},'acceleration'),
 metric('jump',{op:'subtract',args:[{op:'max',args:[ref('height')]},{op:'initial',args:[ref('height')]}]},'length','summary'),
 metric('average',{op:'mean',args:[ref('height')]},'length','summary'),
 metric('jump_ratio',{op:'divide',args:[ref('jump'),ref('average')]},'number','summary'),
 metric('zero_division',{op:'divide',args:[1,0]}),
 metric('negative_root',{op:'sqrt',args:[-1]}),
 metric('custom',{op:'multiply',args:[{op:'speed',joint:'right_wrist'},{op:'time'}]},'length'),
]);
const result=calculate(custom,analysis,.01);near(result.frames.distance[0],.2);near(result.frames.height[0],.08);near(result.frames.height[1],.13);near(result.frames.vy[0],-.04);near(result.frames.ay[0],-.02);near(result.summaries.jump,.08);near(result.summaries.average,.37/3);near(result.frames.custom[1],.005);assert.equal(result.frames.zero_division[0],null);assert.equal(result.frames.negative_root[0],null);
for(const formula of [{op:'add',args:[{op:'x',joint:'right_wrist'},1]},{op:'eval',args:[1,2]},{op:'speed',joint:'right_wrist',value:5},{op:'metric',metric:'later'},{op:'constant',args:[1]}, {op:'distance',args:[1,2]}])assert.throws(()=>validateTool(tool([metric('invalid',formula as Expr)])));
assert.throws(()=>validateTool(tool([metric('time_summary',{op:'time'},'time','summary')])));
assert.throws(()=>validateTool(tool([metric('height',{op:'y',joint:'right_wrist'},'length'),metric('illegal_summary',ref('height'),'length','summary')])));
assert.throws(()=>validateTool(tool([metric('cycle',ref('cycle'))])));
assert.throws(()=>calculate(custom,analysis,0));
const unavailable=structuredClone(analysis);unavailable.frames[0].joints.right_wrist!.confidence=.1;unavailable.frames[1].joints.right_wrist!.vx=NaN;const missing=calculate(sampleTool,unavailable);assert.equal(missing.frames.elbow_angle[0],null);assert.equal(missing.frames.wrist_speed[1],null);
const noFrames=calculate(custom,{...analysis,frames:[]});assert.equal(noFrames.summaries.jump,null);
const threshold={...custom.metrics[0],target:{min:1,max:2,message:'target'}};assert.equal(metricTarget(threshold,false),undefined);assert.equal(metricTarget(threshold,true)?.min,1);
console.log('Math verification passed: known angles, calibration, geometry, custom formulas, aggregates, missing tracks, invalid units and unsafe expressions.');
