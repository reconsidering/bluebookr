import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {formatCitation} from './formatter.js';
const assets={'/':['index.html','text/html'],'/app.js':['app.js','text/javascript'],'/style.css':['style.css','text/css']};
const server=http.createServer(async(req,res)=>{
  const send=(status,data,type='application/json')=>{res.writeHead(status,{'Content-Type':type+'; charset=utf-8','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; style-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'"});res.end(type==='application/json'?JSON.stringify(data):data);};
  if(req.method==='POST' && req.url==='/api/format') {
    try { let body=''; for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>64000){send(413,{error:'Request is too large.'});return;}} send(200,formatCitation(JSON.parse(body))); }
    catch(e){send(400,{error:e instanceof SyntaxError?'Invalid JSON.':e.message});} return;
  }
  if(req.method==='GET' && Object.hasOwn(assets,req.url)) {const [file,type]=assets[req.url];try{send(200,await readFile(new URL('./public/'+file,import.meta.url)),type);}catch{send(500,{error:'Unable to load page.'});}return;}
  send(404,{error:'Not found.'});
});
server.listen(Number(process.env.PORT||3000),process.env.HOST||(process.env.RENDER ? '0.0.0.0' : '127.0.0.1'),()=>console.log('Bluebookr listening on port '+(process.env.PORT||3000)));
