/* ===== Amazon Clone - API Layer ===== */
const TOKEN_KEY = 'amz_token';
const USER_KEY = 'amz_user';

function getToken() { return localStorage.getItem(TOKEN_KEY); }
function setSession(token, user) { localStorage.setItem(TOKEN_KEY, token); localStorage.setItem(USER_KEY, JSON.stringify(user)); }
function getUser() { try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; } }
function logout() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); location.href = '/login.html'; }

async function request(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...opts.headers };
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(path, { ...opts, headers });
  let data = null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) data = await res.json();
  if (!res.ok) throw new Error((data && data.error) ? data.error : 'Request failed (' + res.status + ')');
  return data;
}

/* Product API */
const productApi = {
  list: (params) => { const qs = new URLSearchParams(params || {}); return request('/api/products?' + qs.toString()); },
  get: (id) => request('/api/products/' + id),
  search: (q) => request('/api/search?q=' + encodeURIComponent(q)),
  create: (p) => request('/api/products', { method: 'POST', body: JSON.stringify(p) }),
  update: (id, p) => request('/api/products/' + id, { method: 'PUT', body: JSON.stringify(p) }),
  remove: (id) => request('/api/products/' + id, { method: 'DELETE' })
};

/* Auth API (Login with Token) */
const authApi = {
  register: (d) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(d) }),
  login: (d) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(d) }),
  forgot: (d) => request('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify(d) })
};

/* Cart API */
const cartApi = {
  get: () => request('/api/cart'),
  add: (p) => request('/api/cart', { method: 'POST', body: JSON.stringify(p) }),
  update: (id, q) => request('/api/cart/' + id, { method: 'PUT', body: JSON.stringify({ quantity: q }) }),
  remove: (id) => request('/api/cart/' + id, { method: 'DELETE' })
};

/* Order API */
const orderApi = {
  create: (d) => request('/api/orders', { method: 'POST', body: JSON.stringify(d) }),
  list: () => request('/api/orders'),
  get: (id) => request('/api/orders/' + id),
  tracking: (id) => request('/api/orders/' + id + '/tracking')
};

/* Address API */
const addressApi = {
  list: () => request('/api/addresses'),
  add: (d) => request('/api/addresses', { method: 'POST', body: JSON.stringify(d) }),
  update: (id, d) => request('/api/addresses/' + id, { method: 'PUT', body: JSON.stringify(d) }),
  remove: (id) => request('/api/addresses/' + id, { method: 'DELETE' })
};

/* Payment Methods API (demo only - no real payments) */
const paymentApi = {
  list: () => request('/api/payment-methods'),
  add: (d) => request('/api/payment-methods', { method: 'POST', body: JSON.stringify(d) }),
  remove: (id) => request('/api/payment-methods/' + id, { method: 'DELETE' })
};

/* Wishlist API */
const wishlistApi = {
  list: () => request('/api/wishlist'),
  add: (pid) => request('/api/wishlist', { method: 'POST', body: JSON.stringify({ product_id: pid }) }),
  remove: (id) => request('/api/wishlist/' + id, { method: 'DELETE' })
};

/* Review API */
const reviewApi = {
  list: (pid) => request('/api/reviews/' + pid),
  add: (d) => request('/api/reviews', { method: 'POST', body: JSON.stringify(d) })
};

/* Seller API */
const sellerApi = {
  dashboard: () => request('/api/seller/dashboard'),
  products: () => request('/api/seller/products'),
  orders: () => request('/api/seller/orders')
};

/* Notification API */
const notificationApi = {
  list: () => request('/api/notifications'),
  read: (id) => request('/api/notifications/' + id + '/read', { method: 'PUT' })
};

function formatPrice(n) { return '\u20B9' + Number(n || 0).toLocaleString('en-IN'); }
