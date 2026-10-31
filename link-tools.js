export function archiveSnapshot(data,original){
 const s=data.archived_snapshots?.closest;if(!s?.available||String(s.status)!=='200')return null;
 let url;try{url=new URL(s.url);}catch{return null;}
 if(url.hostname!=='web.archive.org'||!['https:','http:'].includes(url.protocol)||url.username||url.password||url.port)return null;
 const m=url.pathname.match(/^\/web\/(\d{14})\/(https?:\/\/.*)$/);if(!m)return null;
 let target;try{target=new URL(m[2]+url.search);}catch{return null;}
 const a=new URL(original);a.hash='';target.hash='';if(target.href!==a.href)return null;
 url.protocol='https:';return {url:url.href,kind:'Wayback snapshot',originalURL:original,timestamp:m[1],warning:'An existing archived copy, not a guarantee of permanent availability. Review the captured version and date.'};
}
export function doiLink(value){const u=new URL(value);if(!['doi.org','dx.doi.org'].includes(u.hostname))return null;const doi=decodeURIComponent(u.pathname.slice(1));if(!/^10\.\d{4,9}\/\S+$/i.test(doi))return null;return {url:'https://doi.org/'+doi,kind:'DOI',originalURL:value};}

export function shouldCheckArchive(status){return [403,404,429].includes(status);}

export function archiveOriginalURL(value){
 const url=new URL(value);if(url.hostname!=='web.archive.org')return null;
 const match=url.pathname.match(/^\/web\/\d{14}(?:[a-z_]+)?\/(https?:\/\/.*)$/);if(!match)return null;
 try{const target=new URL(match[1]+url.search);if(target.username||target.password||target.port)return null;return target.href;}catch{return null;}
}
export function archiveReplayURL(value){const url=new URL(value);if(archiveOriginalURL(value))url.pathname=url.pathname.replace(/^(\/web\/\d{14})(?:[a-z_]+)?\//,'$1id_/');return url;}
