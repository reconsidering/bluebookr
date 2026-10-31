import {Worker} from 'node:worker_threads';
export function documentKind(bytes,contentType){
 const mime=(contentType||'').split(';')[0].trim().toLowerCase();
 if(bytes.subarray(0,5).toString()==='%PDF-')return 'pdf';
 if(bytes[0]===0x50&&bytes[1]===0x4b&&bytes[2]===3&&bytes[3]===4)return 'docx';
 if(bytes.subarray(0,8).equals(Buffer.from([0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1])))return 'doc';
 if(mime==='text/plain')return 'text';
 if(['text/html','application/xhtml+xml'].includes(mime))return 'html';
 throw Error('Unsupported document format. Use a PDF, DOCX, plain-text, or HTML link. Supported legacy Word .doc files must be valid OLE documents.');
}
export function extractDocument(bytes,kind,url){return new Promise((resolve,reject)=>{
 const worker=new Worker(new URL('./document-worker.js',import.meta.url),{workerData:{bytes,kind,url},resourceLimits:{maxOldGenerationSizeMb:192}});
 const timer=setTimeout(()=>{worker.terminate();reject(Error('Document parsing took too long. Enter source details manually.'));},90000);
 const finish=()=>{clearTimeout(timer);worker.terminate();};
 worker.once('message',message=>{finish();message.error?reject(Error(message.error)):resolve(message.result);});worker.once('error',error=>{finish();reject(Error('Unable to read this document: '+error.message));});worker.once('exit',code=>{clearTimeout(timer);if(code)reject(Error('Document parser stopped. The file may be too complex or damaged.'));});
});}
