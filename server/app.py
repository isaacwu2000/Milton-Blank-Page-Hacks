import asyncio
import json
import logging
import math
import tempfile
from pathlib import Path
from datetime import datetime,timezone
from uuid import uuid4,UUID
from contextlib import asynccontextmanager
from fastapi import FastAPI,UploadFile,File,Form,HTTPException,Request
from fastapi.responses import JSONResponse,RedirectResponse
from pydantic import BaseModel,Field
from server import store,vision

log=logging.getLogger('sportsbuilder')
tracking_lock=asyncio.Lock()
session_lock=asyncio.Lock()
active=set()
cache={}

def now(): return datetime.now(timezone.utc).isoformat()
def record(kind,key):
    try: UUID(key)
    except ValueError: raise HTTPException(404,'Record not found.')
    value=store.get(kind,key)
    if not value: raise HTTPException(404,'Record not found.')
    return value

def load_analysis(session):
    if session['id'] not in cache:
        cache[session['id']]=json.loads(store.read(session['analysisKey']))
        if len(cache)>8: cache.pop(next(iter(cache)))
    return cache[session['id']]

@asynccontextmanager
async def lifespan(app):
    # A single worker owns jobs; an interrupted process cannot leave a fake running state.
    try:
        for session in await asyncio.to_thread(store.records,'sessions'):
            if session['status'] in ('queued','processing'):
                session.update(status='failed',error='Analysis was interrupted. Retry this video.')
                await asyncio.to_thread(store.save,'sessions',session)
    except Exception:
        log.exception('Database unavailable at startup')
    yield

app=FastAPI(title='SportsBuilder',lifespan=lifespan)

@app.exception_handler(Exception)
async def failure(request:Request,exc:Exception):
    log.error('Request failed: %s',type(exc).__name__)
    return JSONResponse(status_code=503,content={'detail':'The service could not complete this request. Check local service configuration and retry.'})

@app.get('/api/health')
async def health():
    return {'ok':True,'database':bool(store.os.getenv('DATABASE_URL')),'storage':bool(store.os.getenv('AWS_ENDPOINT_URL_S3'))}

@app.get('/api/home')
async def home():
    values=await asyncio.gather(*[asyncio.to_thread(store.records,k) for k in ['profiles','tools','sessions']])
    return dict(zip(['profiles','tools','sessions'],values))

class ProfileInput(BaseModel):
    name:str=Field(min_length=1,max_length=80)
    heightCm:float|None=Field(default=None,ge=30,le=300)
    weightKg:float|None=Field(default=None,ge=1,le=600)
    dominantSide:str='Right'
    experience:str=Field(default='',max_length=100)
    notes:str=Field(default='',max_length=1000)

@app.post('/api/profiles')
async def profile(data:ProfileInput):
    value={**data.model_dump(),'id':str(uuid4())}
    return await asyncio.to_thread(store.save,'profiles',value)

@app.post('/api/tools')
async def save_tool(request:Request):
    # Only the loopback agent service can publish a reviewed configuration.
    import hmac,os
    if not hmac.compare_digest(request.headers.get('x-agent-secret',''),os.environ.get('AGENT_INTERNAL_SECRET','disabled')):
        raise HTTPException(403,'Tools must be created by the builder.')
    value=await request.json()
    value.update(id=str(uuid4()),createdAt=now())
    return await asyncio.to_thread(store.save,'tools',value)

@app.post('/api/upload')
async def upload(file:UploadFile=File(...),profileId:str=Form(''),toolId:str=Form(''),interval:float=Form(.1),reference:bool=Form(False)):
    if not math.isfinite(interval) or not .033<=interval<=1: raise HTTPException(422,'Use a sampling interval between 0.033 and 1 second.')
    if not reference:
        await asyncio.to_thread(record,'profiles',profileId)
        await asyncio.to_thread(record,'tools',toolId)
    if file.content_type not in ('video/mp4','video/quicktime','video/webm','video/x-m4v','video/avi','video/x-msvideo'):
        raise HTTPException(415,'Upload an MP4, MOV, or WebM video.')
    suffix=Path(file.filename or 'video.mp4').suffix.lower()
    if suffix not in ('.mp4','.mov','.webm','.m4v','.avi'):suffix='.mp4'
    path=None
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix,delete=False) as handle:
            path=Path(handle.name);total=0
            while chunk:=await file.read(1024*1024):
                total+=len(chunk)
                if total>100*1024*1024: raise HTTPException(413,'Use a video smaller than 100 MiB.')
                handle.write(chunk)
        try: info=await asyncio.to_thread(vision.inspect_video,path)
        except ValueError as e: raise HTTPException(422,str(e))
        session_id=str(uuid4()); key=f'videos/{session_id}{suffix}'
        await asyncio.to_thread(lambda:store.put(key,path.read_bytes(),file.content_type))
        value={'id':session_id,'name':(file.filename or 'Video')[:160],'profileId':profileId,'toolId':toolId,'createdAt':now(),'status':'uploaded','progress':0,'duration':info[4],'interval':interval,'sourceKey':key,'reference':reference,'completedDrills':[]}
        try: await asyncio.to_thread(store.save,'sessions',value)
        except Exception:
            await asyncio.to_thread(store.remove,key)
            raise
        return value
    finally:
        if path:path.unlink(missing_ok=True)
        await file.close()

