import {test} from 'node:test';
import assert from 'node:assert/strict';
import {citationChanges,goToCitation} from '../public/word/review.js';
test('markup reconstructs both versions without losing punctuation or whitespace',()=>{const a='42 U.S.C. 1983 ',b='42 U.S.C. § 1983.';const parts=citationChanges(a,b);assert.equal(parts.filter(p=>p.kind!=='insert').map(p=>p.text).join(''),a);assert.equal(parts.filter(p=>p.kind!=='delete').map(p=>p.text).join(''),b);assert.ok(parts.some(p=>p.kind==='insert'&&p.text.includes('§')));});
test('identical text and large selections have bounded comparisons',()=>{assert.deepEqual(citationChanges('same','same'),[{kind:'same',text:'same'}]);assert.equal(citationChanges('a '.repeat(1000),'b '.repeat(1000)).length,2);});
test('go to selects the precise tracked range',async()=>{let selected=false;const range={text:'citation',load(){},select(mode){assert.equal(mode,'Select');selected=true;}};await goToCitation({range,snapshot:'citation'},async(objects,fn)=>{assert.equal(objects[0],range);await fn({sync:async()=>{}});});assert.equal(selected,true);});
test('go to refuses stale ranges',async()=>{const range={text:'changed',load(){},select(){assert.fail('must not select changed content');}};await assert.rejects(goToCitation({range,snapshot:'original'},async(_,fn)=>fn({sync:async()=>{}})),/changed/);});
