import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
test('serves preview and assets with query parameters',async()=>{
 const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'0',HOST:'127.0.0.1'},stdio:['ignore','pipe','pipe']});
 try{const [output]=await once(child.stdout,'data');const port=output.toString().match(/port (\d+)/)[1];
 for(const path of ['/word/taskpane.html?preview=1','/word/taskpane.js?v=1']){const r=await fetch(`http://127.0.0.1:${port}${path}`);assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert.match(await r.text(),/Bluebookr|demoMode/);}
 const installer=await fetch(`http://127.0.0.1:${port}/downloads/BluebookrSetup.exe`);assert.equal(installer.status,200);assert.match(installer.headers.get('content-disposition'),/attachment/);assert.equal(Buffer.from(await installer.arrayBuffer()).subarray(0,2).toString(),'MZ');
 for(const size of [16,32,80]){const icon=await fetch(`http://127.0.0.1:${port}/word/icon-${size}.png`);assert.equal(icon.headers.get('content-type'),'image/png');assert.equal(Buffer.from(await icon.arrayBuffer()).subarray(1,4).toString(),'PNG');}
 }finally{const exited=once(child,'exit');child.kill();await exited;}
});
