import {answer} from './chatbot-core.js';
const root=document.createElement('div');
root.innerHTML=`<button class="chat-launcher" id="chat-launcher" aria-expanded="false" aria-controls="chat-window"><span aria-hidden="true">✦</span> Chat with us</button>
<section class="chat-window" id="chat-window" aria-label="Xarun shopping assistant" hidden>
 <div class="chat-heading"><div><b>Xarun assistant</b><small>Product & shopping help</small></div><button id="chat-close" aria-label="Close chat">×</button></div>
 <div class="chat-messages" id="chat-messages" role="log" aria-live="polite" aria-relevant="additions" tabindex="0"></div>
 <div class="chat-suggestions" aria-label="Suggested questions"><button>Products under $20</button><button>Payment options</button><button>Track my order</button></div>
 <form class="chat-form" id="chat-form"><label class="visually-hidden" for="chat-input">Your message</label><input id="chat-input" placeholder="Ask about the market…" maxlength="400" autocomplete="off" required><button type="submit" aria-label="Send message">Send ↑</button></form>
 <p class="chat-note">Automated store helper · No live agent</p>
</section>`;
document.body.append(root);
const get=id=>document.getElementById(id),log=get('chat-messages');
let returnFocus;
function toggle(open){get('chat-window').hidden=!open;get('chat-launcher').setAttribute('aria-expanded',String(open));if(open){returnFocus=document.activeElement;get('chat-input').focus()}else{returnFocus?.focus()}}
function message(text,who='assistant'){
 const item=document.createElement('div');item.className='chat-message '+who;
 const label=document.createElement('small');label.textContent=who==='user'?'You':'Xarun assistant';
 const p=document.createElement('p');p.textContent=text;item.append(label,p);log.append(item);
 while(log.children.length>60)log.firstElementChild.remove();
 return item;
}
function ask(text){
 text=text.trim().slice(0,400);if(!text)return;
 message(text,'user');get('chat-input').value='';
 const reply=answer(text,data,cart),item=message(reply.text);
 for(const i of reply.ids){
  const button=document.createElement('button');button.className='chat-product';
  const img=document.createElement('img');img.src=data[i][5];img.alt='';img.loading='lazy';
  const span=document.createElement('span');span.textContent=data[i][0]+' · $'+data[i][1].toFixed(2);
  button.append(img,span);button.onclick=()=>{toggle(false);detail(i)};item.append(button);
 }
 if(reply.action){const button=document.createElement('button');button.className='chat-action';button.textContent={track:'Track an order →',account:'My account →',cart:'View cart →'}[reply.action];button.onclick=()=>{toggle(false);if(reply.action==='account')location.href='/account';else if(reply.action==='track')get('track').click();else basket()};item.append(button)}
 log.scrollTop=log.scrollHeight;get('chat-input').focus();
}
message('Hello! Salaam! Welcome to Xarun Market. I can help you find products, check prices and understand checkout. What can I help you with?');
get('chat-launcher').onclick=()=>toggle(get('chat-window').hidden);
get('chat-close').onclick=()=>toggle(false);
get('help').onclick=()=>toggle(true);
get('chat-form').onsubmit=e=>{e.preventDefault();ask(get('chat-input').value)};
root.querySelectorAll('.chat-suggestions button').forEach(button=>button.onclick=()=>ask(button.textContent));
root.addEventListener('keydown',e=>{if(e.key==='Escape'&&!get('chat-window').hidden){e.preventDefault();toggle(false)}});
