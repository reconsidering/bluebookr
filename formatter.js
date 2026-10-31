export const schemas = {
  case: ['name','volume','reporter','page','pinpoint','court','year'],
  statute: ['title','code','section','year'],
  article: ['author','title','volume','journal','page','pinpoint','year'],
  book: ['author','title','pinpoint','edition','year'],
  web: ['author','title','site','date','url']
};
const required = {case:['name','volume','reporter','page','year'],statute:['title','code','section'],article:['author','title','volume','journal','page','year'],book:['author','title','year'],web:['title','site','url']};
export function formatCitation(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || !Object.hasOwn(schemas,input.type)) throw new Error('Choose a supported source type.');
  const options=citationOptions(input);
  const reviewDate=input.reviewDate??reviewDateISO();
  const visitedDate=bluebookReviewDate(reviewDate);
  const s = Object.fromEntries(schemas[input.type].map(k => [k, String(input[k] ?? '').trim()]));
  for (const [k,v] of Object.entries(s)) if(v.length > 2000 || /[\r\n\x00-\x1f]/.test(v)) throw new Error(`Invalid ${k}. Use one line, up to 2,000 characters.`);
  const missing = required[input.type].filter(k=>!s[k]);
  if(missing.length) throw new Error(`Missing required fields: ${missing.join(', ')}.`);
  if(s.year && !/^\d{4}$/.test(s.year)) throw new Error('Year must have four digits.');
  if(s.url) { let u; try {u=new URL(s.url);} catch {throw new Error('Enter a valid URL.');} if(!['https:','http:'].includes(u.protocol)) throw new Error('URL must use HTTP or HTTPS.'); }
  const parts=[]; const add=(text,style='normal')=>{if(options.citationStyle==='brief'&&style==='smallcaps')style=input.type==='book'&&text===s.title?'italic':'normal';if(style==='italic'&&options.emphasis==='underline')style='underline';if(text)parts.push({text,style});};
  const pin=s.pinpoint ? `, ${s.pinpoint}` : '';
  const warnings=[];
  switch(input.type) {
    case 'case':
      add(s.name,'italic'); add(`, ${s.volume} ${s.reporter} ${s.page}${pin} (${s.court ? s.court+' ' : ''}${s.year}).`);
      if(!s.court && s.reporter!=='U.S.') warnings.push('Confirm whether the court must appear in the parenthetical.');
      warnings.push('Use the appropriate abbreviated case name, reporter, and court.'); break;
    case 'statute': add(`${s.title} ${s.code} § ${s.section}${s.year ? ` (${s.year})` : ''}.`); warnings.push('Confirm the code edition or supplement date required for this source.'); break;
    case 'article': add(`${s.author}, `); add(s.title,'italic'); add(`, ${s.volume} `); add(s.journal,'smallcaps'); add(` ${s.page}${pin} (${s.year}).`); break;
    case 'book': add(s.author,'smallcaps'); add(', '); add(s.title,'smallcaps'); add(`${s.pinpoint ? ' '+s.pinpoint : ''} (${s.edition ? s.edition+' ed. ' : ''}${s.year}).`); break;
    case 'web': if(/^(?:n\.?\s*d\.?|undated|unknown)$/i.test(s.date))s.date='';if(s.author)add(s.author+', '); add(s.title,'italic'); add(', '); add(s.site,'smallcaps'); add(`${s.date ? ' ('+s.date+')' : ''}, ${s.url}${!s.date?' (last visited '+visitedDate+')':''}.`); if(!s.date)warnings.push('No publication date supplied. Last-visited date uses the Bluebookr review date; confirm access to the cited version, especially for archives or pasted content.'); break;
  }
  warnings.push(`Draft uses common ${options.citationStyle==='brief'?'legal-brief':'law-review'} citation patterns. Verify source abbreviations, applicable Bluebook rules, and local court requirements.`);
  return {text:parts.map(p=>p.text).join(''),parts,warnings,reviewDate};
}

export function citationOptions(input={}){
 const citationStyle=input.citationStyle??'academic',emphasis=input.emphasis??'italic';
 if(!['academic','brief'].includes(citationStyle)||!['italic','underline'].includes(emphasis))throw Error('Choose a valid citation style and emphasis.');
 return {citationStyle,emphasis};
}

export function reviewDateISO(now=new Date(),timeZone){
 if(timeZone){const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);const get=type=>parts.find(p=>p.type===type).value;return `${get('year')}-${get('month')}-${get('day')}`;}
 // Browsers use the reviewer’s local day; server calls use the configured service timezone.
 if(typeof window==='undefined')return reviewDateISO(now,'America/New_York');
 return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
export function bluebookReviewDate(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error('Review date must be YYYY-MM-DD.');
 const [year,month,day]=value.split('-').map(Number);const date=new Date(Date.UTC(year,month-1,day));
 if(year<1800||date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)throw Error('Review date must be a real calendar date.');
 return `${['Jan.','Feb.','Mar.','Apr.','May','June','July','Aug.','Sept.','Oct.','Nov.','Dec.'][month-1]} ${day}, ${year}`;
}
