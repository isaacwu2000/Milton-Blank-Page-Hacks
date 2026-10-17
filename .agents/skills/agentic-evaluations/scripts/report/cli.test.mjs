import { test, expect } from 'bun:test';
import { mkdtemp, writeFile, readFile, rm, symlink, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generateReport } from './cli.mjs';

function fixture() {
 return {schemaVersion:1,runId:'fixture-only',skillVersion:'1',rubricVersion:'1',appVersion:'fixture',evaluator:'fixture',findings:['Synthetic fixture, not product evidence.'],cases:[{id:'fixture',family:'algebra',scenarioVersion:'1',split:'training',attempt:1,status:'complete',expectedChecks:['render','route'],checks:[{id:'render',category:'visuals',kind:'binary',status:'observed',successes:1,opportunities:1,note:'Fixture rendered.',evidence:['Turn 2']},{id:'route',category:'visuals',kind:'binary',status:'unable-to-verify',note:'Route not visible.',evidence:['UI label unavailable']}],sessions:[{id:'fixture-chat',url:'https://www.learnunlock.app/tutor?sessionId=fixture',captureComplete:false,captureNotes:['Synthetic incomplete fixture.'],messages:[{role:'student',text:'<script>alert("unsafe")</script>'},{role:'tutor',text:'word '.repeat(850)+'UNABRIDGED END MARKER'}]}]}]};
}

test('JSON-to-gallery preserves unknowns, escapes text, creates useful views and refuses overwrites', async () => {
 const dir=await mkdtemp(join(tmpdir(),'agentic-test-'));
 try {
  const run=fixture();run.runId='<script>alert("unsafe")</script>';
  const input=join(dir,'results.json'),output=join(dir,'report');
  await writeFile(input,JSON.stringify(run));
  const result=await generateReport(input,output,{htmlOnly:true});
  expect(result.charts).toBe(15);
  const manifest=JSON.parse(await readFile(join(output,'manifest.json'),'utf8'));
  expect(manifest.renderer.version).toBe('2');
  expect(manifest.renderer.commit).toMatch(/^[a-f0-9]{40}$/);
  expect(manifest.renderer.sourceSha256['render_pdf.py']).toMatch(/^[a-f0-9]{64}$/);
  expect(await Bun.file(join(output,'results.json')).exists()).toBe(true);
  const data=JSON.parse(await readFile(join(output,'computed.json'),'utf8'));
  expect(data.categories[0]).toMatchObject({successes:0,opportunities:0,unknown:1});
  const html=await readFile(result.gallery,'utf8');
  expect(html).toContain('&lt;script&gt;');
  expect(html).not.toContain('<script>');
  expect(await readFile(join(output,'charts','categories-training.svg'),'utf8')).toContain('n=0');
  expect(await readFile(join(output,'charts','categories-held-out.svg'),'utf8')).toContain('No eligible observations');
  await expect(generateReport(input,output,{htmlOnly:true})).rejects.toThrow('fresh output');
 } finally {await rm(dir,{recursive:true,force:true});}
});

test('screenshot symlink escapes fail before publishing outputs', async () => {
 const dir=await mkdtemp(join(tmpdir(),'agentic-test-'));
 try {
  await mkdir(join(dir,'evidence'));
  const input=join(dir,'evidence','results.json'),run=fixture();
  await writeFile(join(dir,'outside-agentic.png'),'not an image');
  await symlink(join(dir,'outside-agentic.png'),join(dir,'evidence','escape.png'));
  run.screenshots=[{path:'escape.png',caption:'Escape attempt'}];
  await writeFile(input,JSON.stringify(run));
  await expect(generateReport(input,join(dir,'report'),{htmlOnly:true})).rejects.toThrow('inside');
  expect(await Bun.file(join(dir,'report','computed.json')).exists()).toBe(false);
 } finally {await rm(dir,{recursive:true,force:true});}
});

