import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reviewText,citationHTML} from '../public/word/review.js';
test('recognizes standalone citations without surrounding prose replacements',()=>{assert.ok(reviewText('Brown v. Board of Education, 347 U.S. 483 (1954).').citation);assert.equal(reviewText('This is ordinary prose.'),null);assert.equal(reviewText('See id. at 42.').citation,undefined);});
test('review preserves original trailing spaces for exact range guards',()=>assert.equal(reviewText('42 U.S.C. § 1983.  \r').original,'42 U.S.C. § 1983.  '));
test('citation HTML escapes source text and preserves typography',()=>{const html=citationHTML({parts:[{text:'<script>&"',style:'italic'},{text:'Book',style:'smallcaps'}]});assert.match(html,/&lt;script&gt;&amp;&quot;/);assert.match(html,/<i>/);assert.match(html,/small-caps/);assert.ok(!html.includes('<script>'));});
