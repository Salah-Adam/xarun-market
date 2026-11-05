const historyPanel=document.querySelector('#history'),feedback=document.querySelector('#feedback');
const escapeText=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function loadHistory(){
 feedback.textContent='Loading your orders…';
 try{
  const response=await fetch('/api/account/orders');
  if(response.status===401){
   feedback.textContent='';
   renderLogin();
   return;
  }
  if(!response.ok)throw Error('Your order history is unavailable. Please try again.');
  const orders=await response.json();
  document.querySelector('#signout').hidden=false;
  feedback.textContent='';
  historyPanel.innerHTML='<button id="reload">Refresh status</button>'+orders.map(order=>{
   const stages=['Received','Packing','Shipped','Delivered'];
   return '<article class="ordercard"><div class="orderheading"><b>'+escapeText(order.id)+'</b><span class="badge '+escapeText(order.status)+'">'+escapeText(order.status)+'</span></div><small>'+escapeText(order.created)+' UTC</small><ol class="progress">'+(order.status==='Cancelled'?'<li>Order cancelled</li>':stages.map((s,i)=>'<li class="'+(i<=stages.indexOf(order.status)?'reached':'')+'">'+s+'</li>').join(''))+'</ol><ul>'+JSON.parse(order.items).map(item=>'<li>'+escapeText(item.name)+' × '+item.qty+' <b>$'+(item.price*item.qty).toFixed(2)+'</b></li>').join('')+'</ul><p>Total <b>$'+order.total.toFixed(2)+'</b> · '+escapeText(order.method)+'</p></article>';
  }).join('')+(orders.length?'':'<section class="console"><h2>Your next find is waiting</h2><p>Your purchases will appear here after checkout.</p><a class="primary" href="/">Explore the market →</a></section>');
  document.querySelector('#reload').onclick=loadHistory;
 }catch(error){feedback.textContent=error.message;historyPanel.innerHTML='<button id="retry">Try again</button>';document.querySelector('#retry').onclick=loadHistory}
}
let actionToken;
let actionMode;
function renderLogin(mode='login'){
 document.querySelector('#signout').hidden=true;
 const needsPassword=['login','verify','reset'].includes(mode);
 const titles={login:'Welcome back',signup:'Create your account',resend:'Resend verification email',forgot:'Reset your password',verify:'Verify your email',reset:'Choose a new password'};
 historyPanel.innerHTML='<section class="console"><h2>'+titles[mode]+'</h2><p>'+(['verify','reset'].includes(mode)?'Choose a password of at least 12 characters for Xarun Market.':'Enter your email address to continue.')+'</p><form id="customer-login">'+(!['verify','reset'].includes(mode)?'<label>Email address<input type="email" name="email" required autocomplete="username" placeholder="you@gmail.com"></label>':'')+(needsPassword?'<label>Password<input type="password" name="password" required minlength="12" maxlength="128" autocomplete="'+(mode==='login'?'current-password':'new-password')+'"></label>':'')+'<button>'+({login:'Sign in',signup:'Send verification email',resend:'Send verification email',forgot:'Send reset link',verify:'Verify email and save password',reset:'Save new password'}[mode])+'</button></form><div class="authlinks"><button data-mode="login">Sign in</button><button data-mode="signup">Create account</button><button data-mode="forgot">Forgot password?</button><button data-mode="resend">Resend verification email</button></div></section>';
 historyPanel.querySelectorAll('[data-mode]').forEach(button=>button.onclick=()=>{feedback.textContent='';renderLogin(button.dataset.mode)});
 document.querySelector('#customer-login').onsubmit=async event=>{
  event.preventDefault();
  const form=event.target,button=form.querySelector('button');button.disabled=true;feedback.textContent='';
  try{
   const payload={email:form.elements.email?.value,password:form.elements.password?.value,token:actionToken};
   const response=await fetch('/api/auth/'+mode,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
   const result=await response.json();if(!response.ok)throw Error(result.error);
   if(mode!=='login'){renderLogin('login');feedback.textContent=result.message;return}
   if(new URLSearchParams(location.search).get('return')==='checkout'){location.href='/#shop';return}
   await loadHistory();
  }catch(error){feedback.textContent=error.message;button.disabled=false}
 };
}
document.querySelector('#signout').onclick=async event=>{
 event.preventDefault();
 try{
  const response=await fetch('/api/auth/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  if(!response.ok)throw Error('Unable to sign out. Try again.');
  historyPanel.replaceChildren();await loadHistory();
 }catch(error){feedback.textContent=error.message}
};
function openAccountPage(){
 const params=new URLSearchParams(location.hash.slice(1));
 actionToken=params.get('token');actionMode=params.get('action');
 if(actionToken)history.replaceState(null,'',location.pathname+location.search);
 if(actionToken&&['verify','reset'].includes(actionMode)){feedback.textContent='';renderLogin(actionMode)}
 else loadHistory();
}
window.addEventListener('hashchange',openAccountPage);
openAccountPage();
