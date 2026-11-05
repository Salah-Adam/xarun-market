import fs from 'node:fs';
import pg from 'pg';
if(!process.env.DATABASE_URL)throw Error('Set DATABASE_URL before importing.');
const exportPath=process.argv[2]||'.local/legacy-orders.json';
const mappingPath=process.argv[3]||'.local/order-email-map.json';
const orders=JSON.parse(fs.readFileSync(exportPath,'utf8'));
const mapping=fs.existsSync(mappingPath)?JSON.parse(fs.readFileSync(mappingPath,'utf8')):{};
const client=new pg.Client({connectionString:process.env.DATABASE_URL});
await client.connect();
try{
 await client.query('BEGIN');
 for(const order of orders){
  if(typeof order.id!=='string'||!Array.isArray(JSON.parse(order.customer))||!Array.isArray(JSON.parse(order.items))||!Number.isSafeInteger(order.total))throw Error('Invalid order export');
  const email=mapping[order.id]?.trim().toLowerCase()||null;
  if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Invalid email mapping');
  // Preserve ownership restrictions until the owner supplies a verified email mapping.
  await client.query('INSERT INTO orders(id,created,customer,items,total,method,status,user_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO NOTHING',[order.id,order.created,order.customer,order.items,order.total,order.method,order.status,'legacy:'+order.id]);
  await client.query('INSERT INTO legacy_order_owners(order_id,email) VALUES($1,$2) ON CONFLICT(order_id) DO UPDATE SET email=COALESCE(legacy_order_owners.email,excluded.email)',[order.id,email]);
 }
 await client.query('UPDATE orders SET user_id=c.id FROM legacy_order_owners l JOIN customers c ON c.email=l.email AND c.verified=1 WHERE orders.id=l.order_id');
 await client.query('COMMIT');
 console.log('Order import complete. Unmapped orders remain available to the admin.');
}catch(error){await client.query('ROLLBACK');throw error}
finally{await client.end()}
