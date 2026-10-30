// Conservative recognition: keep supplied spelling and abbreviations; never infer missing reporter data.
export function recognizeCitation(value) {
 const text=String(value||'').replace(/\s+/g,' ').trim();
 if(!text||text.length>10000)throw Error('Paste a citation of up to 10,000 characters.');
 let m;
 if((m=text.match(/^(\d+)\s+((?:U\.S\.C\.|C\.F\.R\.)(?:\s*(?:Ann\.|Supp\.))?)\s*§{1,2}\s*([\w.()–—-]+)(?:\s*\((\d{4})\))?\.?$/)))return {type:'statute',title:m[1],code:m[2],section:m[3].replace(/\.$/,''),year:m[4]||''};
 if((m=text.match(/^(.+?\sv\.\s.+?),\s*(\d+)\s+([A-Za-z][A-Za-z.\d\s]*?)\s+(\d+)(?:,\s*([\d–—-]+))?\s*\((?:(.*?)\s+)?(\d{4})\)\.?$/)))return {type:'case',name:m[1],volume:m[2],reporter:m[3],page:m[4],pinpoint:m[5]||'',court:m[6]||'',year:m[7]};
 if((m=text.match(/^([^,]+),\s*(.+),\s*(\d+)\s+(.+?)\s+(\d+)(?:,\s*([\d–—-]+))?\s*\((\d{4})\)\.?$/)))return {type:'article',author:m[1],title:m[2],volume:m[3],journal:m[4],page:m[5],pinpoint:m[6]||'',year:m[7]};
 if((m=text.match(/^([^,]+),\s*(.+?)\s*(?:\s(\d+(?:[–—-]\d+)?))?\s*\((?:(\S+)\s+ed\.\s+)?(\d{4})\)\.?$/)))return {type:'book',author:m[1],title:m[2],pinpoint:m[3]||'',edition:m[4]||'',year:m[5]};
 throw Error('This citation pattern was not recognized. Try its source URL or enter the details below.');
}
