import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recognizeCitation as r} from '../recognition.js';
import {formatCitation as f} from '../formatter.js';
for(const [type,text] of [
 ['case','Brown v. Board of Education, 347 U.S. 483, 495 (1954).'],
 ['case','Example v. Sample, 10 F.3d 20 (2d Cir. 1993).'],
 ['statute','42 U.S.C. § 1983.'],
 ['article','Jane Smith, Legal Reasoning, 100 Example L. Rev. 123, 130 (2024).'],
 ['book','Jane Smith, Legal Reasoning 42 (2d ed. 2024).'],
 ['book','Jane Smith, Legal Reasoning (2024).']
])test('recognizes '+text,()=>{const source=r(text);assert.equal(source.type,type);assert.equal(f(source).text,text);});
test('unrecognized prose stays unrecognized',()=>assert.throws(()=>r('An interesting source about law'),/not recognized/));
