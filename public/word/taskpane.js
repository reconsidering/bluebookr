import {automaticFix} from './automatic.js';
import {reviewText,citationHTML} from './review.js';
import {schemas,formatCitation} from '/formatter.js';
import {recognizeCitation} from '/recognition.js';
const demoMode=new URLSearchParams(location.search).get('preview')==='1';
const $=id=>document.getElementById(id);let entries=[],preview=null,busy=false;
const status=text=>{$('status').textContent=text;};
async function guarded(fn){if(busy)return;busy=true;try{await fn();}catch(e){status(e.message||'Word could not complete the operation.');}finally{busy=false;}}
async function release(){if(!entries.length)return;await Word.run(entries.map(e=>e.range),async ctx=>{for(const e of entries)ctx.trackedObjects.remove(e.range);await ctx.sync();});entries=[];}
$('scan').onclick=()=>guarded(async()=>{
 if(demoMode){$('results').replaceChildren();const samples=$('scope').value==='selection'?['Brown v. Board of Education, 347 U.S. 483 (1954).']:['Brown v. Board of Education, 347 U.S. 483 (1954).','42 U.S.C. § 1983.','See id. at 495.'];for(const sample of samples)showReview(reviewText(sample));status('Preview: showing sample citations. No Word document is connected.');return;}
 await release();$('results').replaceChildren();
 const result=await automaticFix($('scope').value,status,{reviewOnly:true});entries=result.suggestions;
 for(const entry of entries)showReview(entry);
 for(const detail of result.details){const p=document.createElement('p');p.textContent=detail;$('results').append(p);}
 status(`${entries.length} individual corrections ready. ${result.unresolved} items need manual review. Nothing has been replaced.`);
});
function showReview(entry){const card=document.createElement('article');const original=document.createElement('p');original.textContent=entry.original;card.append(original);const msg=document.createElement('p');msg.textContent=entry.message;card.append(msg);
 if(entry.citation){const suggestion=document.createElement('div');suggestion.innerHTML=citationHTML(entry.citation);card.append(suggestion);const warnings=document.createElement('p');warnings.textContent=entry.citation.warnings.join(' ');card.append(warnings);
 const edit=document.createElement('textarea');edit.value=entry.citation.text;edit.setAttribute('aria-label','Edit suggested citation');card.append(edit);
 const apply=document.createElement('button');apply.textContent='Apply / Replace';apply.onclick=()=>guarded(async()=>{const citation=edit.value===entry.citation.text?entry.citation:formatCitation(recognizeCitation(edit.value));if(demoMode){suggestion.innerHTML=citationHTML(citation);apply.disabled=true;status('Preview: correction accepted in this sample only. No document was changed.');return;}await Word.run([entry.range],async ctx=>{entry.range.load(entry.hyperlink?'text,hyperlink':'text');await ctx.sync();if(entry.range.text!==entry.snapshot||(entry.hyperlink&&entry.range.hyperlink!==entry.hyperlink))throw Error('This text changed since checking. Scan again before applying.');entry.range.insertHtml(citationHTML(citation),'Replace');await ctx.sync();});apply.disabled=true;edit.disabled=true;status('Correction applied. Use Word Undo to reverse it.');});card.append(apply);}
 const skip=document.createElement('button');skip.textContent='Skip';skip.onclick=()=>card.remove();card.append(skip);$('results').append(card);
}
for(const type of Object.keys(schemas)){const option=document.createElement('option');option.value=type;option.textContent=type;$('type').append(option);}
function fields(source={}){$('fields').replaceChildren();preview=null;$('insert').disabled=true;$('preview').replaceChildren();for(const key of schemas[$('type').value]){const label=document.createElement('label');label.textContent=key;const input=document.createElement('input');input.name=key;input.value=source[key]||'';label.append(input);$('fields').append(label);}}
$('type').onchange=()=>fields();
$('details').oninput=()=>{preview=null;$('insert').disabled=true;};
$('url-form').onsubmit=e=>{e.preventDefault();guarded(async()=>{status('Reading source metadata…');const response=await fetch('/api/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:$('url').value})});const data=await response.json();if(!response.ok)throw Error(data.error);$('type').value=data.source.type;fields(data.source);$('details').hidden=false;status('Review the imported fields, add missing details, then preview.');});};
$('details').onsubmit=e=>{e.preventDefault();guarded(async()=>{preview=formatCitation({type:$('type').value,...Object.fromEntries(new FormData($('details')))});$('preview').innerHTML=citationHTML(preview);const p=document.createElement('p');p.textContent=preview.warnings.join(' ');$('preview').append(p);$('insert').disabled=false;status('Review the draft, then place your cursor in Word and insert.');});};
$('insert').onclick=()=>guarded(async()=>{if(!preview)throw Error('Preview the citation first.');if(demoMode){status('Preview: this citation would be inserted at your cursor in Word.');return;}await Word.run(async ctx=>{const range=ctx.document.getSelection();range.load('text');await ctx.sync();if(range.text.trim())throw Error('Place the cursor at an insertion point. Clear the selection to avoid replacing existing text.');range.insertHtml(citationHTML(preview),'Replace');await ctx.sync();});status('Citation inserted.');});
if(demoMode){$('tools').hidden=false;status('Interactive preview — sample document only. Try both checking modes, or import a real URL.');}
else if(typeof Office==='undefined')status('Open this sidebar from the Bluebookr add-in in Microsoft Word.');
else Office.onReady(info=>{if(info.host!==Office.HostType.Word){status('Open this add-in in Microsoft Word.');return;}$('tools').hidden=false;status('Ready. Choose selected text or whole document.');});

$('auto-fix').onclick=()=>guarded(async()=>{
 if(demoMode){$('results').replaceChildren();const card=document.createElement('article');card.textContent='Sample result: Brown v. Board of Education, 347 U.S. 483 (1954). Citation typography applied. In Word, this action also replaces resolvable URLs and hyperlink text directly in the chosen scope.';$('results').append(card);status('Simulation only — no document was changed or read.');return;}
 await release();$('results').replaceChildren();status('Finding citations and links…');
 const result=await automaticFix($('scope').value,status);
 status(`Applied ${result.fixed} replacements. ${result.unresolved} items need review. Changes are drafts; use Word Undo to reverse them.`);
 for(const detail of result.details){const p=document.createElement('p');p.textContent=detail;$('results').append(p);}
});
