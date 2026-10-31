import {recognizeCitation} from '../../recognition.js';
import {formatCitation} from '../../formatter.js';
const normalize=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const signalPattern=/^(See,\s*e\.g\.,|See also|See generally|See|But see|But cf\.|Cf\.|E\.g\.,|Accord|Compare)\s+/i;
function titleSpan(text,title){const letters=[],positions=[];let offset=0;for(const char of text){for(const c of normalize(char)){letters.push(c);positions.push({start:offset,end:offset+char.length});}offset+=char.length;}const hay=letters.join(''),needle=normalize(title);if(!needle)return null;const i=hay.indexOf(needle);if(i<0||hay.indexOf(needle,i+1)>=0)return null;return {start:positions[i].start,end:positions[i+needle.length-1].end};}
function units(text){const result=[];let start=0;for(const match of text.matchAll(/;(?=\s|$)|[\r\n]/g)){result.push({start,end:match.index,text:text.slice(start,match.index),delimiter:match[0]});start=match.index+match[0].length;}result.push({start,end:text.length,text:text.slice(start),delimiter:''});return result;}
export function planLinkedCitation(paragraph,targetText,source){
 const first=paragraph.indexOf(targetText);if(first<0)return {kind:'ambiguous',reason:'The link text changed.'};
 if(paragraph.indexOf(targetText,first+1)>=0)return {kind:'ambiguous',reason:'This link occurs more than once in the paragraph. Select one complete citation to review it.'};
 const unit=units(paragraph).find(u=>first>=u.start&&first+targetText.length<=u.end);if(!unit)return {kind:'ambiguous',reason:'The citation crosses paragraph or reference boundaries.'};
 const multipleLinks=(unit.text.match(/https?:\/\/\S+/g)||[]).length>1;
 const text=unit.text.replace(/^[\s\u0001-\u0008]+/,'').trimEnd();const at=text.indexOf(targetText),prefix=text.slice(0,at).replace(/(?:,?\s+)?available at\s*$/i,'').replace(/[,\s]+$/,'').trim(),suffix=text.slice(at+targetText.length);
 const tail=/^\s*(?:\((?:last (?:visited|accessed)|accessed)\s+[^)]*\))?[.,]?\s*$/i.test(suffix);
 let fullExisting;try{fullExisting=recognizeCitation(text);}catch{}
 if(!multipleLinks&&fullExisting&&normalize(fullExisting.title||fullExisting.name)===normalize(source.title||source.name))return {kind:'existing',text,existing:fullExisting,delimiter:unit.delimiter};
 let existing;try{if(prefix)existing=recognizeCitation(prefix);}catch{}
 if(existing&&source.type==='web'&&existing.type==='book'&&existing.title.includes(',')&&titleSpan(prefix,source.title))existing=undefined;
 if(existing){if(multipleLinks)return {kind:'ambiguous',reason:'Multiple URLs occur in this reference. Review the complete citation so none are silently removed.'};if(!tail)return {kind:'ambiguous',reason:'A citation is followed by additional prose. Select the complete citation to isolate it.'};return {kind:'existing',text,existing,delimiter:unit.delimiter};}
 const commas=(prefix.match(/,/g)||[]).length;const isURL=/^https?:\/\//i.test(targetText);const span=titleSpan(isURL?prefix:text,source.title||source.name);const beforeLink=span&&span.end<=at;const titleOnly=beforeLink&&normalize(prefix)===normalize(source.title);const looksLikeCitation=commas>=2||(beforeLink&&commas>=1)||titleOnly||(!isURL&&span&&(text.match(/,/g)||[]).length>=1)||(/\(\d{4}\)/.test(prefix)&&commas>=1);
 if(span&&looksLikeCitation){
 if(multipleLinks)return {kind:'ambiguous',reason:'Multiple URLs occur in this reference. Review the complete citation so none are silently removed.'};
 if(!tail&&/^https?:\/\//i.test(targetText))return {kind:'ambiguous',reason:'The link is inside a sentence. Select the complete citation for review.'};
 const before=text.slice(0,span.start).replace(/[,\s“"']+$/,'').trim();const signal=before.match(signalPattern);const author=(signal?before.slice(signal[0].length):before).trim();
 if(/\b(?:according to|for more|available at|discussed|explains|can be found)\b/i.test(author)||author.length>150)return {kind:'ambiguous',reason:'Could not separate citation author from surrounding prose. Select the complete citation.'};
 const date=prefix.match(/\(((?:[A-Za-z]+\.?\s+\d{1,2},?\s+)?\d{4})\)$/)?.[1]||'';
 return {kind:'existing',text,existing:{type:'web',title:source.title,author,site:source.site||'',date,signal:signal?.[1]},delimiter:unit.delimiter};
 }
 // A naked link after a fully parsed citation is handled above. Never insert a
 // second full citation into an unparsed bibliography-like prefix.
 if(looksLikeCitation||/\b(?:supra|id\.)\b/i.test(prefix))return {kind:'ambiguous',reason:'This URL appears to belong to an existing citation whose boundaries could not be verified. Select the whole reference; the URL was left unchanged to avoid duplication.'};
 return {kind:'bare',text:targetText};
}
export function linkedCitationDraft(plan,imported,options,url){
 if(plan.kind!=='existing')return imported;
 const existing=plan.existing,source=imported.importedSource;const sameTitle=source&&(existing.type==='statute'?['title','code','section'].every(k=>normalize(existing[k])===normalize(source[k])):normalize(existing.title||existing.name)===normalize(source.title||source.name));
 if(!sameTitle)throw Error('The linked source title does not match the existing citation. No replacement was made. Review the link and citation together.');
 if(existing.type!=='web'&&source.type!==existing.type)throw Error('The link did not verify the existing citation’s source type. No second citation was inserted.');
 const merged={...source,url:url||existing.url||source.url,signal:existing.signal,pinpoint:existing.pinpoint||source.pinpoint};
 // An existing abbreviated journal name is not proven wrong by a full-name metadata record.
 if(existing.type==='article'&&existing.journal)merged.journal=existing.journal;
 if(source.type==='web'){if(!merged.author&&existing.author)merged.author=existing.author;if(!merged.date&&existing.date)merged.date=existing.date;}
 const citation=formatCitation({...merged,...options});citation.importedSource=source;citation.requiresConfirmation=!!imported.requiresConfirmation;
 citation.warnings.unshift(...imported.warnings.filter(w=>!citation.warnings.includes(w)));
 const differences=['author','volume','reporter','court','page','year','date'].filter(k=>existing[k]&&source[k]&&normalize(existing[k])!==normalize(source[k]));
 if(differences.length){citation.requiresConfirmation=true;citation.warnings.unshift('Linked metadata differs from the existing '+differences.join(', ')+'. Confirm the correction; supplied pinpoint pages are retained.');}
 if(plan.delimiter===';'&&!plan.text.endsWith('.')){citation.text=citation.text.replace(/\.$/,'');citation.parts.at(-1).text=citation.parts.at(-1).text.replace(/\.$/,'');}
 return citation;
}
