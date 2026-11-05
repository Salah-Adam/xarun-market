// Catalog-grounded replies. No external service or customer data transmission.
export function answer(question, catalog, cart = {}) {
 const q=question.toLowerCase().trim();
 const money=n=>'$'+n.toFixed(2);
 const result=(text,ids=[],action=null)=>({text,ids,action});
 if(/\b(track|tracking|status|dalab)\b/.test(q))return result('Use Track an order with your XM order number, or sign in to My account to see your orders. I cannot look up private order details in this chat.',[],'track');
 if(/\b(pay|payment|payments|evc|zaad|edahab|cash|lacag)\b/.test(q))return result('Checkout offers EVC Plus, Zaad, eDahab and cash on delivery. This store currently uses demo checkout: no real payment is collected.');
 if(/\b(delivery|shipping|deliver|return|refund)\b/.test(q))return result('Delivery times, shipping fees and returns policies are not listed yet. Please confirm these with the store before ordering; I cannot promise a delivery date or refund.');
 if(/\b(account|login|sign in|password|register)\b/.test(q))return result('Open My account to register or sign in. Registration sends an email link to verify your email and choose a password. Forgot password is available there too.',[],'account');
 if(/\b(cart|basket|checkout)\b/.test(q)){
  const entries=Object.entries(cart).filter(([i,n])=>catalog[i]&&n>0);
  return result(entries.length?'Your cart: '+entries.map(([i,n])=>`${catalog[i][0]} × ${n}`).join(', ')+'. Total: '+money(entries.reduce((sum,[i,n])=>sum+catalog[i][1]*n,0))+'. Sign in to proceed with demo checkout.':'Your cart is empty. Browse the products below and use Quick add to start.',[],'cart');
 }
 const aliases=[['t-shirt','tee'],['tshirt','tee'],['bariis','rice'],['moos','bananas'],['caano','milk'],['cambe','mangoes'],['saliid','oil'],['headset','headphones'],['bag','tote'],['bags','tote'],['charger','charging'],['pantry','food']];
 let normalized=q;for(const [a,b]of aliases)normalized=normalized.replaceAll(a,b);
 const groups=['Fashion','Electronics','Food'];
 const stop=new Set(['i','a','an','the','you','your','have','has','do','does','is','are','me','my','show','find','want','need','please','can','some','for','of','to','buy','price','cost','how','much','what','which','under','below','less','than','over','above','between','and','dollars','usd','products','product','recommend','something','cheap','cheapest','affordable','budget','with']);
 const terms=normalized.match(/[a-z]+/g)?.filter(t=>!stop.has(t))||[];
 const budget=normalized.match(/(?:under|below|less than|budget(?: of)?)\s*\$?\s*(\d+(?:\.\d+)?)/);
 const lower=normalized.match(/(?:over|above)\s*\$?\s*(\d+(?:\.\d+)?)/);
 let ids=catalog.map((_,i)=>i).filter(i=>{
  const text=(catalog[i][0]+' '+groups[Math.floor(i/5)]).toLowerCase();
  return (!terms.length||terms.some(t=>text.includes(t)))&&(!budget||catalog[i][1]<Number(budget[1]))&&(!lower||catalog[i][1]>Number(lower[1]));
 });
 if(/cheap|budget|affordable|lowest/.test(q)||budget)ids.sort((a,b)=>catalog[a][1]-catalog[b][1]);
 if(terms.length||budget||lower||/products|recommend|cheap|shop|browse/.test(q))return ids.length?result('Here '+(ids.length===1?'is a matching product':'are some matching products')+'. Prices are in USD. Select a product for details.',ids.slice(0,5)):result('I couldn’t find a matching product. Try a product name, Fashion, Electronics, Food, or “products under $20”.');
 if(/^(hi|hello|hey|salaam|asc|thanks|thank you)[!. ]*$/.test(q))return result('Hello! Salaam! I can help you find products, compare prices, view your cart or find order help. What are you shopping for?');
 return result('I’m the automated store helper. Try “headphones”, “food under $10”, “my cart”, “payment” or “track my order”. I can only answer using this store’s catalog and listed information.');
}
