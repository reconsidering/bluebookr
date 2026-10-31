import {parentPort,workerData} from 'node:worker_threads';
import {load} from 'cheerio';
import {unzipSync} from 'fflate';
const clean=v=>String(v||'').replace(/\s+/g,' ').trim().slice(0,2000);
async function extract(){
 const bytes=new Uint8Array(workerData.bytes);let title='',author='',text='';
 if(workerData.kind==='pdf'){
 const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
 const task=getDocument({data:bytes,isEvalSupported:false,useSystemFonts:false,disableFontFace:true});const doc=await task.promise;
 try{const metadata=await doc.getMetadata();title=clean(metadata.info?.Title);author=clean(metadata.info?.Author);for(let page=1;page<=Math.min(doc.numPages,3);page++){const p=await doc.getPage(page);const content=await p.getTextContent();for(const item of content.items)text+=(item.str||'')+(item.hasEOL?'\n':' ');if(text.length>100000)break;}}finally{await task.destroy();}
 }else if(workerData.kind==='docx'){
 let expanded=0;const files=unzipSync(bytes,{filter:file=>{if(!['docProps/core.xml','word/document.xml'].includes(file.name))return false;expanded+=file.originalSize;if(expanded>8_000_000)throw Error('Document content is too large.');return true;}});
 if(!files['word/document.xml'])throw Error('Not a valid DOCX document.');
 const decode=b=>new TextDecoder().decode(b);const core=load(decode(files['docProps/core.xml']||new Uint8Array()),{xmlMode:true});title=clean(core('dc\\:title').text());author=clean(core('dc\\:creator').text());const body=load(decode(files['word/document.xml']),{xmlMode:true});text=body('w\\:p').slice(0,100).map((_,p)=>body(p).find('w\\:t').map((_,t)=>body(t).text()).get().join('')).get().join('\n');
 }else{text=new TextDecoder().decode(bytes).slice(0,100000);}
 const inferred=!title;title=title||clean(text.split(/\n/).find(line=>line.trim())||'');
 if(!title)throw Error('No readable title or text was found. Scanned PDFs need OCR; enter source details manually.');
 return {source:{type:'web',title,author,site:'',url:workerData.url},provenance:{title:inferred?'First extracted text — confirm the document title':'Document metadata — confirm title',author:'Document metadata — may identify a file creator rather than the author',site:'Missing publisher or website name',url:'Retrieved document URL'},warnings:['Document imported. Confirm source type, title, author, publication details, and publisher/site before formatting. File creation and modification dates are not treated as publication dates.',...(inferred?['Title inferred from the first extracted text; review it carefully.']:[])]};
}
try{parentPort.postMessage({result:await extract()});}catch(error){parentPort.postMessage({error:error.name==='PasswordException'?'This PDF is password-protected. Use an accessible copy or enter details manually.':error.message});}
