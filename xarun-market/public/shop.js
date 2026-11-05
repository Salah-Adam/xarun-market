const groups=['Fashion','Electronics','Food'];
const el=id=>document.getElementById(id), read=(key,def)=>JSON.parse(localStorage.getItem(key)||JSON.stringify(def)),save=(key,val)=>localStorage.setItem(key,JSON.stringify(val)),usd=n=>'$'+n.toFixed(2);
let cart=read('cart',{}),group='All';
const category=i=>groups[Math.floor(i/5)],photo=i=>'<img class="photo" alt="'+data[i][0]+'" loading="lazy" decoding="async" width="500" height="400" src="'+data[i][5]+'" onerror="this.onerror=null;this.src=\'/placeholder.svg\'">';
function tile(i){return '<button class="tile" onclick="detail('+i+')">'+photo(i)+'<small>'+category(i)+'</small><span>'+data[i][0]+'</span><b>'+usd(data[i][1])+'</b></button>'}
function render(){let ids=data.map((_,i)=>i).filter(i=>(group==='All'||category(i)===group)&&data[i][0].toLowerCase().includes(el('search').value.toLowerCase()));let sort=el('sort').selectedIndex;if(sort)ids.sort((a,b)=>(data[a][1]-data[b][1])*(sort===1?1:-1));el('products').innerHTML=ids.map(card).join('')||'No matching products.';el('filters').innerHTML=['All',...groups].map(g=>'<button class="'+(group===g?'active':'')+'" onclick="group=this.textContent;render()">'+g+'</button>').join(' ');el('bag').textContent='Cart ('+Object.values(cart).reduce((a,b)=>a+b,0)+')'}
function show(html){el('panel').innerHTML=html;if(!el('modal').open)el('modal').showModal();el('modal').scrollTop=0}
function detail(i){save('viewed',category(i));show('<h2>'+data[i][0]+'</h2>'+photo(i)+'<p>'+data[i][2]+'</p><p>In stock · '+usd(data[i][1])+'</p><button class="buy" onclick="change('+i+',1)">Add to cart</button><h3>Recommended for you</h3>'+data.map((_,j)=>j!==i&&category(j)===read('viewed','')?'<button onclick="detail('+j+')">'+data[j][0]+'</button>':'').join(' '))}
function change(i,n){cart[i]=(cart[i]||0)+n;if(cart[i]<=0)delete cart[i];save('cart',cart);render();basket()}
const total=()=>Object.entries(cart).reduce((s,[i,n])=>s+n*data[i][1],0);
function basket(){show('<h2>Your cart</h2>'+ (total()?Object.entries(cart).map(([i,n])=>'<div class="row">'+data[i][0]+' · '+usd(data[i][1]*n)+'<p><button aria-label="Decrease quantity" onclick="change('+i+',-1)">−</button> '+n+' <button aria-label="Increase quantity" onclick="change('+i+',1)">+</button> <button onclick="change('+i+',-'+n+')">Remove</button></p></div>').join('')+'<p>Total <b>'+usd(total())+'</b></p><button class="buy" onclick="checkout()">Checkout</button>':'Your cart is empty.'))}
el('bag').onclick=basket;el('search').oninput=el('sort').onchange=render;document.body.classList.toggle('dark',read('dark',false));el('theme').onclick=()=>save('dark',document.body.classList.toggle('dark'));render();

function favorites(){return read('favorites',[])}
function toggleSaved(i){const saved=favorites();save('favorites',saved.includes(i)?saved.filter(n=>n!==i):[...saved,i]);render()}
function card(i){return '<article class="productwrap">'+tile(i)+'<div class="actions"><button onclick="change('+i+',1)">Quick add</button><button aria-pressed="'+favorites().includes(i)+'" onclick="toggleSaved('+i+')">'+(favorites().includes(i)?'♥ Saved':'♡ Save')+'</button></div></article>'}
el('saved').onclick=()=>show('<h2>Saved products</h2>'+(favorites().length?favorites().map(tile).join(''):'Save a product to find it here.'));
async function checkout(){
 try { const response=await fetch("/api/account"); const account=await response.json(); if(!response.ok)throw Error(); if(!account.signedIn){show('<h2>Sign in to checkout</h2><p>Your orders will be saved to your account. Your cart is saved in this browser.</p><a class="primary" href="/account?return=checkout">Sign in with email</a>');return} } catch {show("<h2>Unable to check your account</h2><p>Please try again.</p>");return}

 show('<h2>Checkout</h2><p>'+Object.entries(cart).map(([i,n])=>data[i][0]+' × '+n).join(' • ')+'</p><form id="order">'+['Name','Phone','City','Address'].map(k=>'<label>'+k+'<input required maxlength="240" '+(k==='Phone'?'type="tel"':'')+'></label>').join('')+'<label>Payment method<select>'+['EVC Plus','Zaad','eDahab','Cash on delivery'].map(k=>'<option>'+k+'</option>').join('')+'</select></label><p>Demo checkout. Your delivery details are visible to the store admin. No payment is collected.</p><button class="buy">Place order · '+usd(total())+'</button><p role="status" id="error"></p></form>');
 el('order').onsubmit=async e=>{
 e.preventDefault();const form=e.target,button=form.querySelector('button');button.disabled=true;
 const items=Object.entries(cart).map(([i,n])=>[Number(i),n]), customer=[...form.querySelectorAll('input')].map(f=>f.value.trim()),method=form.querySelector('select').value;
 const fingerprint=JSON.stringify([items,customer,method]),pending=read('pendingOrder',null);
 const id=pending?.fingerprint===fingerprint?pending.id:'XM-'+crypto.randomUUID().toUpperCase();save('pendingOrder',{id,fingerprint});
 try{const r=await fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,items,customer,method})});
 if(!r.ok)throw Error((await r.json()).error);
 save('pendingOrder',null);cart={};save('cart',cart);render();show('<h2>Order confirmed</h2><p>Use this number to track your order:</p><b>'+id+'</b><p><a href="/account">View my orders →</a></p>');
 }catch(err){el('error').textContent=err.message;button.disabled=false}
 };
}
el('track').onclick=()=>{
 show('<h2>Track your order</h2><form id="lookup"><label>Order number<input required id="number" placeholder="XM-…"></label><button>Find order</button></form><p id="status" role="status"></p>');
 el('lookup').onsubmit=async e=>{e.preventDefault();const id=el('number').value.trim().toUpperCase(),legacy=read('orders',{})[id];if(legacy){el('status').textContent='Order received · '+usd(legacy.amount)+' · '+legacy.method;return}
 try{const r=await fetch('/api/track/'+encodeURIComponent(id)),o=await r.json();el('status').textContent=r.ok?o.status+' · '+usd(o.total)+' · '+o.method:o.error}catch{el('status').textContent='Tracking is unavailable. Please try again.'}};
}
function browse(department){group=department;el('search').value='';render()}
