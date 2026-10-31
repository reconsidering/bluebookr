export async function resolveCitation(context,entry){
 const locator=entry.locator;if(!locator)return {range:entry.range};
 let body=context.document.body,note;
 if(locator.story==='footnote'||locator.story==='endnote'){
 const notes=locator.story==='footnote'?body.footnotes:body.endnotes;notes.load('items');await context.sync();
 if(notes.items.length!==locator.noteCount||!notes.items[locator.noteIndex])throw Error('The document notes changed. Run a fresh review before continuing.');
 note=notes.items[locator.noteIndex];body=note.body;
 }
 const paragraphs=body.paragraphs;paragraphs.load('items');await context.sync();const paragraph=paragraphs.items[locator.paragraphIndex];if(!paragraph)throw Error('This paragraph no longer exists. Run a fresh review.');
 const whole=paragraph.getRange('Content');whole.load('text');await context.sync();if(whole.text!==locator.paragraphSnapshot)throw Error('This paragraph changed since review. Run a fresh review to avoid changing the wrong text.');
 let range=whole;if(whole.text!==entry.snapshot){const start=whole.search(entry.snapshot.slice(0,100),{matchCase:true,matchWildcards:false}),end=whole.search(entry.snapshot.slice(-100),{matchCase:true,matchWildcards:false});start.load('items');end.load('items');await context.sync();if(start.items.length!==1||end.items.length!==1)throw Error('The citation location is ambiguous. Select that citation and run a new review.');range=start.items[0].expandTo(end.items[0]);}
 range.load(entry.hyperlink?'text,hyperlink':'text');await context.sync();if(range.text!==entry.snapshot||(entry.hyperlink&&range.hyperlink!==entry.hyperlink))throw Error('The citation text or link changed. Run a fresh review.');
 return {range,note,whole,paragraph};
}
export async function withCitation(entry,action,run=Word.run){
 if(entry.locator)return run(async context=>action(context,await resolveCitation(context,entry)));
 return run([entry.range],async context=>action(context,{range:entry.range}));
}
export function actionError(error){return [error.code,error.message,error.debugInfo?.errorLocation].filter(Boolean).join(' — ')||'Word could not complete the action.';}
