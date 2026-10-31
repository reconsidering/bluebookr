import {planLinkedCitation,linkedCitationDraft} from './citation-context.js';
import {scanBlocks} from './scanning.js';
import {replaceCitation} from './replacement.js';
import {boundedMap} from '../../concurrency.js';
import {reviewText,citationCandidates} from './review.js';
import {formatCitation,reviewDateISO} from '../../formatter.js';
export function rawURLs(text){return [...text.matchAll(/https?:\/\/[^\s<>"\u201c\u201d]+/gi)].map(m=>{let url=m[0].replace(/[.,;:!?]+$/,'');while(url.endsWith(')')&&(url.match(/\)/g)||[]).length>(url.match(/\(/g)||[]).length)url=url.slice(0,-1);return url;});}
export async function automaticFix(scope,report,{reviewOnly=false,citationStyle='academic',emphasis='italic'}={}){
 const suggestions=[],failures=[];const reviewDate=reviewDateISO();
 let fixed=0,unresolved=0;const details=[];const cache=new Map();let limited=false;
 const note=text=>{unresolved++;details.push(text);};
 await Word.run(async ctx=>{
 const scanned=await scanBlocks(ctx,scope);const blocks=scanned.blocks;
 if(scope!=='selection')details.push(`Scanned ${scanned.coverage.bodyParagraphs} body paragraphs, ${scanned.coverage.footnotes} footnotes, and ${scanned.coverage.endnotes} endnotes.${scanned.coverage.notesSupported?'':' Notes are unsupported and were not scanned.'}`);
 const jobs=[];
 for(const block of blocks){const b=block.range;const story=block.story;const locator=block.locator;const candidates=citationCandidates(b.text);
 if(candidates.length){
 for(const candidate of candidates){let range=b;
 if(candidate.text!==b.text){
 const beginning=b.search(candidate.text.slice(0,100),{matchCase:true,matchWildcards:false});const ending=b.search(candidate.text.slice(-100),{matchCase:true,matchWildcards:false});beginning.load('items');ending.load('items');await ctx.sync();
 if(beginning.items.length!==1||ending.items.length!==1){note('Ambiguous citation location; select this citation individually: '+candidate.text.slice(0,100));continue;}
 range=beginning.items[0].expandTo(ending.items[0]);range.load('text');await ctx.sync();if(range.text!==candidate.text){note('Citation range could not be isolated. Select it individually.');continue;}
 }
 const review=reviewText(candidate.text,{citationStyle,emphasis,reviewDate});// Preserve semicolon separators outside the range.
 if(!candidate.citation.text.endsWith('.')){review.citation.text=review.citation.text.replace(/\.$/,'');review.citation.parts.at(-1).text=review.citation.parts.at(-1).text.replace(/\.$/,'');}
 jobs.push({range,story,locator,block:b,paragraphText:b.text,text:candidate.text,citation:review.citation});
 }}
 const review=reviewText(b.text,{citationStyle,emphasis,reviewDate});
 const seen=new Set();
 if(Office.context.requirements.isSetSupported('WordApi','1.3')){try{const links=b.getHyperlinkRanges();links.load('items');await ctx.sync();for(const r of links.items)r.load('text,hyperlink');await ctx.sync();for(const r of links.items){if(/^https?:\/\//i.test(r.hyperlink||'')){jobs.push({range:r,story,locator,block:b,paragraphText:b.text,text:r.text,url:r.hyperlink,hyperlink:r.hyperlink});seen.add(r.text);seen.add(r.hyperlink);}}}catch{details.push('Hyperlink inspection failed in '+story+'; visible URLs and recognized citations are still processed.');}}
 else if(/https?:/.test(b.text))details.push('Hyperlink labels cannot be inspected on this Word version; only visible URLs are processed.');
 for(const url of new Set(rawURLs(b.text))){if(seen.has(url))continue;const matches=b.search(url,{matchCase:true,matchWildcards:false});matches.load('items');await ctx.sync();for(const r of matches.items){r.load('text');jobs.push({range:r,story,locator,block:b,paragraphText:b.text,text:url,url});}}
 if(!candidates.length&&review&&!rawURLs(b.text).length&&!seen.size)note('Manual citation review: '+b.text.slice(0,180));
 }
 // Track locations before asynchronous website lookups; preserve a snapshot for stale-document checks.
 if(jobs.length>200)limited=true;
 const selected=jobs.slice(0,200);for(const j of selected)ctx.trackedObjects.add(j.range);await ctx.sync();
 try{
 const urls=[...new Set(selected.filter(j=>j.url).map(j=>j.url))];let completed=0;
 const imported=await boundedMap(urls,3,async url=>{try{const job={url};const response=await fetch('/api/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:job.url})});const data=await response.json();if(!response.ok)throw Error(data.error);if(data.requiresReview&&!reviewOnly){const error=Error(data.warnings.join(' '));error.partial=data;throw error;}if(data.source.type==='web'&&(!data.source.title||!data.source.site||data.provenance?.site?.includes('hostname'))){const error=Error('Source details are incomplete. Import this source and fill the missing fields.');error.partial=data;throw error;}if(['book','article'].includes(data.source.type)&&!data.source.url)data.source.url=job.url;let citation;try{citation=formatCitation({...data.source,citationStyle,emphasis,reviewDate});}catch(error){error.partial=data;throw error;}citation.importedSource=data.source;citation.warnings.unshift(...(data.warnings||[]).filter(w=>!citation.warnings.includes(w)));if(data.requiresReview)citation.requiresConfirmation=true;return citation;}finally{report(`Imported ${++completed} of ${urls.length} unique sources…`);}});
 urls.forEach((url,i)=>cache.set(url,imported[i]));
 const claimed=[];
 for(const job of selected.filter(j=>j.url)){
 try{const imported=cache.get(job.url);if(imported.error)throw imported.error;let citation=imported.value;
 const plan=planLinkedCitation(job.paragraphText,job.text,citation.importedSource);if(plan.kind==='ambiguous')throw Error(plan.reason);
 if(plan.kind==='existing'){
 if(selected.some(other=>other!==job&&other.url&&other.url!==job.url&&other.block===job.block&&plan.text.includes(other.text)))throw Error('Multiple links belong to this citation. Review the complete reference; no link was removed.');
 if(claimed.some(c=>c.block===job.block&&c.text===plan.text)){job.skip=true;continue;}
 citation=linkedCitationDraft(plan,citation,{citationStyle,emphasis,reviewDate},job.url);
 const beginning=job.block.search(plan.text.slice(0,100),{matchCase:true,matchWildcards:false}),ending=job.block.search(plan.text.slice(-100),{matchCase:true,matchWildcards:false});beginning.load('items');ending.load('items');await ctx.sync();if(beginning.items.length!==1||ending.items.length!==1)throw Error('Could not isolate the complete citation. Select it and run a new review.');
 const complete=beginning.items[0].expandTo(ending.items[0]);complete.load('text');await ctx.sync();if(complete.text!==plan.text)throw Error('The existing citation changed. Run a new review.');ctx.trackedObjects.add(complete);ctx.trackedObjects.remove(job.range);job.range=complete;job.text=plan.text;job.hyperlink=undefined;job.existingCitation=true;claimed.push({block:job.block,text:plan.text});for(const other of selected)if(other!==job&&!other.url&&other.block===job.block&&plan.text.includes(other.text))other.skip=true;
 }

 job.citation=citation;
 }catch(error){job.planningError=error;}
 }
 for(let i=0;i<selected.length;i++){const job=selected[i];if(job.skip)continue;report(`Reviewing item ${i+1} of ${selected.length}…`);
 try{if(job.planningError)throw job.planningError;let citation=job.citation;
 if(citation.requiresConfirmation&&!reviewOnly)throw Error('Existing citation and linked source details differ or need confirmation. Use Review suggestions to check the complete reference before replacing it.');
 job.range.load(job.hyperlink?'text,hyperlink':'text');await ctx.sync();
 if(job.range.text!==job.text||(job.hyperlink&&job.range.hyperlink!==job.hyperlink))throw Error('Text or hyperlink changed during processing.');
 if(reviewOnly){suggestions.push({range:job.range,story:job.story,locator:job.locator,original:job.text,snapshot:job.text,hyperlink:job.hyperlink,citation,requiresConfirmation:!!citation.requiresConfirmation,message:job.existingCitation?'Review the complete existing citation against linked source metadata.':job.url?'Replace this bare URL or hyperlink with a citation draft.':'Check existing citation formatting. Source accuracy is not independently verified without linked metadata.'});continue;}
 const replacement=await replaceCitation(job.range,citation,ctx,job.story);await ctx.sync();fixed++;if(!replacement.smallCapsSupported&&citation.parts.some(p=>p.style==='smallcaps'))details.push('Citation text was replaced in a note. Small caps need manual review on this Word version; italics and underline were applied.');
 }catch(e){failures.push({url:job.url,text:job.text,error:e.message,partial:e.partial});note((job.url||job.text.slice(0,100))+': '+(e.message||'Could not replace this item.'));}
 }}finally{for(const j of selected)if(!suggestions.some(s=>s.range===j.range))ctx.trackedObjects.remove(j.range);await ctx.sync();}
 });
 if(limited)details.push('Only the first 200 replacement candidates were processed.');
 return {fixed,unresolved,details,suggestions,failures};
}
