import {withCitation} from './actions.js';
import {recognizeCitation} from '../../recognition.js';
import {formatCitation} from '../../formatter.js';
export function reviewText(text,options={}){
 const original=text.replace(/[\r\n]+$/,'');
 if(!original.trim())return null;
 try {const source=recognizeCitation(original);const citation=formatCitation({...source,...options});return {original,citation,message:original===citation.text?'Recognized full citation. Review typography and source details.':'Suggested full-citation formatting.'};}
 catch {if(/\bv\.|§|\bid\.|\bsupra\b|https?:\/\/|\(\d{4}\)/i.test(original))return {original,message:'Manual review needed: inline citations, short forms, URLs, or this citation pattern are not automatically corrected.'};return null;}
}
export function citationHTML(citation){const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));return citation.parts.map(p=>`<span style="font-variant:${p.style==='smallcaps'?'small-caps':'normal'};font-style:normal;text-decoration:none">${p.style==='italic'?`<i>${escape(p.text)}</i>`:p.style==='underline'?`<u>${escape(p.text)}</u>`:escape(p.text)}</span>`).join('');}

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
export async function goToCitation(entry,run=Word.run,progress=()=>{}){
 await withCitation(entry,async(ctx,{range,note})=>{
 range.load('text');await ctx.sync();if(range.text!==entry.snapshot)throw Error('This citation changed. Scan again to locate it safely.');
 if(note?.reference){progress('Opening the note reference…');note.reference.select('Select');await ctx.sync();}
 progress('Selecting citation text…');range.select('Select');await ctx.sync();
 if(ctx.document?.getSelection){const selected=ctx.document.getSelection();selected.load('text');await ctx.sync();if(selected.text.replace(/\r/g,'')!==entry.snapshot.replace(/\r/g,''))throw Error('Word did not select the expected citation. Select it manually and run a new review.');}
 },run);
}

export function citationCandidates(text){
 const candidates=[];const pattern=/[^;\r\n]+/g;let match;
 while((match=pattern.exec(text))){const leading=match[0].match(/^[\s\u0001-\u0008]*/)[0].length;const value=match[0].slice(leading).trimEnd();if(!value)continue;const review=reviewText(value);if(review?.citation){if(text[match.index+match[0].length]===';'&&!value.endsWith('.')){review.citation.text=review.citation.text.replace(/\.$/,'');review.citation.parts.at(-1).text=review.citation.parts.at(-1).text.replace(/\.$/,'');}candidates.push({...review,text:value});}}
 return candidates;
}
