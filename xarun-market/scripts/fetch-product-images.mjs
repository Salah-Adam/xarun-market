import fs from 'node:fs/promises';
const urls=JSON.parse(await fs.readFile('public/product-images.json','utf8'));
await fs.mkdir('public/products',{recursive:true});
const results=await Promise.allSettled(urls.map(async(url,i)=>{
 const response=await fetch(url,{signal:AbortSignal.timeout(45000)});
 if(!response.ok||!response.headers.get('content-type')?.startsWith('image/'))throw Error(`Image ${i}: ${response.status}`);
 const bytes=Buffer.from(await response.arrayBuffer());
 await fs.writeFile(`public/products/${i}.image`,bytes);
 await fs.writeFile(`public/products/${i}.type`,response.headers.get('content-type').split(';')[0]);
 console.log(`Product ${i+1}: saved ${bytes.length} bytes`);
}));
for(const result of results)if(result.status==='rejected'){console.error(result.reason.message);process.exitCode=1;}
