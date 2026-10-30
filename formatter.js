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
  const s = Object.fromEntries(schemas[input.type].map(k => [k, String(input[k] ?? '').trim()]));
  for (const [k,v] of Object.entries(s)) if(v.length > 2000 || /[\r\n\x00-\x1f]/.test(v)) throw new Error(`Invalid ${k}. Use one line, up to 2,000 characters.`);
  const missing = required[input.type].filter(k=>!s[k]);
  if(missing.length) throw new Error(`Missing required fields: ${missing.join(', ')}.`);
  if(s.year && !/^\d{4}$/.test(s.year)) throw new Error('Year must have four digits.');
  if(s.url) { let u; try {u=new URL(s.url);} catch {throw new Error('Enter a valid URL.');} if(!['https:','http:'].includes(u.protocol)) throw new Error('URL must use HTTP or HTTPS.'); }
  const parts=[]; const add=(text,style='normal')=>{if(text)parts.push({text,style});};
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
    case 'web': if(s.author)add(s.author+', '); add(s.title,'italic'); add(', '); add(s.site,'smallcaps'); add(`${s.date ? ' ('+s.date+')' : ''}, ${s.url}.`); if(!s.date)warnings.push('No publication date supplied; verify whether a last-visited date is needed.'); break;
  }
  warnings.push('Draft uses common law-review full-citation patterns. Verify source abbreviations and applicable Bluebook rules; short forms and jurisdiction-specific exceptions are not applied.');
  return {text:parts.map(p=>p.text).join(''),parts,warnings};
}
