const normalized=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
export function articleFromDOI(record,doi,title){
 if(record?.type!=='journal-article'||String(record.DOI||'').toLowerCase()!==String(doi).toLowerCase()||!title||normalized(record.title?.[0])!==normalized(title))return null;
 const source={type:'article',title:record.title[0],author:(record.author||[]).map(a=>[a.given,a.family].filter(Boolean).join(' ')).join(' & '),journal:record['container-title']?.[0]||'',volume:String(record.volume||''),page:String(record.page||'').split(/[-–]/)[0],year:String((record['published-print']||record.published)?.['date-parts']?.[0]?.[0]||'')};
 return {source,canonicalURL:'https://doi.org/'+record.DOI,provenance:Object.fromEntries(Object.keys(source).map(k=>[k,'Crossref DOI and exact document-title match'])),warnings:['Journal article identified by its DOI. Publisher addresses and download-host URLs are excluded. Verify journal abbreviation and any supplement/issue requirements.'+(record.issue?' Record issue: '+record.issue+'.':'')]};
}
export function urlHints(value){
 const u=new URL(value),hints=[];let path;try{path=decodeURIComponent(u.pathname);}catch{return hints;}
 const date=path.match(/\/(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\/|$)/);
 if(date){const [year,month,day]=date.slice(1).map(Number);const d=new Date(Date.UTC(year,month-1,day));if(year>=1800&&year<=new Date().getUTCFullYear()&&d.getUTCFullYear()===year&&d.getUTCMonth()===month-1&&d.getUTCDate()===day)hints.push({field:'date',value:`${['Jan.','Feb.','Mar.','Apr.','May','June','July','Aug.','Sept.','Oct.','Nov.','Dec.'][month-1]} ${day}, ${year}`,confidence:'high',evidence:'Complete calendar date in URL path'});}
 const author=path.match(/\/(?:author|authors)\/([a-z]+(?:-[a-z]+){1,3})(?:\/|$)/i);if(author)hints.push({field:'author',value:author[1].split('-').map(s=>s[0].toUpperCase()+s.slice(1)).join(' '),confidence:'review',evidence:'Author path segment; may be an author index rather than the current source author'});
 const filename=path.split('/').at(-1)||'';if(!/\.(pdf|docx?|txt)$/i.test(filename)&&/^[a-z]+(?:-[a-z]+){3,}$/i.test(filename))hints.push({field:'title',value:filename.replace(/-/g,' '),confidence:'review',evidence:'URL slug only; not publisher metadata'});
 return hints;
}
export function applyURLHints(result,url){
 const hints=urlHints(url);result.urlHints=hints;
 for(const hint of hints){if(hint.confidence==='high'&&result.source.type==='web'&&!result.source[hint.field]){result.source[hint.field]=hint.value;result.provenance[hint.field]=hint.evidence;result.warnings.push('Date filled from a complete URL date; confirm it is the publication date.');}}
 for(const hint of hints.filter(h=>h.confidence==='review'))if(!result.source[hint.field])result.warnings.push(`URL suggests ${hint.field}: ${hint.value}. Review before entering it; it was not filled automatically.`);
 return result;
}
export function scholarlyDOI(metadata,text=''){
 const custom=metadata.info?.Custom;const named=custom?.get?.('WPS-ARTICLEDOI')||metadata.metadata?.get?.('prism:doi')||'';
 if(/^10\.\d{4,9}\/\S+$/i.test(named))return named;
 const matches=[...String(text).matchAll(/\bdoi\s*:?\s*(10\.\d{4,9}\/[^\s<>]+)/gi)].map(m=>m[1].replace(/[.,;]+$/,''));return new Set(matches).size===1?matches[0]:'';
}
