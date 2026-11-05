const json=(value,status=200,headers={})=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json','cache-control':'no-store',...headers}});
const fail=(message,status=400)=>json({error:message},status);
const hex=bytes=>Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('');
async function digest(password,salt){
 const encoder=new TextEncoder();
 const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
 return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:encoder.encode(salt),iterations:600000},key,256));
}
const statuses=['Received','Packing','Shipped','Delivered','Cancelled'];
async function api(request,env,path){
 if(!['GET','POST'].includes(request.method))return fail('Method not allowed',405);
 if(Number(request.headers.get('content-length'))>20000)return fail('Request too large',413);
 const post=request.method==='POST';
 if(post && request.headers.get('origin')!==new URL(request.url).origin)return fail('Invalid origin',403);
 const db=env.DB;
 const customerSession=await session(request,db,'customer');
 const userId=customerSession?.user_id;
 if(path==='/api/account')return json({signedIn:!!userId});
 if(path==='/api/account/orders'){
  if(!userId)return fail('Sign in to view your orders.',401);
  return json((await db.prepare('SELECT id,created,items,total,method,status FROM orders WHERE user_id=? ORDER BY created DESC,id DESC').bind(userId).all()).results);
 }
 const input=post?await request.json():{};
 if(path.startsWith('/api/auth/'))return customerAuth(request,env,path,input);
 if(path==='/api/orders' && post){
  if(!userId)return fail('Sign in before placing an order.',401);
  const {id,items,customer,method}=input;
  if(!/^XM-[0-9a-f-]{36}$/i.test(id)||!Array.isArray(items)||!items.length||items.length>catalog.length||!Array.isArray(customer)||customer.length!==4||!customer.every(s=>typeof s==='string'&&s.trim().length&&s.length<=240)||!['EVC Plus','Zaad','eDahab','Cash on delivery'].includes(method))return fail('Check your order details.');
  if(!items.every(([i,n])=>Number.isInteger(i)&&catalog[i]&&Number.isInteger(n)&&n>0&&n<=99))return fail('Maximum 99 of each item.');
  const lines=items.map(([i,n])=>({name:catalog[i][0],qty:n,price:catalog[i][1]}));
  const total=lines.reduce((sum,x)=>sum+x.qty*x.price,0);
  await db.prepare('INSERT INTO orders(id,customer,items,total,method,user_id) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(id,JSON.stringify(customer),JSON.stringify(lines),total,method,userId).run();
  const owner=await db.prepare('SELECT user_id FROM orders WHERE id=?').bind(id).first();
  if(owner.user_id!==userId)return fail('Choose a new order number.',409);
  return json({id});
 }
 if(path.startsWith('/api/track/')&&!post){
  const row=await db.prepare('SELECT status,total,method FROM orders WHERE id=? AND (user_id IS NULL OR user_id=?)').bind(path.slice(11),userId).first();
  return row?json(row):fail('Order not found.',404);
 }
 if(!path.startsWith('/api/admin/'))return fail('Not found',404);
 const configured=!!env.ADMIN_EMAIL && typeof env.ADMIN_PASSWORD==='string' && env.ADMIN_PASSWORD.length>=12;
 const active=await session(request,db,'admin');
 const validAdmin=configured && active && active.user_id===await sha(env.ADMIN_EMAIL.toLowerCase()+'|'+env.ADMIN_PASSWORD);
 if(path==='/api/admin/state')return json({configured,active:!!validAdmin});
 if(path==='/api/admin/login'&&post){
  if(!configured)return fail('Admin login needs server configuration.',503);
  if(!await allowLogin(request,db,input.email))return fail('Too many attempts. Try again in 15 minutes.',429);
  const email=String(input.email||'').trim().toLowerCase();
  if(typeof input.password!=='string'||input.password.length>128)return fail('Incorrect email or password.',401);
  const actual=await sha(email+'|'+input.password);
  const expected=await sha(env.ADMIN_EMAIL.toLowerCase()+'|'+env.ADMIN_PASSWORD);
  if(!equal(actual,expected))return fail('Incorrect email or password.',401);
  return createSession(request,db,'admin',expected);
 }
 if(!validAdmin)return fail('Sign in as admin.',401);
 if(path==='/api/admin/logout'&&post)return endSession(request,db,'admin');
 if(path.endsWith('/orders')&&!post)return json((await db.prepare('SELECT * FROM orders ORDER BY created DESC,id DESC').all()).results);
 if(path.endsWith('/status')&&post&&statuses.includes(input.status)){
  const r=await db.prepare('UPDATE orders SET status=? WHERE id=?').bind(input.status,input.id).run();
  return r.meta.changes?json({ok:true}):fail('Order not found.',404);
 }
 return fail('Unknown action');
}
export default {async fetch(request,env){
 const path=new URL(request.url).pathname;
 if(path.startsWith('/api/')){try{return await api(request,env,path)}catch{return fail('Request failed. Please try again.',500)}}
 const asset=assets[path];return asset?new Response(asset[1],{headers:{'Content-Type':asset[0],'Referrer-Policy':'no-referrer','Cache-Control':'no-store'}}):new Response('Not found',{status:404});
}};
async function sha(text){
 return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)));
}
function equal(a,b){
 if(a.length!==b.length)return false;
 let difference=0;
 for(let i=0;i<a.length;i++)difference|=a.charCodeAt(i)^b.charCodeAt(i);
 return difference===0;
}
function sessionCookie(request,role,value,age){
 const secure=new URL(request.url).protocol==='https:'?'; Secure':'';
 return 'xm_'+role+'='+value+'; HttpOnly'+secure+'; SameSite=Lax; Path=/; Max-Age='+age;
}
function tokenFrom(request,role){
 return (request.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('xm_'+role+'='))?.split('=')[1]||'';
}
async function session(request,db,role){
 const token=tokenFrom(request,role);
 if(!/^[a-f0-9]{64}$/.test(token))return null;
 return db.prepare("SELECT s.user_id FROM auth_sessions s LEFT JOIN customers c ON c.id=s.user_id WHERE s.token=? AND s.role=? AND s.expires>? AND (s.role='admin' OR (c.verified=1 AND c.credential_version=s.credential_version))").bind(await sha(token),role,Date.now()).first();
}
async function createSession(request,db,role,userId,version=0){
 const token=hex(crypto.getRandomValues(new Uint8Array(32)));
 await db.prepare('DELETE FROM auth_sessions WHERE expires<=?').bind(Date.now()).run();
 await db.prepare('INSERT INTO auth_sessions(token,user_id,role,expires,credential_version) VALUES(?,?,?,?,?)').bind(await sha(token),userId,role,Date.now()+86400000,version).run();
 return json({ok:true},200,{'set-cookie':sessionCookie(request,role,token,86400)});
}
async function endSession(request,db,role){
 await db.prepare('DELETE FROM auth_sessions WHERE token=? AND role=?').bind(await sha(tokenFrom(request,role)),role).run();
 return json({ok:true},200,{'set-cookie':sessionCookie(request,role,'',0)});
}
async function allowLogin(request,db,email){
 const bucket=Math.floor(Date.now()/900000);
 const ip=request.headers.get('x-nf-client-connection-ip')||'local';
 const keys=[await sha('ip:'+ip),await sha('email:'+String(email).toLowerCase().slice(0,254))];
 for(const [index,key] of keys.entries()){
  const row=await db.prepare('INSERT INTO auth_attempts(id,bucket,attempts) VALUES(?,?,1) ON CONFLICT(id) DO UPDATE SET attempts=CASE WHEN auth_attempts.bucket=? THEN auth_attempts.attempts+1 ELSE 1 END,bucket=? RETURNING attempts').bind(key,bucket,bucket,bucket).first();
  if(row.attempts>(index===0?60:12))return false;
 }
 return true;
}
function mailConfigured(env){
 try{
  const url=new URL(env.APP_URL);
  return (url.protocol==='https:'||(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname))) &&
   env.BREVO_API_KEY && !env.BREVO_API_KEY.startsWith('replace-') &&
   env.BREVO_SENDER_EMAIL && !env.BREVO_SENDER_EMAIL.startsWith('replace-');
 }catch{return false}
}
async function sendAccountEmail(env,customer,purpose){
 const token=hex(crypto.getRandomValues(new Uint8Array(32)));
 const tokenHash=await sha(token);
 await env.DB.prepare('INSERT INTO email_tokens(token,customer_id,purpose,expires) VALUES(?,?,?,?)')
  .bind(tokenHash,customer.id,purpose,Date.now()+1800000).run();
 const link=new URL('/account',env.APP_URL);
 link.hash=new URLSearchParams({action:purpose,token}).toString();
 const subject=purpose==='verify'?'Verify your Xarun Market account':'Reset your Xarun Market password';
 try{
  const response=await (env.mailFetch||fetch)('https://api.brevo.com/v3/smtp/email',{
   method:'POST',headers:{'api-key':env.BREVO_API_KEY,'Content-Type':'application/json'},
   body:JSON.stringify({
    sender:{email:env.BREVO_SENDER_EMAIL,name:env.BREVO_SENDER_NAME||'Xarun Market'},
    to:[{email:customer.email}],subject,
    textContent:subject+'\n\nOpen this link and choose your store password:\n'+link.href+
     '\n\nThis link expires in 30 minutes. If you did not request this email, you can ignore it.'
   }),
   signal:AbortSignal.timeout(10000)
  });
  if(!response.ok)throw Error('Email delivery failed');
 }catch(error){
  await env.DB.prepare('DELETE FROM email_tokens WHERE token=?').bind(tokenHash).run();
  throw error;
 }
}
async function finishEmailAction(request,env,input,purpose){
 if(!/^[a-f0-9]{64}$/.test(input.token||'')||typeof input.password!=='string'||input.password.length<12||input.password.length>128)return fail('Use a valid link and a password of 12–128 characters.');
 if(!await allowLogin(request,env.DB,'token:'+input.token.slice(0,16)))return fail('Too many attempts. Try again later.',429);
 const salt=crypto.randomUUID(),hash=await digest(input.password,salt),tokenHash=await sha(input.token);
 const changed=await env.DB.transaction(async db=>{
  const token=await db.prepare('DELETE FROM email_tokens WHERE token=? AND purpose=? AND expires>? RETURNING customer_id')
   .bind(tokenHash,purpose,Date.now()).first();
  if(!token)return false;
  const result=await db.prepare('UPDATE customers SET hash=?,salt=?,verified=1,credential_version=credential_version+1 WHERE id=?'+(purpose==='verify'?' AND verified=0':'')+' RETURNING id,email')
   .bind(hash,salt,token.customer_id).first();
  if(!result)return false;
  await db.prepare('DELETE FROM email_tokens WHERE customer_id=?').bind(result.id).run();
  await db.prepare('DELETE FROM auth_sessions WHERE user_id=? AND role=?').bind(result.id,'customer').run();
  await db.prepare('UPDATE orders SET user_id=? WHERE id IN (SELECT order_id FROM legacy_order_owners WHERE email=?)').bind(result.id,result.email).run();
  return true;
 });
 return changed?json({ok:true,message:'Password saved. You can now sign in.'}):fail('This link is invalid or expired. Request a new email.');
}
async function customerAuth(request,env,path,input){
 if(request.method!=='POST')return fail('Method not allowed',405);
 const db=env.DB;
 if(path==='/api/auth/logout')return endSession(request,db,'customer');
 if(path==='/api/auth/verify')return finishEmailAction(request,env,input,'verify');
 if(path==='/api/auth/reset')return finishEmailAction(request,env,input,'reset');
 if(!['/api/auth/login','/api/auth/signup','/api/auth/resend','/api/auth/forgot'].includes(path))return fail('Not found',404);
 const email=String(input.email||'').trim().toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return fail('Enter a valid email address.');
 if(!await allowLogin(request,db,email))return fail('Too many attempts. Try again in 15 minutes.',429);
 if(path!=='/api/auth/login'&&!mailConfigured(env))return fail('Email delivery is not configured. Contact the store owner.',503);
 let customer=await db.prepare('SELECT * FROM customers WHERE email=?').bind(email).first();
 if(path==='/api/auth/login'){
  if(typeof input.password!=='string'||input.password.length<12||input.password.length>128)return fail('Incorrect email or password.',401);
  const hash=await digest(input.password,customer?.salt||'invalid-account');
  if(!customer||!equal(hash,customer.hash))return fail('Incorrect email or password.',401);
  if(!customer.verified)return fail('Verify your email before signing in. Use Resend verification email.',403);
  return createSession(request,db,'customer',customer.id,customer.credential_version);
 }
 if(path==='/api/auth/signup'&&!customer){
  const salt=crypto.randomUUID(),hash=await digest(crypto.randomUUID(),salt);
  await db.prepare('INSERT INTO customers(id,email,hash,salt) VALUES(?,?,?,?) ON CONFLICT(email) DO NOTHING').bind(crypto.randomUUID(),email,hash,salt).run();
  customer=await db.prepare('SELECT * FROM customers WHERE email=?').bind(email).first();
 }
 const purpose=path==='/api/auth/forgot'?'reset':'verify';
 if(customer&&(purpose==='reset'||!customer.verified)){
  try{await sendAccountEmail(env,customer,purpose)}catch{return fail('Unable to send email right now. Please try again.',503)}
 }
 return json({ok:true,message:'If eligible, you will receive an email with the next step. Check your inbox and spam folder.'});
}
