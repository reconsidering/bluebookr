import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {unzipSync} from 'fflate';
import {load} from 'cheerio';
test('download is a Windows GUI executable matching its published SHA-256',async()=>{
 const exe=await readFile(new URL('../public/downloads/BluebookrSetup.exe',import.meta.url));assert.equal(exe.subarray(0,2).toString(),'MZ');const offset=exe.readUInt32LE(0x3c);assert.equal(exe.subarray(offset,offset+4).toString(),'PE\0\0');assert.equal(exe.readUInt16LE(offset+24+68),2);
 const checksum=await readFile(new URL('../public/downloads/SHA256SUMS.txt',import.meta.url),'utf8');assert.equal(createHash('sha256').update(exe).digest('hex'),checksum.split(/\s+/)[0]);
});
test('starter document links to the same add-in ID and version as the manifest',async()=>{
 const xml=await readFile(new URL('../public/word/manifest.xml',import.meta.url),'utf8');const manifest=load(xml,{xmlMode:true});const id=manifest('OfficeApp > Id').text(),version=manifest('OfficeApp > Version').text();assert.ok(id);
 const zip=unzipSync(await readFile(new URL('../installer/Bluebookr-Start.docx',import.meta.url)));const extension=load(new TextDecoder().decode(zip['word/webextensions/webextension.xml']),{xmlMode:true});const reference=extension('we\\:reference');assert.equal(reference.attr('id'),id);assert.equal(reference.attr('version'),version);assert.equal(reference.attr('storeType'),'Registry');assert.equal(reference.attr('store'),'developer');assert.ok(zip['word/document.xml']);
 const resourceIds=new Set(manifest('[id]').map((_,el)=>manifest(el).attr('id')).get());for(const el of manifest('[resid]').toArray())assert.ok(resourceIds.has(manifest(el).attr('resid')));
});
