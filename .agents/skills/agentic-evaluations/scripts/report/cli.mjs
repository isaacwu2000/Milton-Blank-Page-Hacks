import { readFile, writeFile, mkdir, realpath, rename, rm, mkdtemp, copyFile, readdir } from 'node:fs/promises';
import { resolve, dirname, relative, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildReport } from './report.mjs';
import { buildCharts, chartSvg, escapeHtml } from './charts.mjs';

/** Writes a report package atomically; failed validation/rendering leaves no final output. */
export async function generateReport(inputPath, outputPath, options = {}) {
 const input=resolve(inputPath), output=resolve(outputPath), evidenceRoot=await realpath(dirname(input));
 if(await Bun.file(join(output,'computed.json')).exists()) throw new Error('Output already contains a report. Choose a fresh output directory.');
 const raw=JSON.parse(await readFile(input,'utf8'));
 const baseline=options.baseline ? JSON.parse(await readFile(resolve(options.baseline),'utf8')) : null;
 const report=buildReport(raw,baseline);
 const charts=buildCharts(report);
 const prose=report.summary ? Object.entries(report.summary).filter(([key])=>key!=='minusContext').flatMap(([,value])=>value).map(item=>[item.text,...item.records].join(' ')) : report.findings;
 if(report.summary?.minusContext) prose.push(report.summary.minusContext);
 if(prose.join(' ').split(/\s+/).filter(Boolean).length>700) throw new Error('Findings exceed 700 words; leave room for labels within the 1000-word PDF cap.');
 const screenshotPath=async shot=>{
  if(typeof shot.path!=='string' || !['.png','.jpg','.jpeg','.webp'].includes(extname(shot.path).toLowerCase()) || typeof shot.caption!=='string') throw new Error('Screenshot needs an image path and caption.');
  const path=await realpath(resolve(evidenceRoot,shot.path));
  const rel=relative(evidenceRoot,path);
  if(rel.startsWith('..') || rel.startsWith('/')) throw new Error('Screenshot must be inside the input evidence directory.');
  return {...shot,path};
 };
 const seenSessions=new Set();
 for(const scenario of report.cases) for(const session of scenario.sessions) {
  if(seenSessions.has(session.id)) throw new Error('Duplicate session ID in export.');
  seenSessions.add(session.id);
  if(session.nativePdf) {
   if(typeof session.nativePdf!=='string' || extname(session.nativePdf).toLowerCase()!=='.pdf' || session.nativeExportVerified!==true) throw new Error('Native PDF requires a verified app export.');
   const path=await realpath(resolve(evidenceRoot,session.nativePdf));
   const rel=relative(evidenceRoot,path);
   if(rel.startsWith('..') || rel.startsWith('/')) throw new Error('Native PDF must be inside the input evidence directory.');
   session.nativePdf=path;
  }
  for(const message of session.messages) message.screenshots=await Promise.all((message.screenshots??[]).map(screenshotPath));
 }
 report.screenshots=await Promise.all((report.screenshots??[]).map(screenshotPath));
 if(report.summary) for(const items of Object.values(report.summary).filter(Array.isArray)) for(const item of items) item.screenshots=await Promise.all((item.screenshots??[]).map(screenshotPath));
 if(report.evaluatorNotes) for(const items of Object.values(report.evaluatorNotes)) for(const item of items) if(typeof item!=='string') item.screenshots=await Promise.all((item.screenshots??[]).map(screenshotPath));
 await mkdir(dirname(output),{recursive:true});
 const staging=await mkdtemp(join(dirname(output),'.agentic-report-'));
 try {
  await mkdir(join(staging,'charts'));
  await mkdir(join(staging,'assets'));
  const evidenceFiles=await readdir(evidenceRoot,{withFileTypes:true});
  const assetNames=new Set();
  for(const entry of evidenceFiles) {
   if(!entry.isFile() || !(/\.(png|jpe?g|webp|pdf|txt)$/i.test(entry.name) || ['transcript.json','review.json','inputs.json','role.json','native-export-capture-record.json'].includes(entry.name))) continue;
   await copyFile(join(evidenceRoot,entry.name),join(staging,'assets',entry.name));assetNames.add(entry.name);
  }
  const copyReferencedAssets=async value=> {
   if(Array.isArray(value)) {for(const item of value) await copyReferencedAssets(item);return;}
   if(!value || typeof value!=='object') return;
   for(const [key,item] of Object.entries(value)) {
    if(['path','nativePdf'].includes(key) && typeof item==='string' && item.startsWith(evidenceRoot+'/')) {
     const name=item.split('/').at(-1);
     if(!assetNames.has(name)) {await copyFile(item,join(staging,'assets',name));assetNames.add(name);}
    } else await copyReferencedAssets(item);
   }
  };
  await copyReferencedAssets(report);
  const portable=value=> {
   if(Array.isArray(value)) return value.map(portable);
   if(value && typeof value==='object') return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,['path','nativePdf'].includes(key)&&typeof item==='string'&&assetNames.has(item.split('/').at(-1))?'assets/'+item.split('/').at(-1):portable(item)]));
   return value;
  };
  await writeFile(join(staging,'results.json'),JSON.stringify(portable(raw),null,2));
  for(const chart of charts) await writeFile(join(staging,'charts',`${chart.id}.svg`),chartSvg(chart));
  const gallery=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Evaluation chart gallery</title><style>body{font:16px/1.5 Arial,sans-serif;color:#17252b;background:#f5f8f9;max-width:1100px;margin:40px auto;padding:0 24px}h1{font-size:28px}section{margin:40px 0}img{width:100%;height:auto;background:white}a{color:#28685b}p{max-width:75ch}nav{display:flex;flex-wrap:wrap;gap:12px 24px}a:focus-visible{outline:2px solid #28685b;outline-offset:4px}</style><h1>Evaluation chart gallery</h1><p>${escapeHtml(report.runId)} · ${escapeHtml(report.evaluator)} · app ${escapeHtml(report.appVersion)}. Provisional reviewer judgments; 80% Wilson intervals. One run does not establish reliability.</p><p>Empty charts remain visible to show which views need more cases or a compatible baseline. Complete first attempts only in primary charts; event rates within chats have correlated observations.</p><nav>${charts.map(chart=>`<a href="#${chart.id}">${escapeHtml(chart.title)}</a>`).join('')}</nav>${charts.map(chart=>`<section id="${chart.id}"><h2>${escapeHtml(chart.title)}</h2><img src="charts/${chart.id}.svg" alt="${escapeHtml(chart.title)}"><details><summary>Data and exclusions</summary><pre>${escapeHtml(JSON.stringify(chart.rows,null,2))}</pre></details></section>`).join('')}</html>`;
  const times=`<p>Start: ${escapeHtml(report.startedAt??'unknown (not captured)')} · End: ${escapeHtml(report.endedAt??'unknown (not captured)')} · Zone: ${escapeHtml(report.timeZone??'unknown')} · Local commit: ${escapeHtml(report.localCommit??'unknown')} · Deployed commit: ${escapeHtml(report.deployedCommit??'unknown')}</p>`;
  await writeFile(join(staging,'gallery.html'),gallery.replace('<nav>',times+'<nav>'));
  await writeFile(join(staging,'computed.json'),JSON.stringify({...report,charts},null,2));
  if(!options.htmlOnly) {
   const python=options.python ?? process.env.AGENTIC_REPORT_PYTHON ?? 'python3';
   const renderer=fileURLToPath(new URL('./render_pdf.py',import.meta.url));
   const child=Bun.spawn([python,renderer,join(staging,'computed.json'),staging],{stdout:'pipe',stderr:'pipe'});
   const [stdout,stderr,code]=await Promise.all([new Response(child.stdout).text(),new Response(child.stderr).text(),child.exited]);
   if(code!==0) throw new Error(`PDF generation failed. Use --python with a Python containing ReportLab. ${stderr.trim()}`);
   await writeFile(join(staging,'pdf-validation.json'),stdout);
  }
  await writeFile(join(staging,'computed.json'),JSON.stringify(portable({...report,charts}),null,2));
  const rendererVersion=JSON.parse(await readFile(fileURLToPath(new URL('./renderer-version.json',import.meta.url)),'utf8')).version;
  const commitProcess=Bun.spawn(['git','rev-parse','HEAD'],{cwd:fileURLToPath(new URL('.',import.meta.url)),stdout:'pipe',stderr:'pipe'});
  const commit=(await new Response(commitProcess.stdout).text()).trim();
  const commitCode=await commitProcess.exited;
  const statusProcess=Bun.spawn(['git','status','--porcelain','--','.agents/skills/agentic-evaluations/scripts/report','.agents/skills/agentic-evaluations/scripts/assets'],{cwd:fileURLToPath(new URL('../../../../../',import.meta.url)),stdout:'pipe',stderr:'pipe'});
  const status=(await new Response(statusProcess.stdout).text()).trim();await statusProcess.exited;
  const sources=['cli.mjs','report.mjs','charts.mjs','render_pdf.py','renderer-version.json','../assets/Lexend-Regular.ttf','../assets/Lexend-SemiBold.ttf'];
  const hashes=Object.fromEntries(await Promise.all(sources.map(async name=>[name,new Bun.CryptoHasher('sha256').update(await readFile(fileURLToPath(new URL(name,import.meta.url)))).digest('hex')])));
  await writeFile(join(staging,'manifest.json'),JSON.stringify({runId:raw.runId,skillVersion:raw.skillVersion,reportFormat:raw.reportFormat??(raw.skillVersion==='6'?'separate-chat-exports':'legacy'),renderer:{version:rendererVersion,commit:commitCode===0?commit:'unknown',workingTreeModified:!!status,sourceSha256:hashes},files:{results:'results.json',computed:'computed.json',evidenceRoot:'assets',evaluation:options.htmlOnly?null:(['single-evaluation','separate-chat-exports'].includes(raw.reportFormat)||['5','6'].includes(raw.skillVersion)?'evaluation.pdf':'summary.pdf'),fullChatExports:options.htmlOnly||raw.reportFormat==='single-evaluation'||(raw.skillVersion==='5'&&raw.reportFormat!=='separate-chat-exports')?null:'full-chats.pdf'}},null,2));
  await rename(staging,output);
  return {output,summary:options.htmlOnly?null:join(output,['single-evaluation','separate-chat-exports'].includes(raw.reportFormat)||['5','6'].includes(raw.skillVersion)?'evaluation.pdf':'summary.pdf'),gallery:join(output,'gallery.html'),charts:charts.length};
 } catch(error) { await rm(staging,{recursive:true,force:true}); throw error; }
}

if(import.meta.main) {
 try {
  const args=process.argv.slice(2);
  if(!args.length || args.includes('--help')) {
   console.log('bun .agents/skills/agentic-evaluations/scripts/report/cli.mjs RESULTS.json --out DIRECTORY [--baseline RESULTS.json] [--python PYTHON] [--html-only]');
  } else {
   const options={},input=args.shift(); let output;
   while(args.length) {
    const flag=args.shift();
    if(flag==='--html-only') options.htmlOnly=true;
    else if(['--out','--baseline','--python'].includes(flag)) {
     const value=args.shift(); if(!value || value.startsWith('--')) throw new Error(`Missing ${flag} value.`);
     if(flag==='--out') output=value; else options[flag.slice(2)]=value;
    } else throw new Error(`Unknown argument ${flag}.`);
   }
   if(!output) throw new Error('--out is required.');
   console.log(JSON.stringify(await generateReport(input,output,options),null,2));
  }
 } catch(error) { console.error(error.message);process.exitCode=1; }
}
