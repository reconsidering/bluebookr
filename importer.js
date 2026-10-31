import {downloadLimit} from './import-limits.js';
import {documentKind,extractDocument} from './documents.js';
import {load} from 'cheerio';
import {recognizeCitation} from './recognition.js';
import ipaddr from 'ipaddr.js';
import {lookup} from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
export function publicAddress(address) { try {return ipaddr.process(address).range()==='unicast';} catch{return false;} }
export function sourceURL(value) {
 let url;try{url=new URL(value);}catch{throw Error('Paste a complete website URL, starting with https://.');}
 if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.port)throw Error('Use a public HTTP or HTTPS URL with no login details or custom port.');
 return url;
}
export function extractMetadata(html,url) {
 const $=load(html);const meta=new Map();
 $('meta').each((_,el)=>{const key=($(el).attr('name')||$(el).attr('property')||'').toLowerCase();const val=$(el).attr('content');if(val&&!meta.has(key))meta.set(key,val);});
 const clean=v=>String(v||'').replace(/\s+/g,' ').trim().slice(0,2000);
 const get=(...keys)=>clean(keys.map(k=>meta.get(k)).find(Boolean));
 const date=get('citation_publication_date','article:published_time','date','dc.date');
 const year=date.match(/\b\d{4}\b/)?.[0]||'';
 const source={type:'web',title:get('citation_title','og:title','twitter:title')||clean($('title').first().text()),author:get('citation_author','author','dc.creator'),site:get('og:site_name'),url};
 const provenance={title:'Page metadata or title',author:'Page metadata',site:'Page metadata',url:'Retrieved URL'};
 if(!source.site){source.site=new URL(url).hostname;provenance.site='Website hostname — review the publication name';}
 // Read structured book metadata without executing page scripts.
 const nodes=[];
 const collect=(value,depth=0)=>{if(depth>8||nodes.length>500)return;if(Array.isArray(value)){for(const v of value)collect(v,depth+1);}else if(value&&typeof value==='object'){nodes.push(value);if(value['@graph'])collect(value['@graph'],depth+1);if(value.mainEntity)collect(value.mainEntity,depth+1);}};
 $('script[type="application/ld+json"]').each((_,el)=>{try{collect(JSON.parse($(el).text()));}catch{}});
 const book=nodes.find(n=>[n['@type']].flat().some(t=>t==='Book'||t==='https://schema.org/Book'));
 const journal=get('citation_journal_title');
 if(journal){Object.assign(source,{type:'article',journal,volume:get('citation_volume'),page:get('citation_firstpage'),year});delete source.site;delete source.url;}
 else if(book||get('citation_isbn')){
 const authors=book?.author;
 const authorList=(Array.isArray(authors)?authors:[authors]).filter(Boolean).map(a=>typeof a==='string'?a:a.name).filter(Boolean);
 Object.assign(source,{type:'book',title:clean(book?.name)||source.title,author:source.author||clean(authorList.join(', ')),year:year||clean(book?.datePublished).match(/\b\d{4}\b/)?.[0]||'',edition:clean(book?.bookEdition)});
 // Edition strings vary by publisher; the user must supply the citation form.
 if(source.edition)source.edition=source.edition.replace(/\s*(?:edition|ed\.)$/i,'');
 delete source.site;delete source.url;
 }
 else if(date){const match=date.match(/^(\d{4})[-/](\d{2})[-/](\d{2})(?:T|$)/);if(match){const months=['Jan.','Feb.','Mar.','Apr.','May','June','July','Aug.','Sept.','Oct.','Nov.','Dec.'];const month=Number(match[2]);const day=Number(match[3]);if(month>=1&&month<=12&&day>=1&&day<=31)source.date=`${months[month-1]} ${day}, ${match[1]}`;}}
 // Recognize a complete case citation supplied explicitly by the publisher.
 const caseCitation=get('citation_legal_case','dc.identifier');
 if(caseCitation){try{const parsed=recognizeCitation(caseCitation);if(parsed.type==='case'){Object.keys(source).forEach(k=>delete source[k]);Object.assign(source,parsed);}}catch{}}
 // Cornell's US Code URLs explicitly identify title and section; no date is inferred.
 const parsedURL=new URL(url);
 const statutePath=parsedURL.hostname==='www.law.cornell.edu'&&parsedURL.pathname.match(/^\/uscode\/text\/(\d+)\/([\w-]+)\/?$/);
 if(statutePath){Object.keys(source).forEach(k=>delete source[k]);Object.assign(source,{type:'statute',title:statutePath[1],code:'U.S.C.',section:statutePath[2]});provenance.title=provenance.section='Cornell US Code URL';}
 return {source,provenance,warnings:['Imported from publisher metadata; review accuracy and abbreviations. Legal decisions and statutes may need a different source type.']};
}
async function download(url,signal) {
 const hostname=url.hostname.replace(/^\[|\]$/g,'');
 const addresses=await lookup(hostname,{all:true});
 if(!addresses.length||addresses.some(a=>!publicAddress(a.address)))throw Error('Only public website addresses can be imported.');
 const address=addresses[0];
 return new Promise((resolve,reject)=>{
 const req=(url.protocol==='https:'?https:http).get(url,{signal,lookup:(_host,options,cb)=>options.all?cb(null,[address]):cb(null,address.address,address.family),headers:{'User-Agent':'Bluebookr/0.2 (citation metadata lookup)','Accept':'text/html,application/xhtml+xml,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain'}},res=>{
 if([301,302,303,307,308].includes(res.statusCode)){res.resume();resolve({redirect:res.headers.location});return;}
 if(res.statusCode!==200){res.resume();reject(Error('This website could not be read. Enter the source details manually.'));return;}
 let size=0;const chunks=[];res.on('data',chunk=>{size+=chunk.length;if(size>downloadLimit()){res.destroy(Error(`File exceeds the configured ${downloadLimit()/1024/1024} MB download limit.`));}else chunks.push(chunk);});res.on('end',()=>resolve({bytes:Buffer.concat(chunks),contentType:res.headers['content-type']}));res.on('error',reject);
 });req.on('error',reject);
 });
}
let active=0;
export async function importURL(value) {
 if(active>=1)throw Error('Imports are busy. Try again shortly.');
 active++;const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),60000);
 try{let url=sourceURL(value);for(let i=0;i<5;i++){const page=await download(url,controller.signal);if(page.redirect){url=sourceURL(new URL(page.redirect,url).href);continue;}if(!page.bytes)throw Error('Website redirect had no destination.');const kind=documentKind(page.bytes,page.contentType);return kind==='html'?extractMetadata(page.bytes.toString('utf8'),url.href):await extractDocument(page.bytes,kind,url.href);}throw Error('Too many website redirects.');}
 catch(error){if(controller.signal.aborted)throw Error('The website took too long to respond. Try again or enter details manually.');if(['ENOTFOUND','ECONNREFUSED','ENETUNREACH','ECONNRESET'].includes(error.code))throw Error('Could not reach this website. Check the URL or enter details manually.');throw error;}
 finally{clearTimeout(timer);active--;}
}
