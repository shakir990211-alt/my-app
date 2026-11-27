/* ===== Amazon Clone - Common UI (header, nav, footer, auth) ===== */
async function renderHeader() {
  const token = localStorage.getItem(TOKEN_KEY);
  const user = getUser();
  const el = document.getElementById('header');
  let count = 0;
  try { const cart = await cartApi.get(); count = (cart.cart || []).length; } catch { count = 0; }
  el.innerHTML = `
    <div class="container header-bar">
      <div class="header-left">
        <div class="location" onclick="location.href='/help.html'"><strong>IN</strong> <span>Deliver to India</span></div>
        <form class="search-box" id="topSearch">
          <input type="text" class="search-input" placeholder="Search Amazon.in" />
          <button type="submit" class="search-btn">Go</button>
        </form>
      </div>
      <div class="header-right">
        <div class="signin"><div><span>Hello, sign in</span>${user ? '<div style="font-weight:700;color:#fff">' + user.name + '</div>' : ''}</div></div>
        <div class="returns" onclick="location.href='/orders.html'"><span>Returns &amp; Orders</span></div>
        <div class="cart" onclick="location.href='/cart.html'"><span>Cart</span><span class="cart-count" id="cartCount">${count}</span></div>
      </div>
    </div>
    <div class="separator"></div>
  `;
  const cntEl = document.getElementById('cartCount');
  if (cntEl) cntEl.textContent = count;
  const form = document.getElementById('topSearch');
  if (form) form.onsubmit = (e) => { e.preventDefault(); const q = form.querySelector('.search-input').value.trim(); if (q) location.href = '/search.html?q=' + encodeURIComponent(q); };
}

function renderNav() {
  const el = document.getElementById('nav');
  el.innerHTML = `
    <div class="container navbar">
      <button class="mobile-menu-btn" id="mobileMenuBtn">&#9776; All</button>
      <div class="nav-links" id="navLinks">
        <a href="/">Home</a>
        <a href="/today-deals.html">Today's Deals</a>
        <a href="/electronics.html">Electronics</a>
        <a href="/fashion.html">Fashion</a>
        <a href="/home-kitchen.html">Home &amp; Kitchen</a>
        <a href="/beauty.html">Beauty</a>
        <a href="/sports.html">Sports</a>
        <a href="/toys.html">Toys</a>
        <a href="/books.html">Books</a>
        <a href="/grocery.html">Grocery</a>
        <a href="/mobiles.html">Mobiles</a>
        <a href="/help.html">Customer Service</a>
        <a href="/sell.html">Sell on Amazon</a>
      </div>
    </div>
    <div class="mobile-panel" id="mobilePanel">
      <div class="container">
        <h3 style="color:#fff;margin:12px 0 8px">Shop by Category</h3>
        <ul style="list-style:none">
          <li><a href="/electronics.html">Electronics</a></li>
          <li><a href="/fashion.html">Fashion</a></li>
          <li><a href="/home-kitchen.html">Home &amp; Kitchen</a></li>
          <li><a href="/beauty.html">Beauty</a></li>
          <li><a href="/sports.html">Sports</a></li>
          <li><a href="/toys.html">Toys</a></li>
          <li><a href="/books.html">Books</a></li>
          <li><a href="/grocery.html">Grocery</a></li>
          <li><a href="/mobiles.html">Mobiles</a></li>
          <li><a href="/today-deals.html">Today's Deals</a></li>
          <li><a href="/sell.html">Sell on Amazon</a></li>
        </ul>
        <div style="margin-top:14px"><a href="/cart.html" class="btn btn-orange" style="display:inline-block;text-align:center;width:auto">View Cart</a></div>
      </div>
    </div>
  `;
  const btn = document.getElementById('mobileMenuBtn');
  const panel = document.getElementById('mobilePanel');
  if (btn && panel) btn.onclick = () => panel.classList.toggle('open');
}

function renderFooter() {
  document.getElementById('footer').innerHTML = `
    <div class="container">
      <div class="footer-cols">
        <div class="footer-col">
          <h4>Get to Know Us</h4>
          <ul><li><a href="/help.html">Customer Service</a></li><li><a href="/returns.html">Return &amp; Refund</a></li><li><a href="/contact-us.html">Contact Us</a></li></ul>
        </div>
        <div class="footer-col">
          <h4>Sell on Amazon</h4>
          <ul><li><a href="/sell.html">Start a Selling Account</a></li><li><a href="/seller-dashboard.html">Seller Dashboard</a></li><li><a href="/add-product.html">Add a Product</a></li></ul>
        </div>
        <div class="footer-col">
          <h4>Your Account</h4>
          <ul><li><a href="/account.html">My Account</a></li><li><a href="/orders.html">My Orders</a></li><li><a href="/addresses.html">My Addresses</a></li><li><a href="/payment-methods.html">Payment Methods</a></li><li><a href="/wishlist.html">Wishlist</a></li></ul>
        </div>
      </div>
      <div class="footer-bottom">&#169; 2026, Amazon Clone (Demo Project). Built with Node.js, Express &amp; SQLite. No real payments.</div>
    </div>`;
}

function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.style.display = 'block'; setTimeout(() => { t.style.display = 'none'; }, 2500);
}

function requireAuth() {
  if (!localStorage.getItem(TOKEN_KEY)) { location.href = '/login.html?next=' + encodeURIComponent(location.pathname); }
}

async function initCommon() {
  await renderHeader();
  renderNav();
  renderFooter();
}

document.addEventListener('DOMContentLoaded', initCommon);
