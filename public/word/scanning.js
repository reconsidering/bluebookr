export async function scanBlocks(context,scope){
 const blocks=[],coverage={bodyParagraphs:0,footnotes:0,endnotes:0,notesSupported:true};
 const addParagraphs=async(body,story)=>{const paragraphs=body.paragraphs;paragraphs.load('items');await context.sync();for(const p of paragraphs.items)blocks.push({range:p.getRange('Content'),story});return paragraphs.items.length;};
 if(scope==='selection'){const range=context.document.getSelection();range.load('text');if(range.parentBody)range.parentBody.load('type');await context.sync();if(!range.text.trim())throw Error('Select citation text first, or choose a document scope.');blocks.push({range,story:String(range.parentBody?.type||'unknown').toLowerCase()});}
 else{
 if(scope!=='notes')coverage.bodyParagraphs=await addParagraphs(context.document.body,'body');
 coverage.notesSupported=Office.context.requirements.isSetSupported('WordApi','1.5');
 if(coverage.notesSupported){const footnotes=context.document.body.footnotes,endnotes=context.document.body.endnotes;footnotes.load('items');endnotes.load('items');await context.sync();coverage.footnotes=footnotes.items.length;coverage.endnotes=endnotes.items.length;for(const note of footnotes.items)await addParagraphs(note.body,'footnote');for(const note of endnotes.items)await addParagraphs(note.body,'endnote');}
 else if(scope==='notes')throw Error('This Word version cannot enumerate footnotes/endnotes (WordApi 1.5 required). Select text inside a footnote and review that selection instead.');
 }
 for(const block of blocks)block.range.load('text');await context.sync();return {blocks,coverage};
}
