#!/usr/bin/env python3
"""Rebuild Windows installer using NSIS 3.x on Linux or Windows."""
from pathlib import Path
import hashlib,os,subprocess,sys,shutil
root=Path(__file__).resolve().parents[1]
subprocess.run([sys.executable,str(root/'installer/build-assets.py')],check=True)
compiler=os.environ.get('BLUEBOOKR_MAKENSIS') or shutil.which('makensis')
if not compiler:raise SystemExit('Install NSIS 3.x or set BLUEBOOKR_MAKENSIS to its makensis executable.')
subprocess.run([compiler,'-V3',str(root/'installer/BluebookrSetup.nsi')],cwd=root,check=True)
exe=root/'public/downloads/BluebookrSetup.exe'
checksum=hashlib.sha256(exe.read_bytes()).hexdigest()
(root/'public/downloads/SHA256SUMS.txt').write_text(checksum+'  BluebookrSetup.exe\n')
print('SHA-256:',checksum)
