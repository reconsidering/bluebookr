import {recognizeCitation} from '../../recognition.js';
export function repeatedSources(entries){
 const groups=new Map();
 for(const entry of entries){let source;try{source=recognizeCitation(entry.original);}catch{continue;}if(!['book','article'].includes(source.type))continue;
 const keys=source.type==='book'?['type','author','title','edition','year']:['type','author','title','volume','journal','page','year'];
 const key=JSON.stringify(keys.map(k=>(source[k]||'').replace(/\s+/g,' ').trim().toLowerCase()));
 if(!groups.has(key))groups.set(key,{source,items:[]});groups.get(key).items.push({entry,source});
 }
 return [...groups.values()].filter(g=>g.items.length>1);
}
export function supraCitation({author,note,pinpoint='',url='',style='normal',citationStyle='academic',emphasis='italic'}){
 author=String(author||'').trim();note=String(note||'').trim();pinpoint=String(pinpoint||'').trim();
 if(!author||author.length>200||/[\r\n<>]/.test(author))throw Error('Enter the author name to use in the short citation.');
 if(!/^[1-9]\d{0,4}$/.test(note))throw Error('Enter the confirmed footnote number of the first full citation.');
 if(pinpoint.length>100||/[\r\n<>]/.test(pinpoint))throw Error('Enter a valid pinpoint page or page range.');
 if(citationStyle==='brief')style='normal';
 const parts=[{text:author,style},{text:', ',style:'normal'},{text:'supra',style:emphasis==='underline'?'underline':'italic'},{text:` note ${note}${pinpoint?', at '+pinpoint:''}.`,style:'normal'}];
 if(url){let link;try{link=new URL(url);}catch{throw Error('Enter a valid source URL.');}if(!['http:','https:'].includes(link.protocol))throw Error('Source URL must use HTTP or HTTPS.');parts.at(-1).text=parts.at(-1).text.replace(/\.$/,'');parts.push({text:', ',style:'normal'},{text:'available at',style:emphasis==='underline'?'underline':'italic'},{text:' '+url+'.',style:'normal'});}
 return {parts,text:parts.map(p=>p.text).join(''),warnings:['Confirm the cited note contains the full source citation and precedes this reference. Note numbers are not live Word cross-references; recheck them after renumbering.']};
}
