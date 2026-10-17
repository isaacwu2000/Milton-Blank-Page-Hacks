import {useEffect,useRef,useState} from 'react';
import {Play,Pause,ChevronLeft,ChevronRight} from 'lucide-react';
import {EDGES,JOINTS,pretty,type Analysis,type Joint} from '../shared/domain';
import {IconButton} from './components/IconButton';
export function Player({analysis,url,time,onTime,joint,onJoint,ground,onCanvasClick,points=[],compact=false,videoRef:externalRef,onPlayingChange,linkedPlaying}:{analysis:Analysis;url?:string;time:number;onTime:(t:number)=>void;joint:Joint;onJoint:(j:Joint)=>void;ground:number;onCanvasClick?:(p:[number,number])=>void;points?:[number,number][];compact?:boolean;videoRef?:React.RefObject<HTMLVideoElement|null>;onPlayingChange?:(playing:boolean)=>void;linkedPlaying?:boolean}){
 const ownRef=useRef<HTMLVideoElement>(null),videoRef=externalRef??ownRef;
 const [playing,setPlaying]=useState(false),[playbackError,setPlaybackError]=useState('');
 const onTimeRef=useRef(onTime),playingChangeRef=useRef(onPlayingChange),lastReported=useRef<number|null>(null),timeRef=useRef(time);
 onTimeRef.current=onTime;playingChangeRef.current=onPlayingChange;timeRef.current=time;
 const frame=analysis.frames.reduce((best,f)=>Math.abs(f.time-time)<Math.abs(best.time-time)?f:best,analysis.frames[0]);
 const sample=analysis.source==='sample';
 const reportTime=(value:number)=>{lastReported.current=value;onTimeRef.current(value)};
 useEffect(()=>{playingChangeRef.current?.(playing)},[playing]);
 useEffect(()=>{
  if(!playing)return;
  let request=0,previous=performance.now();
  const tick=(now:number)=>{
   if(sample){const next=timeRef.current+(now-previous)/1000;previous=now;reportTime(next>=analysis.duration?0:next)}
   else {const video=videoRef.current;if(video&&!video.paused&&!video.seeking)reportTime(video.currentTime)}
   request=requestAnimationFrame(tick);
  };
  request=requestAnimationFrame(tick);return()=>cancelAnimationFrame(request);
 },[sample,playing,analysis.duration,videoRef]);
 useEffect(()=>{
  const video=videoRef.current;if(!video||video.readyState===0)return;
  // Ignore our own playback updates. A linked player corrects drift, rather than seeking every paint.
  if(lastReported.current!==null&&Math.abs(lastReported.current-time)<.002)return;
  const tolerance=!video.paused&&linkedPlaying!==undefined ? .16 : .005;
  if(Math.abs(video.currentTime-time)>tolerance)video.currentTime=time;
 },[time,videoRef,linkedPlaying]);
 useEffect(()=>{setPlaying(false);setPlaybackError('');lastReported.current=null},[analysis.id]);
 useEffect(()=>{setPlaybackError('')},[url]);
 useEffect(()=>{
  if(linkedPlaying===undefined)return;
  if(sample){setPlaying(linkedPlaying);return}
  const video=videoRef.current;if(!video)return;
  let active=true;
  if(linkedPlaying)video.play().catch(()=>{if(active)setPlaybackError('Playback could not start. Press Play, or export this clip as an H.264 MP4.')});
  else video.pause();
  return()=>{active=false};
 },[linkedPlaying,sample,url,videoRef]);
 async function toggle(){
  setPlaybackError('');
  if(sample){setPlaying(current=>!current);return}
  const video=videoRef.current;if(!video)return;
  if(!video.paused)video.pause();
  else {if(video.ended)video.currentTime=0;try{await video.play()}catch{setPlaybackError('Playback could not start. Try again, or export this clip as an H.264 MP4.')}}
 }
 const step=(delta:number)=>{setPlaying(false);videoRef.current?.pause();onTime(Math.max(0,Math.min(analysis.duration,time+delta)))};
 return <div className="player"><div className="video-stage" style={{aspectRatio:`${analysis.width}/${analysis.height}`,width:'100%',maxWidth:`calc(58vh * ${analysis.width/analysis.height})`,marginInline:'auto'}}>
 {sample?<svg viewBox="0 0 800 540" className="court" aria-hidden="true"><rect width="800" height="540" fill="#e9eeeb"/><path d="M0 0H800V385L660 300H140L0 385Z" fill="#f5f7f5"/><path d="M0 385L140 300H660L800 385M140 0V300M660 0V300M0 165H800M140 300L0 540M660 300L800 540M400 300V540M70 440H730" stroke="#c4d1ca" fill="none" strokeWidth="2"/><path d="M0 165H800" stroke="#8caaa0" strokeWidth="3"/><text x="24" y="35" fill="#52625d" fontSize="14" fontFamily="Lexend">Synthetic movement · sample only</text></svg>:<video ref={videoRef} src={url||undefined} muted={linkedPlaying!==undefined} playsInline preload="auto" onLoadedMetadata={e=>{e.currentTarget.currentTime=Math.min(timeRef.current,Number.isFinite(e.currentTarget.duration)?e.currentTarget.duration:analysis.duration)}} onTimeUpdate={e=>{if(e.currentTarget.paused)reportTime(e.currentTarget.currentTime)}} onSeeked={e=>reportTime(e.currentTarget.currentTime)} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={e=>{setPlaying(false);reportTime(e.currentTarget.currentTime)}} onError={()=>{setPlaying(false);setPlaybackError('This video could not be played. The file may have expired or use an unsupported codec. Reload it, or export an H.264 MP4.')}}/>}
 <svg viewBox={`0 0 ${analysis.width} ${analysis.height}`} className={`pose-overlay ${onCanvasClick?'calibrating':''}`} aria-label="Body tracking overlay" onClick={e=>{if(!onCanvasClick)return;const rect=e.currentTarget.getBoundingClientRect();onCanvasClick([(e.clientX-rect.left)/rect.width*analysis.width,(e.clientY-rect.top)/rect.height*analysis.height])}}>
 <line x1="0" y1={ground} x2={analysis.width} y2={ground} stroke="#648d7d" strokeDasharray="8 8" opacity=".75" strokeWidth={analysis.width/650}/><text x="12" y={ground-10} fill="#1f5141" fontSize={analysis.width/55}>y = 0</text>
 {EDGES.map(([a,b])=>{const p=frame?.joints[a],q=frame?.joints[b];return p&&q&&p.confidence>=.35&&q.confidence>=.35?<line key={a+b} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="#1a6751" strokeWidth={analysis.width/220} strokeLinecap="round"/>:null})}
 {JOINTS.map(j=>{const p=frame?.joints[j];return p&&p.confidence>=.35?<g key={j} role="button" tabIndex={onCanvasClick?-1:0} aria-label={`Select ${pretty(j)}`} aria-pressed={joint===j} onClick={e=>{if(!onCanvasClick){e.stopPropagation();onJoint(j)}}} onKeyDown={e=>{if(!onCanvasClick&&(e.key==='Enter'||e.key===' ')){e.preventDefault();onJoint(j)}}}><title>{pretty(j)}</title><circle cx={p.x} cy={p.y} r={analysis.width/35} fill="transparent"/><circle cx={p.x} cy={p.y} r={analysis.width/(joint===j?70:105)} fill={joint===j?'#14674f':'#ffffff'} stroke="#14674f" strokeWidth={analysis.width/450}/>{joint===j&&<text x={p.x+analysis.width/40} y={p.y-analysis.height/35} fontSize={analysis.width/48} fill="#153d31" paintOrder="stroke" stroke="#fff" strokeWidth={analysis.width/180}>{pretty(j)}</text>}</g>:null})}
 {points.map(([x,y],i)=><circle key={i} cx={x} cy={y} r={analysis.width/75} fill="#db8b38" stroke="white" strokeWidth="2"/>)}
 {points.length===2&&<line x1={points[0][0]} y1={points[0][1]} x2={points[1][0]} y2={points[1][1]} stroke="#db8b38" strokeWidth="3"/>}
 </svg></div>
 {playbackError&&<p className="error-note" role="alert">{playbackError}</p>}
 <p className="small muted">{frame?`Selected sample: ${frame.time.toFixed(3)}s`:'No tracked samples'} · tracking every {analysis.interval}s</p>
 {!compact&&<div className="player-controls"><IconButton label={playing?'Pause video':'Play video'} onClick={toggle}>{playing?<Pause size={17}/>:<Play size={17}/>}</IconButton><IconButton label="Previous sample" onClick={()=>step(-analysis.interval)}><ChevronLeft size={17}/></IconButton><input aria-label="Video timeline" type="range" min="0" max={analysis.duration} step="0.01" value={time} onChange={e=>onTime(Number(e.target.value))}/><IconButton label="Next sample" onClick={()=>step(analysis.interval)}><ChevronRight size={17}/></IconButton><span className="time">{time.toFixed(2)} / {analysis.duration.toFixed(2)}s</span></div>}
 </div>
}
export function Chart({times,values,time,onTime,label,unit}:{times:number[];values:(number|null)[];time:number;onTime:(t:number)=>void;label:string;unit:string}){
 const valid=values.filter((v):v is number=>v!==null&&Number.isFinite(v));const low=valid.length?Math.min(...valid):0,high=valid.length?Math.max(...valid):1,span=high-low||1;
 const paths:string[]=[];let path='';values.forEach((v,i)=>{if(v===null){if(path)paths.push(path);path='';return}path+=`${path?'L':'M'}${48+(times[i]/(times.at(-1)||1))*640},${155-(v-low)/span*115} `});if(path)paths.push(path);
 return <div className="chart"><div className="section-heading"><h3>{label}</h3><span className="muted small">{unit} · click graph to seek</span></div><svg role="img" aria-label={`${label} over time, in ${unit}`} viewBox="0 0 720 190" onClick={e=>{const r=e.currentTarget.getBoundingClientRect();onTime(Math.max(0,Math.min(times.at(-1)||1,((e.clientX-r.left)/r.width*720-48)/640*(times.at(-1)||1))))}}>
 {[0,.5,1].map(f=><g key={f}><line x1="48" x2="688" y1={155-f*115} y2={155-f*115} stroke="#e5eae8"/><text x="0" y={159-f*115} fontSize="11" fill="#69736f">{(low+span*f).toFixed(1)}</text></g>)}
 {paths.map((d,i)=><path key={i} d={d} stroke="#176c54" strokeWidth="2.5" fill="none"/>)}
 <line x1={48+time/(times.at(-1)||1)*640} x2={48+time/(times.at(-1)||1)*640} y1="24" y2="160" stroke="#6b8e80" strokeDasharray="4 4"/>
 <text x="48" y="184" fontSize="11" fill="#69736f">0s</text><text x="661" y="184" fontSize="11" fill="#69736f">{(times.at(-1)||0).toFixed(1)}s</text>
 {!valid.length&&<text x="360" y="95" textAnchor="middle" fontSize="13" fill="#69736f">Not enough confident samples</text>}</svg></div>
}
