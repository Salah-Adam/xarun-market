import http from 'node:http';
import '../build.mjs';
import {postgresDatabase} from './postgres.mjs';
if(!process.env.DATABASE_URL)throw Error('Set DATABASE_URL in .env and run pnpm db:migrate first.');
const db=postgresDatabase(process.env.DATABASE_URL);
const worker=(await import('../dist/server/index.js')).default;
http.createServer(async(req,res)=>{
 try{
  const chunks=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size>20000){res.writeHead(413);res.end('Request too large');return}chunks.push(chunk)}
  const origin=process.env.APP_URL||'http://localhost:'+(process.env.PORT||3000);
  const request=new Request(new URL(req.url,origin),{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});
  const response=await worker.fetch(request,{...process.env,DB:db});
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());
 }catch{res.writeHead(500);res.end('Request failed')}
}).listen(Number(process.env.PORT||3000),'127.0.0.1',()=>console.log('Local store listening on port '+(process.env.PORT||3000)));