async def work(session_id):
    session=None;path=None
    try:
        async with tracking_lock:
            session=await asyncio.to_thread(record,'sessions',session_id)
            if session_id not in active:return
            session.update(status='processing',progress=.01)
            await asyncio.to_thread(store.save,'sessions',session)
            suffix=Path(session['sourceKey']).suffix
            with tempfile.NamedTemporaryFile(suffix=suffix,delete=False) as h:
                path=Path(h.name);h.write(await asyncio.to_thread(store.read,session['sourceKey']))
            last=[0]
            def progress(value,message):
                if session_id not in active:return False
                if value-last[0]>.05:
                    last[0]=value;session.update(progress=value,stage=message);store.save('sessions',session)
                return True
            analysis=await asyncio.to_thread(vision.analyze,path,session_id,session['interval'],progress)
            if session_id not in active:return
            key=f'analyses/{session_id}.json'
            await asyncio.to_thread(store.put,key,json.dumps(analysis,allow_nan=False).encode(),'application/json')
            session.update(status='complete',progress=1,analysisKey=key,stage='Ready')
            await asyncio.to_thread(store.save,'sessions',session)
            cache[session_id]=analysis
            if len(cache)>8:cache.pop(next(iter(cache)))
    except Exception as e:
        log.exception('Tracking failed')
        if session and session_id in active:
            session.update(status='failed',error=str(e) if isinstance(e,ValueError) else 'Body tracking could not finish. Check model access and retry.')
            await asyncio.to_thread(store.save,'sessions',session)
    finally:
        active.discard(session_id)
        if path:path.unlink(missing_ok=True)

@app.post('/api/sessions/{session_id}/analyze')
async def start(session_id:str):
    async with session_lock:
        session=await asyncio.to_thread(record,'sessions',session_id)
        if session_id in active:return session
        if len(active)>=3:raise HTTPException(429,'Three clips are already queued. Wait for one to finish.')
        session.update(status='queued',progress=0,error=None)
        active.add(session_id)
        try:
            await asyncio.to_thread(store.save,'sessions',session)
        except Exception:
            active.discard(session_id)
            raise
        task=asyncio.create_task(work(session_id));task.add_done_callback(lambda t:t.exception() if not t.cancelled() else None)
        return session

@app.get('/api/sessions/{session_id}')
async def session_get(session_id:str):return await asyncio.to_thread(record,'sessions',session_id)

@app.get('/api/sessions/{session_id}/video')
async def video(session_id:str):
    session=await asyncio.to_thread(record,'sessions',session_id)
    return {'url':await asyncio.to_thread(store.url,session['sourceKey'])}

@app.get('/api/sessions/{session_id}/analysis')
async def analysis_get(session_id:str,images:bool=False):
    session=await asyncio.to_thread(record,'sessions',session_id)
    if session['status']!='complete':raise HTTPException(409,'Analysis is not ready yet.')
    data=await asyncio.to_thread(load_analysis,session)
    if images:return data
    return {**data,'frames':[{k:v for k,v in f.items() if k!='image'} for f in data['frames']]}

class SessionUpdate(BaseModel):
    ground:float|None=Field(default=None,ge=0,le=4096,allow_inf_nan=False)
    calibration:dict|None=None
    alignment:dict|None=None
    completedDrills:list[str]|None=Field(default=None,max_length=100)

@app.patch('/api/sessions/{session_id}')
async def update_session(session_id:str,update:SessionUpdate):
    value=await asyncio.to_thread(record,'sessions',session_id)
    changes=update.model_dump(exclude_unset=True)
    if changes.get('ground') is not None and value.get('analysisKey'):
        data=await asyncio.to_thread(load_analysis,value)
        if changes['ground']>data['height']:raise HTTPException(422,'Ground must be inside the video frame.')
    for key in ('calibration','alignment'):
        if changes.get(key) is not None:
            allowed={'metersPerPixel','ground'} if key=='calibration' else {'current','reference'}
            if set(changes[key])!=allowed or any(isinstance(v,bool) or not isinstance(v,(float,int)) or not math.isfinite(v) for v in changes[key].values()):raise HTTPException(422,'Invalid calibration or alignment.')
            if key=='calibration' and changes[key]['metersPerPixel']<=0:raise HTTPException(422,'Calibration must have a positive scale.')
            if key=='calibration':
                height=(await asyncio.to_thread(load_analysis,value))['height'] if value.get('analysisKey') else 4096
                if not 0<=changes[key]['ground']<=height:raise HTTPException(422,'Ground must be inside the video frame.')
            if key=='alignment':
                if not 0<=changes[key]['current']<=value['duration'] or changes[key]['reference']<0:raise HTTPException(422,'Choose alignment times inside the clips.')
                tool=await asyncio.to_thread(record,'tools',value['toolId'])
                if tool.get('referenceId'):
                    reference=await asyncio.to_thread(record,'sessions',tool['referenceId'])
                    if changes[key]['reference']>reference['duration']:raise HTTPException(422,'Choose alignment times inside the clips.')
    value.update(changes)
    return await asyncio.to_thread(store.save,'sessions',value)

@app.delete('/api/sessions/{session_id}')
async def delete_session(session_id:str):
    async with session_lock:
        if session_id in active:raise HTTPException(409,'Wait for analysis to finish before deleting this video.')
        value=await asyncio.to_thread(record,'sessions',session_id)
        for tool in await asyncio.to_thread(store.records,'tools'):
            if tool.get('referenceId')==session_id:raise HTTPException(409,'This video is a saved tool’s reference and cannot be deleted.')
        for key in [value.get('analysisKey'),value.get('sourceKey')]:
            if key:await asyncio.to_thread(store.remove,key)
        await asyncio.to_thread(store.delete,'sessions',session_id)
        cache.pop(session_id,None)
        return {'deleted':True}
