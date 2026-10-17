/** Emits CDP requests for saving an app-generated PDF when browser downloads are canceled. */
function prepare() {
 if (window.__learnunlockExportCapture) throw new Error('A capture is already active. Clean it up first.');
 const state={click:HTMLAnchorElement.prototype.click,revoke:URL.revokeObjectURL,urls:[]};
 window.__learnunlockExportCapture=state;
 HTMLAnchorElement.prototype.click=function() {
  if(/\.pdf$/i.test(this.download) && this.href.startsWith(`blob:${location.origin}/`)) {
   const previous=document.querySelector('#learnunlock-native-export-capture');
   if(previous) previous.remove();
   const link=document.createElement('a');
   link.id='learnunlock-native-export-capture';link.href=this.href;link.download=this.download;
   link.textContent='Save native exported PDF';
   link.style='position:fixed;top:12px;right:12px;z-index:99999;background:white;padding:12px';
   document.body.append(link);state.urls.push(this.href);
  } else return state.click.call(this);
 };
 URL.revokeObjectURL=function(url) { if(!state.urls.includes(url)) state.revoke.call(URL,url); };
 return 'Capture ready. Use the app Export to PDF action.';
}
async function read() {
 const link=document.querySelector('#learnunlock-native-export-capture');
 if(!link || !link.href.startsWith(`blob:${location.origin}/`)) throw new Error('The app has not produced a captured PDF yet.');
 const response=await fetch(link.href);
 if(!response.ok) throw new Error('The app PDF Blob is not readable.');
 const bytes=new Uint8Array(await response.arrayBuffer());
 if(new TextDecoder().decode(bytes.subarray(0,5))!=='%PDF-') throw new Error('Captured bytes are not a PDF.');
 let binary='';
 for(let offset=0;offset<bytes.length;offset+=32768) binary+=String.fromCharCode(...bytes.subarray(offset,offset+32768));
 return btoa(binary);
}
function cleanup() {
 const state=window.__learnunlockExportCapture;
 if(!state) return 'No capture remains.';
 HTMLAnchorElement.prototype.click=state.click;URL.revokeObjectURL=state.revoke;
 state.urls.forEach(url=>state.revoke.call(URL,url));
 document.querySelectorAll('#learnunlock-native-export-capture').forEach(link=>link.remove());
 delete window.__learnunlockExportCapture;
 return 'Capture removed.';
}
export function captureRequest(mode) {
 const action={prepare,read,cleanup}[mode];
 if(!action) throw new Error('Use prepare, read, or cleanup.');
 return {expression:`(${action.toString()})()`,awaitPromise:mode==='read',returnByValue:true};
}
if(import.meta.main) {
 try { console.log(JSON.stringify(captureRequest(process.argv[2]))); }
 catch(error) {console.error(error.message);process.exitCode=1;}
}
