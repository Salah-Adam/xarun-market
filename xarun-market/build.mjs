import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const catalog=JSON.parse(read('public/catalog.json')).map((p,i)=>[...p.slice(0,5),'/products/'+i+'.image']);
const assets={};
for(const [route,file,type] of [['/','index.html','text/html'],['/admin','admin.html','text/html'],['/account','account.html','text/html'],['/account.js','account.js','text/javascript'],['/shop.js','shop.js','text/javascript'],['/admin.js','admin.js','text/javascript'],['/style.css','style.css','text/css'],['/placeholder.svg','placeholder.svg','image/svg+xml']]){
 let body=read('public/'+file);
 if(file==='shop.js')body='const data='+JSON.stringify(catalog)+';\n'+body;
 assets[route]=[type+'; charset=utf-8',body];
}
for(const file of ['chatbot.js','chatbot-core.js'])assets['/'+file]=['text/javascript; charset=utf-8',read('public/'+file)];
assets['/chatbot.css']=['text/css; charset=utf-8',read('public/chatbot.css')];
assets['/'][1]=assets['/'][1].replace('<body class="store">','<link rel="stylesheet" href="/chatbot.css"><body class="store">');
for(let i=0;i<catalog.length;i++)assets['/products/'+i+'.image']=[read('public/products/'+i+'.type').trim(),fs.readFileSync('public/products/'+i+'.image').toString('base64'),'base64'];
fs.mkdirSync('dist/server',{recursive:true});
fs.writeFileSync('dist/server/index.js','const assets='+JSON.stringify(assets)+';\nconst catalog='+JSON.stringify(catalog)+';\n'+read('server.mjs'));
fs.mkdirSync('site',{recursive:true});fs.writeFileSync('site/index.html','<!doctype html><title>Xarun Market</title>');
