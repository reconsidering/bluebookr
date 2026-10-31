#!/usr/bin/env python3
"""Build owned ribbon icons and a minimal sideload starter document (stdlib only)."""
from pathlib import Path
import struct,zlib,zipfile,xml.etree.ElementTree as ET
root=Path(__file__).resolve().parents[1]
manifest=ET.parse(root/'public/word/manifest.xml');ns={'o':'http://schemas.microsoft.com/office/appforoffice/1.1'}
addin=manifest.find('o:Id',ns).text;version=manifest.find('o:Version',ns).text
for size in [16,32,80]:
    rows=[]
    glyph=['11110','10001','10001','11110','10001','10001','11110']
    for y in range(size):
        row=bytearray()
        for x in range(size):
            gx=int((x/size-.25)*10);gy=int((y/size-.15)*10)
            ink=0<=gx<5 and 0<=gy<7 and glyph[gy][gx]=='1'
            row.extend((245,244,238,255) if ink else (36,79,67,255))
        rows.append(b'\0'+bytes(row))
    def chunk(t,d):return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
    png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',size,size,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(rows)))+chunk(b'IEND',b'')
    (root/f'public/word/icon-{size}.png').write_bytes(png)
rels='http://schemas.openxmlformats.org/package/2006/relationships'
files={
'[Content_Types].xml':'''<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/webextensions/taskpanes.xml" ContentType="application/vnd.ms-office.webextensiontaskpanes+xml"/><Override PartName="/word/webextensions/webextension.xml" ContentType="application/vnd.ms-office.webextension+xml"/></Types>''',
'_rels/.rels':f'''<Relationships xmlns="{rels}"><Relationship Id="document" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="taskpanes" Type="http://schemas.microsoft.com/office/2011/relationships/webextensiontaskpanes" Target="word/webextensions/taskpanes.xml"/></Relationships>''',
'word/document.xml':'''<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Welcome to Bluebookr</w:t></w:r></w:p><w:p><w:r><w:t>This starter document activates your privately installed Word add-in. Look for the Bluebookr ribbon tab and choose Open Bluebookr. Word may ask you to trust the add-in.</w:t></w:r></w:p><w:p><w:r><w:t>To use another document, open Bluebookr from Word's Add-ins menu if its tab is not already visible. You should not need to reinstall. Internet access is required.</w:t></w:r></w:p><w:p><w:r><w:t>Test citation: A. Campbell et al., The American Voter (1960)</w:t></w:r></w:p><w:p><w:r><w:t>Keep your own working documents elsewhere; this installed starter file is replaced by upgrades and removed by uninstalling.</w:t></w:r></w:p><w:sectPr/></w:body></w:document>''',
'word/webextensions/taskpanes.xml':'''<wetp:taskpanes xmlns:wetp="http://schemas.microsoft.com/office/webextensions/taskpanes/2010/11" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><wetp:taskpane dockstate="right" visibility="1" width="380" row="1"><wetp:webextensionref r:id="bluebookr"/></wetp:taskpane></wetp:taskpanes>''',
'word/webextensions/_rels/taskpanes.xml.rels':f'''<Relationships xmlns="{rels}"><Relationship Id="bluebookr" Type="http://schemas.microsoft.com/office/2011/relationships/webextension" Target="webextension.xml"/></Relationships>''',
'word/webextensions/webextension.xml':f'''<we:webextension xmlns:we="http://schemas.microsoft.com/office/webextensions/webextension/2010/11" id="{{{addin}}}"><we:reference id="{addin}" version="{version}" store="developer" storeType="Registry"/><we:alternateReferences/><we:properties/><we:bindings/></we:webextension>'''
}
with zipfile.ZipFile(root/'installer/Bluebookr-Start.docx','w',zipfile.ZIP_DEFLATED) as archive:
    for name,xml in files.items():
        ET.fromstring(xml)
        entry=zipfile.ZipInfo(name,(2026,1,1,0,0,0));entry.compress_type=zipfile.ZIP_DEFLATED
        archive.writestr(entry,'<?xml version="1.0" encoding="UTF-8"?>'+xml)
print('Built ribbon icons and starter document for',addin,version)
