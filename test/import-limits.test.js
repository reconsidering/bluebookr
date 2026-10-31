import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {downloadLimit} from '../import-limits.js';
import {documentKind,extractDocument} from '../documents.js';
test('larger default and configurable download limits are validated',()=>{assert.equal(downloadLimit(undefined),50*1024*1024);assert.equal(downloadLimit('100'),100*1024*1024);for(const v of ['0','201','bad','1.5'])assert.throws(()=>downloadLimit(v));});
test('reads genuine legacy Word binary content without external conversion',async()=>{const bytes=await readFile(new URL('./fixtures/legacy-word.doc',import.meta.url));assert.equal(documentKind(bytes,'application/msword'),'doc');const result=await extractDocument(bytes,'doc','https://example.com/file.doc');assert.ok(result.source.title.length>0);assert.match(result.provenance.title,/First extracted/);});
