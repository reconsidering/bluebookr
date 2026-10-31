import {replaceCitation} from './replacement.js';
import {repeatedSources,supraCitation} from './supra.js';
import {automaticFix} from './automatic.js';
import {reviewText,citationHTML,citationChanges,goToCitation} from './review.js';
import {schemas,formatCitation,reviewDateISO} from '/formatter.js';
import {recognizeCitation} from '/recognition.js';
const demoMode=new URLSearchParams(location.search).get('preview')==='1';
const $=id=>document.getElementById(id);let entries=[],preview=null,busy=false;
const preferences=()=>({reviewDate:reviewDateISO(),citationStyle:$('citation-style').value,emphasis:$('emphasis').value});
const status=text=>{$('status').textContent=text;};
async function guarded(fn){if(busy)return;busy=true;try{await fn();}catch(e){status(e.message||'Word could not complete the operation.');}finally{busy=false;}}
async function release(){if(!entries.length)return;await Word.run(entries.map(e=>e.range),async ctx=>{for(const e of entries)ctx.trackedObjects.remove(e.range);await ctx.sync();});entries=[];}
$('scan').onclick=()=>guarded(async()=>{
 if(demoMode){$('results').replaceChildren();const samples=$('scope').value==='selection'?['Brown v. Board of Education, 347 U.S. 483 (1954).']:['Brown v. Board of Education, 347 U.S. 483 (1954).','42 U.S.C. § 1983.','Jane Smith, Legal Reasoning 12 (2024).','Jane Smith, Legal Reasoning 45 (2024).','See id. at 495.'];const demoEntries=samples.map(text=>reviewText(text,preferences()));showSupraGroups(demoEntries);for(const entry of demoEntries)showReview(entry);status('Preview: showing sample citations. No Word document is connected.');return;}
 await release();$('results').replaceChildren();
 const result=await automaticFix($('scope').value,status,{reviewOnly:true,...preferences()});entries=result.suggestions;
 showSupraGroups(entries);for(const entry of entries)showReview(entry);
 for(const failure of result.failures||[])showRecovery(failure);
 for(const detail of result.details){const p=document.createElement('p');p.textContent=detail;$('results').append(p);}
 status(`${entries.length} individual corrections ready. ${result.unresolved} items need manual review. Nothing has been replaced.`);
});
function showReview(entry){const card=document.createElement('article');const original=document.createElement('p');original.textContent=entry.original;card.append(original);const msg=document.createElement('p');msg.textContent=entry.message;card.append(msg);
 const locate=document.createElement('button');locate.textContent='Go to citation';locate.onclick=()=>guarded(async()=>{if(demoMode){status('Preview: Word would select this citation and scroll it into view.');return;}await goToCitation(entry);status('Citation selected in Word.');});card.append(locate);
 if(entry.citation){const suggestion=document.createElement('div');suggestion.innerHTML=citationHTML(entry.citation);card.append(suggestion);const warnings=document.createElement('p');warnings.textContent=entry.citation.warnings.join(' ');card.append(warnings);
 const markup=document.createElement('div');markup.className='citation-markup';markup.setAttribute('aria-label','Marked-up citation changes');card.append(markup);
 const legend=document.createElement('p');legend.textContent='Changes: strikethrough = removed; underline = added. Final citation typography appears above. This comparison shows text changes, not existing Word formatting.';card.append(legend);
 const edit=document.createElement('textarea');edit.value=entry.citation.text;edit.setAttribute('aria-label','Edit suggested citation');card.append(edit);
 const updateMarkup=()=>{markup.replaceChildren();for(const part of citationChanges(entry.original,edit.value)){const span=document.createElement(part.kind==='delete'?'del':part.kind==='insert'?'ins':'span');span.textContent=part.text;markup.append(span);}if(edit.value===entry.original){const note=document.createElement('p');note.textContent='No text changes. Review proposed italics and small caps above.';markup.append(note);}};edit.addEventListener('input',updateMarkup);updateMarkup();
 const apply=document.createElement('button');apply.textContent='Apply / Replace';if(entry.requiresConfirmation){const label=document.createElement('label');const confirm=document.createElement('input');confirm.type='checkbox';confirm.style.width='auto';label.append(confirm,document.createTextNode(' I checked the source details and accessed the cited version.'));card.append(label);apply.disabled=true;confirm.onchange=()=>{apply.disabled=!confirm.checked;};}apply.onclick=()=>guarded(async()=>{const citation=edit.value===entry.citation.text?entry.citation:formatCitation({...recognizeCitation(edit.value),...preferences()});if(demoMode){suggestion.innerHTML=citationHTML(citation);apply.disabled=true;status('Preview: correction accepted in this sample only. No document was changed.');return;}let noteFormattingWarning='';await Word.run([entry.range],async ctx=>{entry.range.load(entry.hyperlink?'text,hyperlink':'text');await ctx.sync();if(entry.range.text!==entry.snapshot||(entry.hyperlink&&entry.range.hyperlink!==entry.hyperlink))throw Error('This text changed since checking. Scan again before applying.');const replacement=await replaceCitation(entry.range,citation,ctx,entry.story);await ctx.sync();if(!replacement.smallCapsSupported&&citation.parts.some(p=>p.style==='smallcaps'))noteFormattingWarning=' Small caps need manual review on this Word version.';});apply.disabled=true;edit.disabled=true;locate.disabled=true;status('Correction applied. Use Word Undo to reverse it.'+noteFormattingWarning);});card.append(apply);}
 const skip=document.createElement('button');skip.textContent='Skip';skip.onclick=()=>card.remove();card.append(skip);$('results').append(card);
}
for(const type of Object.keys(schemas)){const option=document.createElement('option');option.value=type;option.textContent=type;$('type').append(option);}
function fields(source={}){$('fields').replaceChildren();preview=null;$('insert').disabled=true;$('preview').replaceChildren();for(const key of schemas[$('type').value]){const label=document.createElement('label');label.textContent=key;const input=document.createElement('input');input.name=key;input.value=source[key]||'';label.append(input);$('fields').append(label);}}
$('type').onchange=()=>fields();
$('details').oninput=()=>{preview=null;$('insert').disabled=true;};
$('url-form').onsubmit=e=>{e.preventDefault();guarded(async()=>{status('Reading source metadata…');const response=await fetch('/api/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:$('url').value})});const data=await response.json();if(!response.ok)throw Error(data.error);$('type').value=data.source.type;fields(data.source);$('details').hidden=false;status('Review the imported fields, add missing details, then preview. '+(data.warnings||[]).join(' '));});};
$('details').onsubmit=e=>{e.preventDefault();guarded(async()=>{preview=formatCitation({...preferences(),type:$('type').value,...Object.fromEntries(new FormData($('details')))});$('preview').innerHTML=citationHTML(preview);const p=document.createElement('p');p.textContent=preview.warnings.join(' ');$('preview').append(p);$('insert').disabled=false;status('Review the draft, then place your cursor in Word and insert.');});};
$('insert').onclick=()=>guarded(async()=>{if(!preview)throw Error('Preview the citation first.');if(demoMode){status('Preview: this citation would be inserted at your cursor in Word.');return;}await Word.run(async ctx=>{const range=ctx.document.getSelection();range.load('text');await ctx.sync();if(range.text.trim())throw Error('Place the cursor at an insertion point. Clear the selection to avoid replacing existing text.');range.insertHtml(citationHTML(preview),'Replace');await ctx.sync();});status('Citation inserted.');});
if(demoMode){$('tools').hidden=false;status('Interactive preview — sample document only. Try both checking modes, or import a real URL.');}
else if(typeof Office==='undefined')status('Open this sidebar from the Bluebookr add-in in Microsoft Word.');
else Office.onReady(info=>{if(info.host!==Office.HostType.Word){status('Open this add-in in Microsoft Word.');return;}$('tools').hidden=false;status('Ready. Choose selected text or whole document.');});

$('auto-fix').onclick=()=>guarded(async()=>{
 if(demoMode){$('results').replaceChildren();const card=document.createElement('article');card.textContent='Sample result: Brown v. Board of Education, 347 U.S. 483 (1954). Citation typography applied. In Word, this action also replaces resolvable URLs and hyperlink text directly in the chosen scope.';$('results').append(card);status('Simulation only — no document was changed or read.');return;}
 await release();$('results').replaceChildren();status('Finding citations and links…');
 const result=await automaticFix($('scope').value,status,preferences());
 status(`Applied ${result.fixed} replacements. ${result.unresolved} items need review. Changes are drafts; use Word Undo to reverse them.`);
 for(const failure of result.failures||[])showRecovery(failure);
 for(const detail of result.details){const p=document.createElement('p');p.textContent=detail;$('results').append(p);}
});

function showSupraGroups(items){
 for(const group of repeatedSources(items)){
 const card=document.createElement('article');const heading=document.createElement('h3');heading.textContent='Repeated source: '+group.source.title;card.append(heading);
 const explanation=document.createElement('p');explanation.textContent='Keep the first full citation. Confirm its actual footnote number to prepare supra replacements for later matches. Exact author/title/edition details must match. Cases and statutes are excluded.';card.append(explanation);
 const field=(text,value='')=>{const label=document.createElement('label');label.textContent=text;const input=document.createElement('input');input.value=value;label.append(input);card.append(label);return input;};
 const note=field('First full citation’s footnote number');note.inputMode='numeric';
 const author=field('Short author name',group.source.author);
 const button=document.createElement('button');button.textContent='Prepare supra replacements';button.onclick=()=>guarded(async()=>{
 // Prepare first, so invalid input cannot partially alter suggestions.
 const replacements=group.items.slice(1).map(item=>({entry:item.entry,citation:supraCitation({...preferences(),author:author.value,note:note.value,pinpoint:item.source.pinpoint,style:group.source.type==='book'?'smallcaps':'normal'})}));
 for(const replacement of replacements){replacement.entry.citation=replacement.citation;replacement.entry.message='Proposed supra short form. Verify the first-reference note number.';}
 $('results').replaceChildren();for(const entry of items)showReview(entry);status('Supra suggestions prepared. Review markup, then Apply / Replace each occurrence. The first full citation is retained.');
 });card.append(button);$('results').append(card);
 }
}

for(const id of ['citation-style','emphasis'])$(id).onchange=()=>guarded(async()=>{if(!demoMode)await release();$('results').replaceChildren();preview=null;$('insert').disabled=true;$('preview').replaceChildren();status('Preferences changed. Run Review suggestions again or preview your citation.');});

try{const saved=JSON.parse(localStorage.getItem('bluebookr-preferences')||'{}');for(const id of ['citation-style','emphasis']){if([...$(id).options].some(o=>o.value===saved[id]))$(id).value=saved[id];$(id).addEventListener('change',()=>{try{localStorage.setItem('bluebookr-preferences',JSON.stringify({'citation-style':$('citation-style').value,emphasis:$('emphasis').value}));}catch{}});}}catch{}

async function lookupPermalink(url){const response=await fetch('/api/permalink',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});const result=await response.json();if(!response.ok)throw Error(result.error);return result;}
$('permalink').onclick=()=>guarded(async()=>{status('Looking for an existing archive or DOI…');const result=await lookupPermalink($('url').value);$('url').value=result.url;status('Using '+result.kind+': '+result.url+'. Import it to review citation details.');});
$('replace-link').onclick=()=>guarded(async()=>{
 if(demoMode){status('In Word, select a bare URL or a single hyperlink, then use this action to replace its address with an existing archive or DOI.');return;}
 await Word.run(async ctx=>{const range=ctx.document.getSelection();range.load('text,hyperlink');await ctx.sync();const originalText=range.text,originalLink=range.hyperlink;const address=originalLink||originalText.trim();if(!/^https?:\/\/\S+$/.test(address))throw Error('Select one complete URL or one hyperlink first.');ctx.trackedObjects.add(range);await ctx.sync();
 try{status('Looking up a permalink…');const result=await lookupPermalink(address);range.load('text,hyperlink');await ctx.sync();if(range.text!==originalText||range.hyperlink!==originalLink)throw Error('The selection changed. Select the link and try again.');if(originalLink)range.hyperlink=result.url;else range.insertText(result.url,'Replace');await ctx.sync();status('Link replaced with '+result.kind+': '+result.url+'. Use Word Undo to reverse it.');}finally{ctx.trackedObjects.remove(range);await ctx.sync();}
 });
});

$('import-copy').onclick=()=>guarded(async()=>{const response=await fetch('/api/import-copy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:$('url').value,text:$('source-copy').value})});const data=await response.json();if(!response.ok)throw Error(data.error);$('type').value=data.source.type;fields(data.source);$('details').hidden=false;status(data.warnings.join(' '));});

function showRecovery(failure){
 if(!failure.url)return;const card=document.createElement('article');const heading=document.createElement('strong');heading.textContent='Source needs additional details';card.append(heading);const link=document.createElement('a');link.href=failure.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Open original source in browser';card.append(document.createElement('br'),link);const reason=document.createElement('p');reason.textContent=failure.error;card.append(reason);
 const recover=document.createElement('button');recover.textContent='Complete details / paste a copy';recover.onclick=()=>{$('url').value=failure.url;const source=failure.partial?.source;if(source){$('type').value=source.type;fields(source);$('details').hidden=false;}$('url').scrollIntoView({behavior:'smooth'});$('source-copy').closest('details').open=true;$('source-copy').focus();status('Open the source in your browser, then paste its details or complete the source fields.');};card.append(recover);$('results').append(card);
}
