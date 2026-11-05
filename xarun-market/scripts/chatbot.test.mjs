import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {answer} from '../public/chatbot-core.js';
const catalog=JSON.parse(fs.readFileSync('public/catalog.json'));
test('product search respects category and budget',()=>{
 assert.deepEqual(answer('headphones',catalog).ids,[5]);
 assert.deepEqual(answer('food under $5',catalog).ids,[14,12,13]);
 assert.deepEqual(answer('bariis',catalog).ids,[10]);
 assert.deepEqual(answer('products under $1',catalog).ids,[]);
});
test('cart totals use current quantities and prices',()=>{
 assert.match(answer('my cart',catalog,{0:2,14:3}).text,/\$34\.00/);
 assert.match(answer('my cart',catalog,{}).text,/empty/);
});
test('help stays within known store information',()=>{
 assert.match(answer('payment options',catalog).text,/no real payment/);
 assert.equal(answer('track my order',catalog).action,'track');
 assert.equal(answer('reset password',catalog).action,'account');
 assert.match(answer('shipping',catalog).text,/not listed/);
 assert.match(answer('weather forecast',catalog).text,/couldn’t find/);
});
test('built storefront serves all fifteen bundled image assets and chatbot modules',async()=>{
 await import('../build.mjs');
 const worker=(await import('../dist/server/index.js')).default;
 for(const path of ['/','/shop.js','/chatbot.js','/chatbot-core.js','/chatbot.css',...catalog.map((_,i)=>'/products/'+i+'.image')]){
  const response=await worker.fetch(new Request('http://localhost'+path),{});
  assert.equal(response.status,200,path);
  if(path.startsWith('/products/')){assert.match(response.headers.get('content-type'),/^image\//);assert.ok((await response.arrayBuffer()).byteLength>1000);}
 }
});
