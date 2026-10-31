import {documentPublisher} from './document-publisher.js';
import {publisherFor} from './source-fallbacks.js';
import {initialPDFDetails} from './pdf-extraction.js';
import {parentPort,workerData} from 'node:worker_threads';
import {load} from 'cheerio';
import {unzipSync} from 'fflate';
const clean=v=>String(v||'').replace(/\s+/g,' ').trim().slice(0,2000);
async function extract(){
 const bytes=new Uint8Array(workerData.bytes);let title='',author='',text='';let usedOCR=false,publisher='',doi='';
 if(workerData.kind==='pdf'){
 const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
 const task=getDocument({data:bytes,isEvalSupported:false,useSystemFonts:false,disableFontFace:true});const doc=await task.promise;
 try{const result=await initialPDFDetails(doc,async p=>{
 const [{createCanvas},{createWorker},{default:english}]=await Promise.all([import('@napi-rs/canvas'),import('tesseract.js'),import('@tesseract.js-data/eng')]);
 const natural=p.getViewport({scale:1});const scale=Math.min(2,2000/Math.max(natural.width,natural.height));const viewport=p.getViewport({scale});
 const canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
 await p.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
 const ocr=await createWorker('eng',1,{langPath:english.langPath,gzip:true,cacheMethod:'none',errorHandler:()=>{}});
 try{return (await ocr.recognize(canvas.toBuffer('image/png'))).data.text;}finally{await ocr.terminate();}
 },{needPublisher:!publisherFor(workerData.url)});({title,author,text,usedOCR,publisher,doi}=result);
 }finally{await task.destroy();}
 }else if(workerData.kind==='doc'){
 const {default:WordExtractor}=await import('word-extractor');
 const extracted=await new WordExtractor().extract(Buffer.from(bytes));text=extracted.getBody().slice(0,100000);
 }else if(workerData.kind==='docx'){
 let hasBody=false;
 const files=unzipSync(bytes,{filter:file=>{if(file.name==='word/document.xml')hasBody=true;if(file.name!=='docProps/core.xml')return false;if(file.originalSize>1_000_000)throw Error('Document metadata is too large.');return true;}});
 if(!hasBody)throw Error('Not a valid DOCX document.');
 const decode=b=>new TextDecoder().decode(b);const core=load(decode(files['docProps/core.xml']||new Uint8Array()),{xmlMode:true});title=clean(core('dc\\:title').text());author=clean(core('dc\\:creator').text());
 if(!title||!publisherFor(workerData.url)){const bodyFiles=unzipSync(bytes,{filter:file=>{if(file.name!=='word/document.xml')return false;if(file.originalSize>8_000_000)throw Error('Document content is too large.');return true;}});const body=load(decode(bodyFiles['word/document.xml']),{xmlMode:true});text=body('w\\:p').slice(0,20).map((_,p)=>body(p).find('w\\:t').map((_,t)=>body(t).text()).get().join('')).get().join('\n');}
 }else{text=new TextDecoder().decode(bytes.subarray(0,100000));}
 const foundPublisher=documentPublisher(text,publisher);
 const inferred=!title;title=title||clean(text.split(/\n/).find(line=>line.trim())||'');
 if(!title)throw Error('No readable title or text was found. OCR could not find readable text; try a clearer copy or enter details manually.');
 return {identifiers:doi?{doi}:{},source:{type:'web',title,author,site:foundPublisher.name,url:workerData.url},provenance:{title:inferred?(usedOCR?'OCR text — confirm the document title':'First extracted text — confirm the document title'):'Document metadata — confirm title',author:'Document metadata — may identify a file creator rather than the author',site:foundPublisher.name?foundPublisher.evidence:'Missing publisher or website name',url:'Retrieved document URL'},warnings:['Document imported. Confirm source type, title, author, publication details, and publisher/site before formatting. File creation and modification dates are not treated as publication dates.',...(usedOCR?['English OCR was used on the first page. Check recognition accuracy.']:[]),...(inferred?['Title inferred from the first extracted text; review it carefully.']:[])]};
}
try{parentPort.postMessage({result:await extract()});}catch(error){parentPort.postMessage({error:error.name==='PasswordException'?'This PDF is password-protected. Use an accessible copy or enter details manually.':error.message});}
