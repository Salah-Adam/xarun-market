// Visual storefront preview only. Use npm run dev for database-backed flows.
import http from 'node:http';
import '../build.mjs';
const worker=(await import('../dist/server/index.js')).default;
http.createServer(async(req,res)=>{
 try{
  if(req.url.startsWith('/api/')){res.writeHead(503,{'content-type':'application/json'});res.end(JSON.stringify({error:'Accounts and orders require the configured development server.'}));return;}
  const response=await worker.fetch(new Request(new URL(req.url,'http://127.0.0.1:3000')),{});
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch{res.writeHead(500);res.end('Preview error');}
}).listen(3000,'127.0.0.1',()=>console.log('Storefront preview: http://127.0.0.1:3000'));
