import {scholarlyDOI} from './citation-enrichment.js';
import {documentPublisher} from './document-publisher.js';
const clean=value=>String(value||'').replace(/\s+/g,' ').trim().slice(0,2000);
export function readableText(text){return (String(text).match(/\p{L}/gu)||[]).length>=8;}
export async function initialPDFDetails(doc,ocr,{needPublisher=false}={}){
 const metadata=await doc.getMetadata();const title=clean(metadata.info?.Title),author=clean(metadata.info?.Author);
 const doi=scholarlyDOI(metadata);
 const publisher=metadata.metadata?.get?.('dc:publisher')||'';
 if(title&&(!needPublisher||documentPublisher('',publisher).name))return {title,author,publisher,doi,text:'',pagesRead:0,usedOCR:false};
 let firstPage,text='',pagesRead=0;
 for(let number=1;number<=Math.min(doc.numPages,3);number++){
 const page=await doc.getPage(number);firstPage??=page;pagesRead++;
 try{const content=await page.getTextContent();const pageText=content.items.map(item=>(item.str||'')+(item.hasEOL?'\n':' ')).join('').slice(0,100000);if(readableText(pageText)){text=pageText;break;}}catch{/* Try the remaining initial pages before resorting to OCR. */}
 }
 let usedOCR=false;if(!title&&!readableText(text)&&firstPage){text=await ocr(firstPage);usedOCR=true;}
 return {title,author,publisher,text,pagesRead,usedOCR,doi:doi||scholarlyDOI(metadata,text)};
}
