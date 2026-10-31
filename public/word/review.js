import {recognizeCitation} from '../../recognition.js';
import {formatCitation} from '../../formatter.js';
export function reviewText(text){
 const original=text.replace(/[\r\n]+$/,'');
 if(!original.trim())return null;
 try {const source=recognizeCitation(original);const citation=formatCitation(source);return {original,citation,message:original===citation.text?'Recognized full citation. Review typography and source details.':'Suggested full-citation formatting.'};}
 catch {if(/\bv\.|§|\bid\.|\bsupra\b|https?:\/\/|\(\d{4}\)/i.test(original))return {original,message:'Manual review needed: inline citations, short forms, URLs, or this citation pattern are not automatically corrected.'};return null;}
}
export function citationHTML(citation){const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));return citation.parts.map(p=>p.style==='italic'?`<i>${escape(p.text)}</i>`:p.style==='smallcaps'?`<span style="font-variant:small-caps">${escape(p.text)}</span>`:escape(p.text)).join('');}

// Bound the comparison cost for unusually long selections.
export function citationChanges(before,after){
 if(before===after)return [{kind:'same',text:before}];
 const a=before.match(/\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu)||[],b=after.match(/\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu)||[];
 if(a.length*b.length>250000)return [{kind:'delete',text:before},{kind:'insert',text:after}];
 const table=Array.from({length:a.length+1},()=>new Uint16Array(b.length+1));
 for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)table[i][j]=a[i]===b[j]?1+table[i+1][j+1]:Math.max(table[i+1][j],table[i][j+1]);
 const parts=[];const add=(kind,text)=>{if(parts.at(-1)?.kind===kind)parts.at(-1).text+=text;else parts.push({kind,text});};
 let i=0,j=0;while(i<a.length||j<b.length){if(i<a.length&&j<b.length&&a[i]===b[j]){add('same',a[i++]);j++;}else if(i<a.length&&(j===b.length||table[i+1][j]>=table[i][j+1]))add('delete',a[i++]);else add('insert',b[j++]);}return parts;
}
export async function goToCitation(entry,run=Word.run){
 await run([entry.range],async ctx=>{entry.range.load('text');await ctx.sync();if(entry.range.text!==entry.snapshot)throw Error('This citation changed. Scan again to locate it safely.');entry.range.select('Select');await ctx.sync();});
}