const python=process.env.AGENTIC_REPORT_PYTHON;
(python?test:test.skip)('PDF export retains long chats and labels incomplete capture', async () => {
 const dir=await mkdtemp(join(tmpdir(),'agentic-pdf-test-'));
 try {
  const input=join(dir,'results.json'),output=join(dir,'report');
  const run=fixture();
  run.evaluatorNotes={minus:[{text:'SIMULATOR META ONLY'}],auxiliaryFailures:['Download failed.'],plus:['Export captured.'],interesting:['One original case reviewed.']};
  Object.assign(run,{skillVersion:'2',startedAt:'2026-10-03T19:00:00.123Z',endedAt:'2026-10-03T19:01:00.456Z',timeZone:'America/New_York',localCommit:'fixture-sha',deployedCommit:'unknown',summary:{plus:[{id:'P1',text:'Fixture success.',records:['turn 2: fixture displayed']}],minus:[{id:'M1',text:'Fixture miss.',records:['turn 3: fixture absent']}],interesting:[{id:'I1',text:'Fixture observation.',records:['turn 4: fixture changed']}]}});
  await writeFile(input,JSON.stringify(run));
  await generateReport(input,output,{python});
  const validation=JSON.parse(await readFile(join(output,'pdf-validation.json'),'utf8'));
  expect(validation.summaryWords).toBeLessThan(1000);
  expect(validation.chats[0]).toMatchObject({messages:2,captureComplete:false});
  const child=Bun.spawn([python,'-c','from pypdf import PdfReader; import sys; print("\\n".join(p.extract_text() or "" for p in PdfReader(sys.argv[1]).pages))',join(output,'chat-fixture-chat.pdf')],{stdout:'pipe',stderr:'pipe'});
  const text=await new Response(child.stdout).text();
  expect(await child.exited).toBe(0);
  expect(text).toContain('2026-10-03T19:00:00.123Z');
  const summaryChild=Bun.spawn([python,'-c','from pypdf import PdfReader; import sys; print(" ".join(p.extract_text() or "" for p in PdfReader(sys.argv[1]).pages))',join(output,'summary.pdf')],{stdout:'pipe',stderr:'pipe'});
  const summary=await new Response(summaryChild.stdout).text();
  expect(await summaryChild.exited).toBe(0);
  for(const label of ['Plus','Minus','Interesting','P1 record:','M1 record:','I1 record:']) expect(summary).toContain(label);
  expect(summary).not.toContain('SIMULATOR META ONLY');
  expect(summary.indexOf('Minus')).toBeLessThan(summary.indexOf('Plus'));
  const metaChild=Bun.spawn([python,'-c','from pypdf import PdfReader; import sys; print(" ".join(p.extract_text() or "" for p in PdfReader(sys.argv[1]).pages))',join(output,'evaluator-notes.pdf')],{stdout:'pipe',stderr:'pipe'});
  const meta=await new Response(metaChild.stdout).text();
  expect(await metaChild.exited).toBe(0);
  expect(meta).toContain('SIMULATOR META ONLY');
  expect(meta).toContain('2026-10-03T19:00:00.123Z');
  expect(meta.indexOf('Minus')).toBeLessThan(meta.indexOf('Plus'));
  expect(meta.indexOf('Plus')).toBeLessThan(meta.indexOf('Interesting'));
  expect(meta.indexOf('Auxiliary failures')).toBeGreaterThan(meta.indexOf('Minus'));
  expect(meta.indexOf('Auxiliary failures')).toBeLessThan(meta.indexOf('Plus'));
  expect(meta).not.toContain('Visible tools, proposals and saved state');
  expect(text).toContain('INCOMPLETE CAPTURE');
  expect(text.replace(/\s+/g,' ')).toContain('UNABRIDGED END MARKER');
  expect(text).toContain('<script>alert("unsafe")</script>');
  run.cases[0].sessions[0].nativePdf='report/chat-fixture-chat.pdf';
  run.cases[0].sessions[0].nativeExportVerified=true;
  await writeFile(input,JSON.stringify(run));
  const nativeOutput=join(dir,'native-report');
  await generateReport(input,nativeOutput,{python});
  expect((await readFile(join(nativeOutput,'chat-fixture-chat.pdf'))).equals(await readFile(join(output,'chat-fixture-chat.pdf')))).toBe(true);
  const nativeValidation=JSON.parse(await readFile(join(nativeOutput,'pdf-validation.json'),'utf8'));
  expect(nativeValidation.chats[0].nativeExport).toBe(true);
  run.reportFormat='separate-chat-exports';
  run.summary.minusContext='A repeated proposal counts once each time it is displayed.';
  await writeFile(input,JSON.stringify(run));
  const separateOutput=join(dir,'separate-report');
  const separate=await generateReport(input,separateOutput,{python});
  expect(separate.summary).toBe(join(separateOutput,'evaluation.pdf'));
  expect(await Bun.file(join(separateOutput,'full-chats.pdf')).exists()).toBe(true);
  expect(await Bun.file(join(separateOutput,'evaluator-notes.pdf')).exists()).toBe(false);
  const separateChild=Bun.spawn([python,'-c','from pypdf import PdfReader; import sys; print(" ".join(p.extract_text() or "" for p in PdfReader(sys.argv[1]).pages))',separate.summary],{stdout:'pipe',stderr:'pipe'});
  const separateText=await new Response(separateChild.stdout).text();
  expect(await separateChild.exited).toBe(0);
  expect(separateText).toContain('Failure context');
  expect(separateText).not.toContain('UNABRIDGED END MARKER');
  expect(separateText).not.toContain('SIMULATOR META ONLY');
  run.reportFormat='single-evaluation';
  run.summary.auxiliaryFailures=[{id:'M2',text:'AUXILIARY FAILURE MARKER',records:['Visible feature failure.']}];
  await writeFile(input,JSON.stringify(run));
  const unifiedOutput=join(dir,'unified-report');
  const unified=await generateReport(input,unifiedOutput,{python});
  expect(unified.summary).toBe(join(unifiedOutput,'evaluation.pdf'));
  const unifiedChild=Bun.spawn([python,'-c','from pypdf import PdfReader; import sys; print(" ".join(p.extract_text() or "" for p in PdfReader(sys.argv[1]).pages))',unified.summary],{stdout:'pipe',stderr:'pipe'});
  const unifiedText=await new Response(unifiedChild.stdout).text();
  expect(await unifiedChild.exited).toBe(0);
  expect(unifiedText.replace(/\s+/g,' ')).toContain('UNABRIDGED END MARKER');
  expect(unifiedText).toContain('AUXILIARY FAILURE MARKER');
  expect(unifiedText.indexOf('AUXILIARY FAILURE MARKER')).toBeGreaterThan(unifiedText.indexOf('Minus'));
  expect(unifiedText.indexOf('AUXILIARY FAILURE MARKER')).toBeLessThan(unifiedText.indexOf('Plus'));
  expect(unifiedText).not.toContain('SIMULATOR META ONLY');
  expect(await Bun.file(join(unifiedOutput,'evaluator-notes.pdf')).exists()).toBe(false);
  expect(await Bun.file(join(unifiedOutput,'summary.pdf')).exists()).toBe(false);

 } finally {await rm(dir,{recursive:true,force:true});}
});
