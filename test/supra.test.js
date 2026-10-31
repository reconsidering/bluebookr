import {test} from 'node:test';
import assert from 'node:assert/strict';
import {repeatedSources,supraCitation} from '../public/word/supra.js';
test('groups repeat books with differing pinpoint pages',()=>{const g=repeatedSources([{original:'Jane Smith, Law 12 (2024).'},{original:'Jane Smith, Law 45 (2024).'}]);assert.equal(g.length,1);assert.equal(g[0].items[1].source.pinpoint,'45');});
test('excludes cases and statutes and distinguishes editions',()=>assert.equal(repeatedSources([{original:'42 U.S.C. § 1983.'},{original:'42 U.S.C. § 1983.'},{original:'Jane Smith, Law (2024).'},{original:'Jane Smith, Law (2023).'}]).length,0));
test('supra includes confirmed first-reference note and current pinpoint',()=>{const c=supraCitation({author:'Smith',note:'12',pinpoint:'45–46'});assert.equal(c.text,'Smith, supra note 12, at 45–46.');assert.equal(c.parts.find(p=>p.text==='supra').style,'italic');});
test('supra without pinpoint and validation',()=>{assert.equal(supraCitation({author:'Smith',note:'3'}).text,'Smith, supra note 3.');for(const note of ['','0','-1','three'])assert.throws(()=>supraCitation({author:'Smith',note}));});
