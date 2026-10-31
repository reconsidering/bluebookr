// Conservative recognition: keep supplied spelling and abbreviations; never infer missing reporter data.
export function recognizeCitation(value){
 const text=String(value||'').replace(/^[\s\u0001-\u0008]+/,'').replace(/\s+/g,' ').trim();
 const signal=text.match(/^(See,\s*e\.g\.,|See also|See generally|See|But see|But cf\.|Cf\.|E\.g\.,|Accord|Compare),?\s+/i);
 const content=signal?text.slice(signal[0].length):text;const linked=content.match(/^(.*?),?\s+(?:available at\s+)?(https?:\/\/\S+?)(?:\.)?$/i);let source;if(linked){source=recognizeCore(linked[1].replace(/[,\s]+$/,''));if(!['book','article'].includes(source.type))throw Error('Only secondary-source available-at citations are supported.');source.url=linked[2];}else source=recognizeCore(content);
 return signal?{...source,signal:signal[1]}:source;
}
function recognizeCore(value) {
 const text=String(value||'').replace(/\s+/g,' ').trim();
 if(!text||text.length>10000)throw Error('Paste a citation of up to 10,000 characters.');
 let m;
 if((m=text.match(/^(\d+)\s+((?:U\.S\.C\.|C\.F\.R\.)(?:\s*(?:Ann\.|Supp\.))?)\s*§{1,2}\s*([\w.()–—-]+)(?:\s*\((\d{4})\))?\.?$/)))return {type:'statute',title:m[1],code:m[2],section:m[3].replace(/\.$/,''),year:m[4]||''};
 if((m=text.match(/^(.+?\sv\.\s.+?),\s*(\d+)\s+([A-Za-z][A-Za-z.\d\s]*?)\s+(\d+)(?:,\s*([\d–—-]+))?\s*\((?:(.*?)\s+)?(\d{4})\)\.?$/)))return {type:'case',name:m[1],volume:m[2],reporter:m[3],page:m[4],pinpoint:m[5]||'',court:m[6]||'',year:m[7]};
 if((m=text.match(/^([^,]+),\s*(.+),\s*(\d+)\s+(.+?)\s+(\d+(?:[-–—]\d+)?)(?:,\s*([\d–—-]+))?\s*\(((?:[A-Za-z]+\.?\s+\d{1,2},?\s+)?(\d{4}))\)\.?$/)))return {type:'article',author:m[1],title:m[2],volume:m[3],journal:m[4],page:m[5].split(/[-–—]/)[0],pageRange:/[-–—]/.test(m[5])?m[5]:undefined,pinpoint:m[6]||'',year:m[8],publicationDate:m[7]};
 if((m=text.match(/^([^,]+),\s*(.+?)\s*(?:\s(\d+(?:[–—-]\d+)?))?\s*\((?:(\S+)\s+ed\.\s+)?(\d{4})\)\.?$/))){if(/,\s*[^,]*(?:\bJournal\b|\bReview\b|\bQuarterly\b|\bPsychology\b|\bJ\.|\bL\.\s*Rev\.)/i.test(m[2]))throw Error('This may be an incomplete journal citation. Supply its volume, journal, and first page instead of formatting it as a book.');return {type:'book',author:m[1],title:m[2],pinpoint:m[3]||'',edition:m[4]||'',year:m[5]};}
 throw Error('This citation pattern was not recognized. Try its source URL or enter the details below.');
}
