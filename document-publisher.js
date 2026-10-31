export function publisherName(s){return String(s||'').replace(/\s+/g,' ').trim().split(/,\s*(?=\d|(?:P\.?O\.?\s+Box))/i)[0].slice(0,250);}
const clean=s=>String(s||'').replace(/\s+/g,' ').trim().slice(0,250);
export function documentPublisher(text,metadataPublisher=''){
 const value=Array.isArray(metadataPublisher)?metadataPublisher.map(clean).filter(Boolean).join(' & '):clean(metadataPublisher);
 if(value)return {name:publisherName(value),evidence:'Explicit document publisher metadata'};
 const initial=String(text||'').slice(0,6000);const lines=initial.split(/\n/).map(clean).filter(Boolean);
 const explicit=lines.find(line=>/^(?:publisher\s*:|published by\s+)/i.test(line));if(explicit){const name=explicit.replace(/^(?:publisher\s*:|published by\s+)/i,'').replace(/[.,;]$/,'').trim();if(name)return {name:publisherName(name),evidence:'Explicit publisher line in initial document text'};}
 // This co-branded poll header identifies YouGov even when served from a generic CDN.
 if(lines.slice(0,5).some(line=>/^The Economist\s*\/\s*YouGov Poll\b/i.test(line)))return {name:'YouGov',evidence:'The Economist / YouGov Poll heading in document text'};
 if(lines.slice(0,5).some(line=>/^(?:Morning Consult(?:\s*\/\s*POLITICO)?|POLITICO\s*\/\s*Morning Consult)\s+(?:poll|survey|crosstabs)\b/i.test(line)))return {name:'Morning Consult',evidence:'Morning Consult poll heading in document text'};
 return {name:'',evidence:'No explicit publisher found in initial text or metadata'};
}
