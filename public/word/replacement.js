import {citationHTML} from './review.js';
const inheritedProperties=['name','size','bold','color','highlightColor','strikeThrough','subscript','superscript'];
const mixed=font=>!font.name||!font.color||font.highlightColor===''||!Number.isFinite(font.size)||font.size<=0||['bold','strikeThrough','subscript','superscript'].some(k=>typeof font[k]!=='boolean');
export async function originalFont(range,context){
 range.font.load(inheritedProperties.join(','));await context.sync();let font=range.font;
 // Mixed formatting has no single family/size. Use the first cited character,
 // not the adjacent footnote marker or paragraph insertion-point formatting.
 if(mixed(font)){range.load('text');await context.sync();const character=Array.from(range.text).find(c=>!/\s/.test(c)&&c.charCodeAt(0)>8);if(!character)throw Error('Select the citation text so its formatting can be read.');const first=range.search(character,{matchCase:true,matchWildcards:false}).getFirst();first.font.load(inheritedProperties.join(','));await context.sync();font=first.font;}
 if(!font.name||!Number.isFinite(font.size)||font.size<=0)throw Error('Word could not determine the original font and size. Select the citation alone and try again.');
 return Object.fromEntries(inheritedProperties.filter(k=>font[k]!==undefined&&(font[k]!==null||k==='highlightColor')).map(k=>[k,font[k]]));
}
function inheritFont(target,base){for(const [key,value] of Object.entries(base))target[key]=value;}
// Keep note edits in their story and preserve the document's own font formatting.
// Citation emphasis is deliberately excluded from the inherited base.
export async function replaceCitation(range,citation,context,story='unknown'){
 story=String(story).toLowerCase();
 const base=await originalFont(range,context);
 if(story==='unknown'&&range.parentBody){range.parentBody.load('type');await context.sync();story=String(range.parentBody.type||'').toLowerCase();}
 const isNote=/footnote|endnote/.test(story);
 if(!isNote){const inserted=range.insertHtml(citationHTML(citation),'Replace');inheritFont(inserted.font,base);return {native:false,smallCapsSupported:true,range:inserted};}
 const smallCapsSupported=Office.context.requirements.isSetSupported('WordApiDesktop','1.3');
 let tail,first;for(const part of citation.parts){if(!part.text)continue;const inserted=(tail||range).insertText(part.text,tail?'After':'Replace');first??=inserted;inheritFont(inserted.font,base);inserted.font.italic=part.style==='italic';inserted.font.underline=part.style==='underline'?'Single':'None';if(smallCapsSupported)inserted.font.smallCaps=part.style==='smallcaps';tail=inserted;}
 return {native:true,smallCapsSupported,range:first===tail?first:first.expandTo(tail)};
}
