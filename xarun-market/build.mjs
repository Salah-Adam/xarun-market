import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const catalog=JSON.parse(read('public/catalog.json'));
const assets={};
for(const [route,file,type] of [['/','index.html','text/html'],['/admin','admin.html','text/html'],['/account','account.html','text/html'],['/account.js','account.js','text/javascript'],['/shop.js','shop.js','text/javascript'],['/admin.js','admin.js','text/javascript'],['/style.css','style.css','text/css'],['/placeholder.svg','placeholder.svg','image/svg+xml']]){
 let body=read('public/'+file);
 if(file==='shop.js')body='const data='+JSON.stringify(catalog)+';\n'+body;
 assets[route]=[type+'; charset=utf-8',body];
}
fs.mkdirSync('dist/server',{recursive:true});
fs.writeFileSync('dist/server/index.js','const assets='+JSON.stringify(assets)+';\nconst catalog='+JSON.stringify(catalog)+';\n'+read('server.mjs'));
fs.mkdirSync('site',{recursive:true});fs.writeFileSync('site/index.html','<!doctype html><title>Xarun Market</title>');
