import {citationHTML} from './review.js';
// Keep note edits in their own story using native text and font operations,
// retaining the note's reference marker and paragraph.
export async function replaceCitation(range,citation,context,story='unknown'){
 story=String(story).toLowerCase();
 if(story==='unknown'&&range.parentBody){range.parentBody.load('type');await context.sync();story=String(range.parentBody.type||'').toLowerCase();}
 const isNote=/footnote|endnote/.test(story);
 if(!isNote){range.insertHtml(citationHTML(citation),'Replace');return {native:false,smallCapsSupported:true};}
 const smallCapsSupported=Office.context.requirements.isSetSupported('WordApiDesktop','1.3');
 let tail;for(const part of citation.parts){if(!part.text)continue;const inserted=(tail||range).insertText(part.text,tail?'After':'Replace');inserted.font.italic=part.style==='italic';inserted.font.underline=part.style==='underline'?'Single':'None';inserted.font.superscript=false;if(smallCapsSupported)inserted.font.smallCaps=part.style==='smallcaps';tail=inserted;}
 return {native:true,smallCapsSupported};
}
