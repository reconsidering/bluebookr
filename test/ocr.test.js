import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import {deflateSync} from 'node:zlib';
import {extractDocument} from '../documents.js';
test('OCR reads an image-only PDF with no title metadata',async()=>{
 const canvas=createCanvas(1000,300),ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,1000,300);ctx.fillStyle='black';ctx.font='48px sans-serif';ctx.fillText('Legal Research Report',40,100);
 const rgba=ctx.getImageData(0,0,1000,300).data,rgb=Buffer.alloc(1000*300*3);for(let i=0,j=0;i<rgba.length;i+=4){rgb[j++]=rgba[i];rgb[j++]=rgba[i+1];rgb[j++]=rgba[i+2];}
 const compressed=deflateSync(rgb),content=Buffer.from('q 1000 0 0 300 0 0 cm /Im0 Do Q');
 const objects=[Buffer.from('<< /Type /Catalog /Pages 2 0 R >>'),Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),Buffer.from('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 1000 300] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>'),Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width 1000 /Height 300 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${compressed.length} >>\nstream\n`),compressed,Buffer.from('\nendstream')]),Buffer.concat([Buffer.from(`<< /Length ${content.length} >>\nstream\n`),content,Buffer.from('\nendstream')])];
 let pdf=Buffer.from('%PDF-1.4\n');const offsets=[];objects.forEach((o,i)=>{offsets.push(pdf.length);pdf=Buffer.concat([pdf,Buffer.from(`${i+1} 0 obj\n`),o,Buffer.from('\nendobj\n')]);});const start=pdf.length;pdf=Buffer.concat([pdf,Buffer.from('xref\n0 6\n0000000000 65535 f \n'+offsets.map(x=>String(x).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`)]);
 const result=await extractDocument(pdf,'pdf','https://example.com/scan.pdf');assert.match(result.source.title,/Legal Research Report/i);assert.match(result.provenance.title,/OCR/);
});
