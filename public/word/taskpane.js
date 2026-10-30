import {reviewText,citationHTML} from './review.js';
import {schemas,formatCitation} from '/formatter.js';
import {recognizeCitation} from '/recognition.js';
const $=id=>document.getElementById(id);let entries=[],preview=null,busy=false;
const status=text=>{$('status').textContent=text;};
async function guarded(fn){if(busy)return;busy=true;try{await fn();}catch(e){status(e.message||'Word could not complete the operation.');}finally{busy=false;}}
async function release(){if(!entries.length)return;await Word.run(entries.map(e=>e.range),async ctx=>{for(const e of entries)ctx.trackedObjects.remove(e.range);await ctx.sync();});entries=[];}
$('scan').onclick=()=>guarded(async()=>{
 await release();$('results').replaceChildren();let notes='';let checked=0;
 await Word.run(async ctx=>{
 const ranges=[];
 if($('scope').value==='selection'){const r=ctx.document.getSelection();r.load('text');ranges.push(r);await ctx.sync();}
 else{
 const paragraphs=ctx.document.body.paragraphs;paragraphs.load('items/text');await ctx.sync();for(const p of paragraphs.items)ranges.push(p.getRange('Content'));
 if(Office.context.requirements.isSetSupported('WordApi','1.5')){
 const footnotes=ctx.document.body.footnotes,endnotes=ctx.document.body.endnotes;footnotes.load('items');endnotes.load('items');await ctx.sync();
 const collections=[...footnotes.items,...endnotes.items].map(n=>n.body.paragraphs);for(const c of collections)c.load('items/text');await ctx.sync();for(const c of collections)for(const p of c.items)ranges.push(p.getRange('Content'));
 }else notes=' Footnotes and endnotes were not scanned: this Word version does not support the required API.';
 for(const r of ranges)r.load('text');await ctx.sync();
 }
 checked=ranges.length;let truncated=false;
 for(const range of ranges){const review=reviewText(range.text);if(review){if(entries.length>=200){truncated=true;continue;}ctx.trackedObjects.add(range);entries.push({...review,range,snapshot:range.text});}}
 await ctx.sync();status(`Checked ${checked} text blocks. ${entries.length} items to review.${truncated?' Showing the first 200 review items.':''}${notes}`);
 });
 for(const entry of entries)showReview(entry);
});
function showReview(entry){const card=document.createElement('article');const original=document.createElement('p');original.textContent=entry.original;card.append(original);const msg=document.createElement('p');msg.textContent=entry.message;card.append(msg);
 if(entry.citation){const suggestion=document.createElement('div');suggestion.innerHTML=citationHTML(entry.citation);card.append(suggestion);const warnings=document.createElement('p');warnings.textContent=entry.citation.warnings.join(' ');card.append(warnings);
 const edit=document.createElement('textarea');edit.value=entry.citation.text;edit.setAttribute('aria-label','Edit suggested citation');card.append(edit);
 const apply=document.createElement('button');apply.textContent='Apply';apply.onclick=()=>guarded(async()=>{const citation=edit.value===entry.citation.text?entry.citation:formatCitation(recognizeCitation(edit.value));await Word.run([entry.range],async ctx=>{entry.range.load('text');await ctx.sync();if(entry.range.text!==entry.snapshot)throw Error('This text changed since checking. Scan again before applying.');entry.range.insertHtml(citationHTML(citation),'Replace');await ctx.sync();});apply.disabled=true;edit.disabled=true;status('Correction applied. Use Word Undo to reverse it.');});card.append(apply);}
 const skip=document.createElement('button');skip.textContent='Skip';skip.onclick=()=>card.remove();card.append(skip);$('results').append(card);
}
for(const type of Object.keys(schemas)){const option=document.createElement('option');option.value=type;option.textContent=type;$('type').append(option);}
function fields(source={}){$('fields').replaceChildren();preview=null;$('insert').disabled=true;$('preview').replaceChildren();for(const key of schemas[$('type').value]){const label=document.createElement('label');label.textContent=key;const input=document.createElement('input');input.name=key;input.value=source[key]||'';label.append(input);$('fields').append(label);}}
$('type').onchange=()=>fields();
$('details').oninput=()=>{preview=null;$('insert').disabled=true;};
$('url-form').onsubmit=e=>{e.preventDefault();guarded(async()=>{status('Reading source metadata…');const response=await fetch('/api/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:$('url').value})});const data=await response.json();if(!response.ok)throw Error(data.error);$('type').value=data.source.type;fields(data.source);$('details').hidden=false;status('Review the imported fields, add missing details, then preview.');});};
$('details').onsubmit=e=>{e.preventDefault();guarded(async()=>{preview=formatCitation({type:$('type').value,...Object.fromEntries(new FormData($('details')))});$('preview').innerHTML=citationHTML(preview);const p=document.createElement('p');p.textContent=preview.warnings.join(' ');$('preview').append(p);$('insert').disabled=false;status('Review the draft, then place your cursor in Word and insert.');});};
$('insert').onclick=()=>guarded(async()=>{if(!preview)throw Error('Preview the citation first.');await Word.run(async ctx=>{const range=ctx.document.getSelection();range.load('text');await ctx.sync();if(range.text.trim())throw Error('Place the cursor at an insertion point. Clear the selection to avoid replacing existing text.');range.insertHtml(citationHTML(preview),'Replace');await ctx.sync();});status('Citation inserted.');});
if(typeof Office==='undefined')status('Open this sidebar from the Bluebookr add-in in Microsoft Word.');
else Office.onReady(info=>{if(info.host!==Office.HostType.Word){status('Open this add-in in Microsoft Word.');return;}$('tools').hidden=false;status('Ready. Choose selected text or whole document.');});
