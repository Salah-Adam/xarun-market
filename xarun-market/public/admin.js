const workspace = document.querySelector('#workspace');
const message = document.querySelector('#message');
const statuses = ['Received', 'Packing', 'Shipped', 'Delivered', 'Cancelled'];
const esc = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));
const money = value => '$' + value.toFixed(2);
let orders = [];
let query = '';
let selectedStatus = 'All';

async function call(action, body) {
  const response = await fetch('/api/admin/' + action, body ? {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  } : {});
  const result = await response.json();
  if (!response.ok) throw Object.assign(Error(result.error), { status: response.status });
  return result;
}

function renderOrders() {
  const matching = orders.filter(order =>
    (selectedStatus === 'All' || order.status === selectedStatus) &&
    (order.id + order.customer).toLowerCase().includes(query.toLowerCase())
  );
  document.querySelector('#count').textContent = matching.length + ' orders';
  document.querySelector('#list').innerHTML = matching.map(order => {
    const [name, phone, city, address] = JSON.parse(order.customer);
    const items = JSON.parse(order.items);
    return '<article class="orderrow"><div class="orderheading"><div><b>' + esc(name) +
      '</b><small>' + esc(city) + ' · ' + esc(order.created) + ' UTC</small></div>' +
      '<span class="badge ' + esc(order.status) + '">' + esc(order.status) + '</span>' +
      '<b>' + money(order.total) + '</b></div><details><summary>View order details</summary>' +
      '<p class="orderid">' + esc(order.id) + '</p><div class="detailgrid"><section><h3>Delivery</h3>' +
      '<p>' + esc(phone) + '</p><p>' + esc(address) + ', ' + esc(city) + '</p></section>' +
      '<section><h3>Items</h3><ul>' + items.map(item => '<li>' + esc(item.name) + ' × ' + item.qty +
        ' · ' + money(item.qty * item.price) + '</li>').join('') + '</ul><p>' + esc(order.method) +
      ' · Simulated payment</p></section></div><label>Update fulfillment<select data-id="' +
      esc(order.id) + '">' + statuses.map(status => '<option ' + (order.status === status ? 'selected' : '') +
        '>' + status + '</option>').join('') + '</select></label></details></article>';
  }).join('') || '<div class="empty"><h3>No orders to show</h3><p>' +
    (orders.length ? 'Try a different status or search.' : 'Customer purchases will appear here after checkout.') + '</p></div>';
}

async function dashboard() {
  orders = await call('orders');
  document.body.classList.add('unlocked');
  document.querySelector('#heading').textContent = 'Store overview';
  message.textContent = '';
  const metrics = [
    ['Total orders', orders.length],
    ['To pack', orders.filter(order => order.status === 'Received').length],
    ['On the way', orders.filter(order => order.status === 'Shipped').length],
    ['Active order value', money(orders.filter(order => order.status !== 'Cancelled').reduce((sum, order) => sum + order.total, 0))]
  ];
  workspace.innerHTML = '<section class="metrics">' + metrics.map(([label, value]) =>
    '<article><span>' + label + '</span><strong>' + value + '</strong></article>').join('') +
    '</section><div class="sectiontitle"><h2 id="orderlist">Orders</h2><span id="count"></span></div>' +
    '<div class="toolbar"><input id="find" aria-label="Search orders" placeholder="Search customer, city or order number">' +
    '<button id="refresh">Refresh orders</button><button id="lock">Lock dashboard</button></div>' +
    '<div class="statusfilters" role="group" aria-label="Filter by order status">' +
    ['All', ...statuses].map(status => '<button data-status="' + status + '" aria-pressed="' +
      (status === selectedStatus) + '">' + status + '</button>').join('') + '</div><section id="list"></section>';
  const search = document.querySelector('#find');
  search.value = query;
  search.oninput = () => { query = search.value; renderOrders(); };
  document.querySelector('.statusfilters').onclick = event => {
    const status = event.target.dataset.status;
    if (!status) return;
    selectedStatus = status;
    document.querySelectorAll('[data-status]').forEach(button =>
      button.setAttribute('aria-pressed', button.dataset.status === selectedStatus));
    renderOrders();
  };
  document.querySelector('#list').onchange = async event => {
    const field = event.target;
    const previous = orders.find(order => order.id === field.dataset.id);
    if (!previous) return;
    field.disabled = true;
    try {
      await call('status', { id: field.dataset.id, status: field.value });
      await dashboard();
      message.textContent = 'Order status updated.';
    } catch (error) {
      field.value = previous.status;
      field.disabled = false;
      message.textContent = error.message;
    }
  };
  document.querySelector('#refresh').onclick = async () => {
    try { await dashboard(); } catch (error) { message.textContent = error.message; }
  };
  document.querySelector('#lock').onclick = async () => {
    try { await call('logout', {}); await init(); } catch (error) { message.textContent = error.message; }
  };
  renderOrders();
}

async function init() {
  workspace.replaceChildren();
  document.body.classList.remove('unlocked');
  document.querySelector('#heading').textContent = 'Welcome back';
  try {
    const state = await call('state');
    if (state.active) { await dashboard(); return; }
    location.replace('/account');
  } catch (error) {
    message.textContent = error.message;

  }
}
init();
