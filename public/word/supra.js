import {recognizeCitation} from '../../recognition.js';
const normalize=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
function sourceFor(entry){let parsed;try{parsed=recognizeCitation(entry.original);}catch{}const source=entry.supraOriginalSource||entry.citation?.importedSource||parsed;if(!source||!['book','article'].includes(source.type))return null;return {...source,signal:parsed?.signal||source.signal,pinpoint:parsed?.pinpoint||source.pinpoint,url:parsed?.url||source.url};}
function order(a,b){const x=a.entry.locator,y=b.entry.locator;if(x&&y&&x.story===y.story&&['footnote','endnote'].includes(x.story))return x.noteIndex-y.noteIndex||x.paragraphIndex-y.paragraphIndex;return a.index-b.index;}
export function repeatedSources(entries){
 const groups=new Map(),works=new Map();
 entries.forEach((entry,index)=>{const source=sourceFor(entry);if(!source)return;
 const keys=source.type==='book'?['type','author','title','edition','year']:['type','author','title','volume','journal','page','year'];
 // Separate note stories: collection order across main body, footnotes and endnotes is not citation order.
 const story=entry.locator?.story||entry.story||'unlocated';if(['body','maindoc'].includes(story)||(['footnote','endnote'].includes(story)&&!entry.locator))return;const key=story+':'+JSON.stringify(keys.map(k=>normalize(source[k])));
 if(!groups.has(key))groups.set(key,{key,source,items:[],story});groups.get(key).items.push({entry,source,index});
 const author=normalize(source.author);if(!works.has(author))works.set(author,new Set());works.get(author).add(JSON.stringify(['type','title','edition','year'].map(k=>normalize(source[k]))));
 });
 const result=[];for(const group of groups.values()){
 group.items.sort(order);group.first=group.items[0];const first=group.first.entry.locator;
 group.targets=group.items.slice(1).filter(item=>!first||!['footnote','endnote'].includes(first.story)||!item.entry.locator||item.entry.locator.noteIndex>first.noteIndex);
 group.requiresTitle=works.get(normalize(group.source.author)).size>1;
 group.prepared=group.targets.length>0&&group.targets.every(item=>item.entry.citation?.kind==='supra');
 if(group.targets.length)result.push(group);
 }
 return result;
}
export function shortAuthor(author){
 if(/\b(?:association|institute|university|department|society|committee|center|centre|commission|bureau)\b/i.test(author))return author;
 return author.split(/\s+(?:&|and)\s+/i).map(name=>{const etal=/\s+et al\.$/i.test(name);let clean=name.replace(/\s+et al\.$/i,'').trim();clean=clean.replace(/(?:^|\s)(?:[A-Z]\.)+(?=[A-Z])/g,'').trim();const words=clean.split(/\s+/);return (words.at(-1)||clean)+(etal?' et al.':'');}).join(' & ');
}
export function supraCitation({author,note,pinpoint='',url='',shortTitle='',signal='',style='normal',citationStyle='academic',emphasis='italic',sourceType='article'}){
 author=String(author||'').trim();note=String(note||'').trim();pinpoint=String(pinpoint||'').trim();shortTitle=String(shortTitle||'').trim();
 if(!author||author.length>200||/[\r\n<>]/.test(author))throw Error('Enter the author name to use in the short citation.');
 if(!/^[1-9]\d{0,4}$/.test(note))throw Error('Enter the confirmed footnote number of the first full citation.');
 if(pinpoint.length>100||/[\r\n<>]/.test(pinpoint))throw Error('Enter a valid pinpoint page or page range.');
 if(shortTitle.length>300||/[\r\n<>]/.test(shortTitle))throw Error('Enter a valid short title.');
 if(signal&&!/^(See,\s*e\.g\.,|See also|See generally|See|But see|But cf\.|Cf\.|E\.g\.,|Accord|Compare)$/i.test(signal))throw Error('Unsupported citation signal.');
 if(citationStyle==='brief')style='normal';const emphasized=emphasis==='underline'?'underline':'italic';const parts=[];
 if(signal)parts.push({text:signal,style:emphasized},{text:' ',style:'normal'});
 parts.push({text:author,style},{text:', ',style:'normal'});
 if(shortTitle)parts.push({text:shortTitle,style:sourceType==='book'&&citationStyle==='academic'?'smallcaps':emphasized},{text:', ',style:'normal'});
 parts.push({text:'supra',style:emphasized},{text:` note ${note}${pinpoint?', at '+pinpoint:''}.`,style:'normal'});
 if(url){let link;try{link=new URL(url);}catch{throw Error('Enter a valid source URL.');}if(!['http:','https:'].includes(link.protocol))throw Error('Source URL must use HTTP or HTTPS.');parts.at(-1).text=parts.at(-1).text.replace(/\.$/,'');parts.push({text:', '+url+'.',style:'normal'});}
 return {kind:'supra',sourceType,parts,text:parts.map(p=>p.text).join(''),supra:{author,note,pinpoint,url,shortTitle,signal,style,sourceType},warnings:['Confirm the cited note contains the full source citation and precedes this reference. Note numbers are not live Word cross-references; recheck them after renumbering.']};
}
export function prepareSupra(group,{author,note,shortTitle='',...preferences}){
 if(group.requiresTitle&&!shortTitle.trim())throw Error('Supply a short title to distinguish this author’s different works.');
 return group.targets.map(item=>({entry:item.entry,originalSource:item.source,citation:supraCitation({...preferences,author,note,shortTitle,pinpoint:item.source.pinpoint,url:item.source.url,signal:item.source.signal,sourceType:item.source.type,style:item.source.type==='book'?'smallcaps':'normal'})}));
}
export function editedSupra(text,previous,preferences={}){
 const match=String(text).trim().match(/^(.*?),\s*supra note\s+([1-9]\d{0,4})(?:,\s*at\s+([^,]+?))?(?:,\s*(?:available at\s+)?(https?:\/\/\S+?))?\.?$/i);
 if(!match)throw Error('Use “Author, supra note 12, at 45” or change the supra fields and prepare again.');
 const prefix=match[1];let author=prefix,signal=previous.signal||'',shortTitle=previous.shortTitle||'';
 if(signal){if(!prefix.startsWith(signal+' '))throw Error('Keep the citation signal or prepare the suggestion again.');author=prefix.slice(signal.length+1);}
 if(shortTitle){if(author.startsWith(previous.author+', ')){shortTitle=author.slice(previous.author.length+2);author=previous.author;}else if(author.endsWith(', '+previous.shortTitle)){author=author.slice(0,-previous.shortTitle.length-2);}else throw Error('Keep the short title to distinguish the work, or prepare the suggestion again.');}
 return supraCitation({...previous,...preferences,author,note:match[2],pinpoint:match[3]||'',url:match[4]||'',shortTitle,signal});
}
