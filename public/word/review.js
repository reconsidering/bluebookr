import {recognizeCitation} from '../../recognition.js';
import {formatCitation} from '../../formatter.js';
export function reviewText(text){
 const original=text.replace(/[\r\n]+$/,'');
 if(!original.trim())return null;
 try {const source=recognizeCitation(original);const citation=formatCitation(source);return {original,citation,message:original===citation.text?'Recognized full citation. Review typography and source details.':'Suggested full-citation formatting.'};}
 catch {if(/\bv\.|§|\bid\.|\bsupra\b|https?:\/\/|\(\d{4}\)/i.test(original))return {original,message:'Manual review needed: inline citations, short forms, URLs, or this citation pattern are not automatically corrected.'};return null;}
}
export function citationHTML(citation){const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));return citation.parts.map(p=>p.style==='italic'?`<i>${escape(p.text)}</i>`:p.style==='smallcaps'?`<span style="font-variant:small-caps">${escape(p.text)}</span>`:escape(p.text)).join('');}
