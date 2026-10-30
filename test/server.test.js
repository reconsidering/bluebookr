import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
test('serves preview and assets with query parameters',async()=>{
 const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'0',HOST:'127.0.0.1'},stdio:['ignore','pipe','pipe']});
 try{const [output]=await once(child.stdout,'data');const port=output.toString().match(/port (\d+)/)[1];
 for(const path of ['/word/taskpane.html?preview=1','/word/taskpane.js?v=1']){const r=await fetch(`http://127.0.0.1:${port}${path}`);assert.equal(r.status,200);assert.match(await r.text(),/Bluebookr|demoMode/);}
 }finally{const exited=once(child,'exit');child.kill();await exited;}
});
