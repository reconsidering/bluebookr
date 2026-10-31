import {reviewText,citationHTML} from './review.js';
import {formatCitation} from '../../formatter.js';
export function rawURLs(text){return [...text.matchAll(/https?:\/\/[^\s<>"\u201c\u201d]+/gi)].map(m=>{let url=m[0].replace(/[.,;:!?]+$/,'');while(url.endsWith(')')&&(url.match(/\)/g)||[]).length>(url.match(/\(/g)||[]).length)url=url.slice(0,-1);return url;});}
export async function automaticFix(scope,report){
 let fixed=0,unresolved=0;const details=[];const cache=new Map();let limited=false;
 const note=text=>{unresolved++;details.push(text);};
 await Word.run(async ctx=>{
 const blocks=[];
 if(scope==='selection'){const selection=ctx.document.getSelection();selection.load('text');await ctx.sync();if(!selection.text.trim())throw Error('Select text first, or choose Whole document.');blocks.push(selection);}
 else{const collections=[ctx.document.body.paragraphs];let notes=[];
 if(Office.context.requirements.isSetSupported('WordApi','1.5')){const f=ctx.document.body.footnotes,e=ctx.document.body.endnotes;f.load('items');e.load('items');await ctx.sync();notes=[...f.items,...e.items];}else details.push('Footnotes and endnotes were not scanned on this Word version.');
 for(const n of notes)collections.push(n.body.paragraphs);for(const c of collections)c.load('items');await ctx.sync();for(const c of collections)for(const p of c.items)blocks.push(p.getRange('Content'));
 }
 for(const b of blocks)b.load('text');await ctx.sync();
 const jobs=[];
 for(const b of blocks){const review=reviewText(b.text);if(review?.citation){jobs.push({range:b,text:b.text,citation:review.citation});continue;}
 const seen=new Set();
 if(Office.context.requirements.isSetSupported('WordApi','1.3')){const links=b.getHyperlinkRanges();links.load('items');await ctx.sync();for(const r of links.items)r.load('text,hyperlink');await ctx.sync();for(const r of links.items){if(/^https?:\/\//i.test(r.hyperlink||'')){jobs.push({range:r,text:r.text,url:r.hyperlink,hyperlink:r.hyperlink});seen.add(r.text);seen.add(r.hyperlink);}}}
 else if(/https?:/.test(b.text))details.push('Hyperlink labels cannot be inspected on this Word version; only visible URLs are processed.');
 for(const url of new Set(rawURLs(b.text))){if(seen.has(url))continue;const matches=b.search(url,{matchCase:true,matchWildcards:false});matches.load('items');await ctx.sync();for(const r of matches.items){r.load('text');jobs.push({range:r,text:url,url});}}
 if(review&&!rawURLs(b.text).length&&!seen.size)note('Manual citation review: '+b.text.slice(0,180));
 }
 // Track locations before asynchronous website lookups; preserve a snapshot for stale-document checks.
 if(jobs.length>200)limited=true;
 const selected=jobs.slice(0,200);for(const j of selected)ctx.trackedObjects.add(j.range);await ctx.sync();
 try{for(let i=0;i<selected.length;i++){const job=selected[i];report(`Fixing item ${i+1} of ${selected.length}…`);
 try{let citation=job.citation;
 if(!citation){if(!cache.has(job.url))cache.set(job.url,(async()=>{const response=await fetch('/api/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:job.url})});const data=await response.json();if(!response.ok)throw Error(data.error);if(data.source.type==='web'&&(!data.source.title||!data.source.site||data.provenance?.site?.includes('hostname')))throw Error('Publisher title or site name is missing.');return formatCitation(data.source);})());citation=await cache.get(job.url);}
 job.range.load(job.hyperlink?'text,hyperlink':'text');await ctx.sync();
 if(job.range.text!==job.text||(job.hyperlink&&job.range.hyperlink!==job.hyperlink))throw Error('Text or hyperlink changed during processing.');
 job.range.insertHtml(citationHTML(citation),'Replace');await ctx.sync();fixed++;
 }catch(e){note((job.url||job.text.slice(0,100))+': '+(e.message||'Could not replace this item.'));}
 }}finally{for(const j of selected)ctx.trackedObjects.remove(j.range);await ctx.sync();}
 });
 if(limited)details.push('Only the first 200 replacement candidates were processed.');
 return {fixed,unresolved,details};
}
