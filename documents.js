import {Worker} from 'node:worker_threads';
export function documentKind(bytes,contentType){
 const mime=(contentType||'').split(';')[0].trim().toLowerCase();
 if(bytes.subarray(0,5).toString()==='%PDF-')return 'pdf';
 if(bytes[0]===0x50&&bytes[1]===0x4b&&bytes[2]===3&&bytes[3]===4)return 'docx';
 if(mime==='text/plain')return 'text';
 if(['text/html','application/xhtml+xml'].includes(mime))return 'html';
 throw Error('Unsupported document format. Use a PDF, DOCX, plain-text, or HTML link. Legacy .doc and scanned image files need conversion.');
}
export function extractDocument(bytes,kind,url){return new Promise((resolve,reject)=>{
 const worker=new Worker(new URL('./document-worker.js',import.meta.url),{workerData:{bytes,kind,url},resourceLimits:{maxOldGenerationSizeMb:128}});
 const timer=setTimeout(()=>{worker.terminate();reject(Error('Document parsing took too long. Enter source details manually.'));},15000);
 const finish=()=>{clearTimeout(timer);worker.terminate();};
 worker.once('message',message=>{finish();message.error?reject(Error(message.error)):resolve(message.result);});worker.once('error',error=>{finish();reject(Error('Unable to read this document: '+error.message));});worker.once('exit',code=>{clearTimeout(timer);if(code)reject(Error('Document parser stopped. The file may be too complex or damaged.'));});
});}
