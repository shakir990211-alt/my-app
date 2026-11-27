const express = require('express');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'amazon-clone-dev-secret-key';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
const db = new sqlite3.Database(path.join(dbDir, 'database.sqlite'));

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err); else resolve(this);
    });
  });
}
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => { if (err) reject(err); else resolve(rows); });
  });
}
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => { if (err) reject(err); else resolve(row); });
  });
}

async function initDb() {
  await run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'customer',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  await run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    category TEXT NOT NULL,
    image TEXT,
    stock INTEGER DEFAULT 0,
    rating REAL DEFAULT 0,
    reviews_count INTEGER DEFAULT 0,
    seller_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES users(id)
  )`);
  await run(`CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  )`);
  await run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    total REAL NOT NULL,
    status TEXT DEFAULT 'Processing',
    shipping_address TEXT,
    tracking_number TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);
  await run(`CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  )`);
  await run(`CREATE TABLE IF NOT EXISTS addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT DEFAULT 'Home',
    name TEXT,
    street TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    phone TEXT,
    is_default INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);
  await run(`CREATE TABLE IF NOT EXISTS payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT,
    last4 TEXT,
    expiry TEXT,
    is_default INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);
  await run(`CREATE TABLE IF NOT EXISTS wishlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  )`);
  await run(`CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    name TEXT,
    rating INTEGER NOT NULL,
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);
  await run(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);
  const count = await get('SELECT COUNT(*) AS c FROM users');
  if (count.c === 0) {
    const hash = await bcrypt.hash('password123', 10);
    await run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', ['Demo Customer', 'user@example.com', hash, 'customer']);
    await run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', ['Demo Seller', 'seller@example.com', hash, 'seller']);
    const seller = await get('SELECT id FROM users WHERE email = ?', ['seller@example.com']);
    const sellerId = seller.id;
    const products = [
      ['Apple iPhone 15', 'Latest iPhone with A16 chip, 48MP camera, and USB-C.', 799, 'Mobiles', 50, 4.8, 120, sellerId],
      ['Samsung Galaxy S24', 'AI-powered flagship with dynamic AMOLED display.', 899, 'Mobiles', 40, 4.7, 95, sellerId],
      ['Sony WH-1000XM5 Headphones', 'Industry-leading noise canceling wireless headphones.', 349, 'Electronics', 30, 4.9, 200, sellerId],
      ['Nikon D3500 DSLR Camera', 'Entry-level DSLR with 18-55mm lens and accessories.', 449, 'Electronics', 15, 4.8, 70, sellerId],
      ['Apple MacBook Air M2', 'Thin, light laptop with M2 chip and 18-hour battery.', 1199, 'Electronics', 30, 4.9, 180, sellerId],
      ['Nike Air Max Running Shoes', 'Comfortable running shoes for daily training.', 129, 'Fashion', 100, 4.5, 300, sellerId],
      ["Levi's 501 Original Jeans", 'Classic straight fit denim jeans.', 59, 'Fashion', 80, 4.6, 150, sellerId],
      ['Dyson V11 Vacuum Cleaner', 'Powerful cordless vacuum cleaner for home.', 599, 'Home & Kitchen', 25, 4.8, 80, sellerId],
      ['Instant Pot Duo 7-in-1', 'Pressure cooker, slow cooker, rice cooker and more.', 89, 'Home & Kitchen', 60, 4.7, 250, sellerId],
      ["L'Oreal Revitalift Serum", 'Anti-aging face serum with hyaluronic acid.', 24, 'Beauty', 120, 4.4, 90, sellerId],
      ['Maybelline Volum Express Mascara', 'Volumizing mascara for dramatic lashes.', 12, 'Beauty', 150, 4.3, 180, sellerId],
      ['Spalding NBA Basketball', 'Official NBA game basketball, indoor/outdoor.', 39, 'Sports', 70, 4.8, 60, sellerId],
      ['Adjustable Dumbbell Set 20kg', 'Home gym dumbbell set for strength training.', 89, 'Sports', 45, 4.6, 70, sellerId],
      ['LEGO City Police Station', 'Building toy set for kids ages 6+.', 79, 'Toys', 55, 4.9, 110, sellerId],
      ['Barbie Dreamhouse', 'Deluxe dollhouse with lights and sounds.', 199, 'Toys', 20, 4.7, 85, sellerId],
      ['Atomic Habits by James Clear', 'Bestselling self-help book on building good habits.', 15, 'Books', 200, 4.8, 500, sellerId],
      ['Harry Potter Complete Box Set', 'All 7 books in the Harry Potter series.', 49, 'Books', 90, 4.9, 400, sellerId],
      ['Organic Avocados (4 pack)', 'Fresh organic avocados from Mexico.', 6, 'Grocery', 300, 4.5, 60, sellerId],
      ['Almond Milk 1L Unsweetened', 'Plant-based almond milk, 1 liter carton.', 4, 'Grocery', 400, 4.4, 120, sellerId],
    ];
    for (const p of products) {
      await run('INSERT INTO products (title, description, price, category, stock, rating, reviews_count, seller_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', p);
    }
    const customer = await get('SELECT id FROM users WHERE email = ?', ['user@example.com']);
    const customerId = customer.id;
    await run('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)', [customerId, 1, 1]);
    await run('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)', [customerId, 6, 2]);
    await run('INSERT INTO orders (user_id, total, status, shipping_address, tracking_number, created_at) VALUES (?, ?, ?, ?, ?, ?)', [customerId, 1057, 'Shipped', '123 Demo Street, Demo City, Demo State 12345', 'AMZ123456789', new Date(Date.now() - 86400000 * 3).toISOString()]);
    const orderId = (await get('SELECT MAX(id) AS id FROM orders')).id;
    await run('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)', [orderId, 1, 1, 799]);
    await run('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)', [orderId, 6, 2, 129]);
    await run('INSERT INTO addresses (user_id, type, name, street, city, state, zip, phone, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [customerId, 'Home', 'Demo Customer', '123 Demo Street', 'Demo City', 'Demo State', '12345', '1234567890', 1]);
    await run('INSERT INTO addresses (user_id, type, name, street, city, state, zip, phone, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [customerId, 'Work', 'Demo Customer', '456 Office Road', 'Demo City', 'Demo State', '12345', '1234567890', 0]);
    await run('INSERT INTO payment_methods (user_id, type, last4, expiry, is_default) VALUES (?, ?, ?, ?, ?)', [customerId, 'Credit Card', '4242', '12/28', 1]);
    await run('INSERT INTO payment_methods (user_id, type, last4, expiry, is_default) VALUES (?, ?, ?, ?, ?)', [customerId, 'Debit Card', '5555', '09/26', 0]);
    await run('INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)', [customerId, 3]);
    await run('INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)', [customerId, 20]);
    await run('INSERT INTO reviews (product_id, user_id, name, rating, comment) VALUES (?, ?, ?, ?, ?)', [1, customerId, 'Demo Customer', 5, 'Amazing phone, highly recommended!']);
    await run('INSERT INTO reviews (product_id, user_id, name, rating, comment) VALUES (?, ?, ?, ?, ?)', [1, customerId, 'Demo Customer', 4, 'Great camera and battery life.']);
    await run('INSERT INTO notifications (user_id, message, is_read) VALUES (?, ?, ?)', [customerId, 'Your order #1 has been shipped and is on the way!', 0]);
    await run('INSERT INTO notifications (user_id, message, is_read) VALUES (?, ?, ?)', [customerId, 'Welcome to Amazon Clone! Start shopping today.', 1]);
  }
}
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
    req.user = user;
    next();
  });
}
function requireSeller(req, res, next) {
  if (req.user.role !== 'seller' && req.user.role !== 'admin') return res.status(403).json({ error: 'Seller access required.' });
  next();
}
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required.' });
    const existing = await get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return res.status(400).json({ error: 'Email is already registered.' });
    const hash = await bcrypt.hash(password, 10);
    const result = await run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hash]);
    const token = jwt.sign({ id: result.lastID, email, name, role: 'customer' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: result.lastID, name, email, role: 'customer' } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(400).json({ error: 'Invalid email or password.' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid email or password.' });
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  const user = await get('SELECT id FROM users WHERE email = ?', [email]);
  if (user) await run('INSERT INTO notifications (user_id, message, is_read) VALUES (?, ?, ?)', [user.id, 'A password reset link has been sent to your email (demo mode).', 0]);
  res.json({ message: 'If an account exists with that email, a reset link has been sent.' });
});
app.get('/api/products', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 50 } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (category) { where += ' AND category = ?'; params.push(category); }
    if (search) { where += ' AND (title LIKE ? OR description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    const count = await get(`SELECT COUNT(*) AS c FROM products ${where}`, params);
    const rows = await all(`SELECT * FROM products ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), (parseInt(page) - 1) * parseInt(limit)]);
    res.json({ products: rows, total: count.c, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.json({ product });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/products', authenticateToken, requireSeller, async (req, res) => {
  try {
    const { title, description, price, category, stock, image } = req.body;
    if (!title || !price || !category) return res.status(400).json({ error: 'Title, price and category are required.' });
    const result = await run('INSERT INTO products (title, description, price, category, image, stock, seller_id) VALUES (?, ?, ?, ?, ?, ?, ?)', [title, description || '', price, category, image || '/images/placeholder.jpg', stock || 0, req.user.id]);
    await run('INSERT INTO notifications (user_id, message) VALUES (?, ?)', [req.user.id, `Your product "${title}" has been listed!`]);
    res.status(201).json({ id: result.lastID, message: 'Product added successfully.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/products/:id', authenticateToken, requireSeller, async (req, res) => {
  try {
    const product = await get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    if (product.seller_id !== req.user.id) return res.status(403).json({ error: 'You can only edit your own products.' });
    const { title, description, price, category, stock, image } = req.body;
    await run('UPDATE products SET title = ?, description = ?, price = ?, category = ?, stock = ?, image = ? WHERE id = ?', [title, description, price, category, stock, image, req.params.id]);
    res.json({ message: 'Product updated successfully.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/products/:id', authenticateToken, requireSeller, async (req, res) => {
  try {
    const product = await get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    if (product.seller_id !== req.user.id) return res.status(403).json({ error: 'You can only delete your own products.' });
    await run('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Product deleted successfully.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ products: [], query: '' });
    const rows = await all("SELECT * FROM products WHERE title LIKE ? OR description LIKE ? ORDER BY created_at DESC", [`%${q}%`, `%${q}%`]);
    res.json({ products: rows, query: q });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/cart', authenticateToken, async (req, res) => {
  try {
    const rows = await all(`SELECT ci.id, ci.quantity, p.id AS product_id, p.title, p.price, p.image, p.stock FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.user_id = ? ORDER BY ci.created_at DESC`, [req.user.id]);
    res.json({ cart: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/cart', authenticateToken, async (req, res) => {
  try {
    const { product_id, quantity = 1 } = req.body;
    const product = await get('SELECT id FROM products WHERE id = ?', [product_id]);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    const existing = await get('SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?', [req.user.id, product_id]);
    if (existing) await run('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?', [quantity, existing.id]);
    else await run('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)', [req.user.id, product_id, quantity]);
    res.json({ message: 'Added to cart.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/cart/:id', authenticateToken, async (req, res) => {
  try {
    const { quantity } = req.body;
    await run('UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?', [quantity, req.params.id, req.user.id]);
    res.json({ message: 'Cart updated.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/cart/:id', authenticateToken, async (req, res) => {
  await run('DELETE FROM cart_items WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ message: 'Removed from cart.' });
});
app.post('/api/orders', authenticateToken, async (req, res) => {
  try {
    const cart = await all(`SELECT ci.id, ci.product_id, ci.quantity, p.price, p.title, p.image, p.stock FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.user_id = ?`, [req.user.id]);
    if (!cart.length) return res.status(400).json({ error: 'Your cart is empty.' });
    let total = 0;
    cart.forEach(i => { total += i.price * i.quantity; });
    const shippingAddress = req.body.address || 'Default shipping address on file';
    const result = await run('INSERT INTO orders (user_id, total, shipping_address) VALUES (?, ?, ?)', [req.user.id, total, shippingAddress]);
    const orderId = result.lastID;
    for (const item of cart) {
      await run('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)', [orderId, item.product_id, item.quantity, item.price]);
      await run('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product_id]);
    }
    await run('DELETE FROM cart_items WHERE user_id = ?', [req.user.id]);
    await run('INSERT INTO notifications (user_id, message) VALUES (?, ?)', [req.user.id, `Order #${orderId} placed successfully! Total: $${total.toFixed(2)}`]);
    res.status(201).json({ orderId, total, message: 'Order placed successfully!' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const orders = await all('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    for (const o of orders) {
      o.items = await all('SELECT oi.quantity, oi.price, p.title, p.image FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?', [o.id]);
    }
    res.json({ orders });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    const order = await get('SELECT * FROM orders WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    order.items = await all('SELECT oi.quantity, oi.price, p.title, p.image FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?', [order.id]);
    res.json({ order });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/orders/:id/tracking', authenticateToken, async (req, res) => {
  try {
    const order = await get('SELECT * FROM orders WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    res.json({ tracking: { number: order.tracking_number || 'AMZ' + String(Math.floor(Math.random() * 100000000)).padStart(8, '0'), status: order.status, estimatedDelivery: new Date(Date.now() + 86400000 * 3).toDateString() } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/addresses', authenticateToken, async (req, res) => {
  try {
    const rows = await all('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC', [req.user.id]);
    res.json({ addresses: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/addresses', authenticateToken, async (req, res) => {
  try {
    const { type, name, street, city, state, zip, phone } = req.body;
    const result = await run('INSERT INTO addresses (user_id, type, name, street, city, state, zip, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [req.user.id, type, name, street, city, state, zip, phone]);
    res.json({ id: result.lastID, message: 'Address added.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/addresses/:id', authenticateToken, async (req, res) => {
  try {
    const { type, name, street, city, state, zip, phone } = req.body;
    await run('UPDATE addresses SET type = ?, name = ?, street = ?, city = ?, state = ?, zip = ?, phone = ? WHERE id = ? AND user_id = ?', [type, name, street, city, state, zip, phone, req.params.id, req.user.id]);
    res.json({ message: 'Address updated.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/addresses/:id', authenticateToken, async (req, res) => {
  await run('DELETE FROM addresses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ message: 'Address deleted.' });
});
app.get('/api/payment-methods', authenticateToken, async (req, res) => {
  try {
    const rows = await all('SELECT * FROM payment_methods WHERE user_id = ? ORDER BY is_default DESC', [req.user.id]);
    res.json({ paymentMethods: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/payment-methods', authenticateToken, async (req, res) => {
  try {
    const { type, last4, expiry } = req.body;
    const result = await run('INSERT INTO payment_methods (user_id, type, last4, expiry) VALUES (?, ?, ?, ?)', [req.user.id, type, last4, expiry]);
    res.json({ id: result.lastID, message: 'Payment method added (demo only - no real charges).' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/payment-methods/:id', authenticateToken, async (req, res) => {
  await run('DELETE FROM payment_methods WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ message: 'Payment method removed.' });
});
app.get('/api/wishlist', authenticateToken, async (req, res) => {
  try {
    const rows = await all(`SELECT w.id, p.id AS product_id, p.title, p.price, p.image, p.category, p.rating FROM wishlist w JOIN products p ON w.product_id = p.id WHERE w.user_id = ? ORDER BY w.created_at DESC`, [req.user.id]);
    res.json({ wishlist: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/wishlist', authenticateToken, async (req, res) => {
  try {
    const { product_id } = req.body;
    const existing = await get('SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?', [req.user.id, product_id]);
    if (existing) return res.status(400).json({ error: 'Already in your wishlist.' });
    await run('INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)', [req.user.id, product_id]);
    res.json({ message: 'Added to wishlist.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/wishlist/:id', authenticateToken, async (req, res) => {
  await run('DELETE FROM wishlist WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ message: 'Removed from wishlist.' });
});
app.get('/api/reviews/:productId', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC', [req.params.productId]);
    res.json({ reviews: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/reviews', authenticateToken, async (req, res) => {
  try {
    const { product_id, rating, comment } = req.body;
    const user = await get('SELECT name FROM users WHERE id = ?', [req.user.id]);
    await run('INSERT INTO reviews (product_id, user_id, name, rating, comment) VALUES (?, ?, ?, ?, ?)', [product_id, req.user.id, user.name, rating, comment || '']);
    res.json({ message: 'Review added.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/seller/dashboard', authenticateToken, requireSeller, async (req, res) => {
  try {
    const products = await all('SELECT * FROM products WHERE seller_id = ? ORDER BY created_at DESC', [req.user.id]);
    const placeholders = products.map(() => '?').join(',');
    let orders = [];
    if (products.length) {
      orders = await all(`SELECT DISTINCT o.id, o.user_id, o.total, o.status, o.created_at, oi.product_id, oi.quantity, oi.price FROM orders o JOIN order_items oi ON o.id = oi.order_id WHERE oi.product_id IN (${placeholders}) ORDER BY o.created_at DESC`, products.map(p => p.id));
    }
    const totalSales = orders.reduce((sum, o) => sum + o.price * o.quantity, 0);
    res.json({ products, totalProducts: products.length, totalSales: totalSales.toFixed(2), orders });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/seller/products', authenticateToken, requireSeller, async (req, res) => {
  try {
    const rows = await all('SELECT * FROM products WHERE seller_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.json({ products: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/seller/orders', authenticateToken, requireSeller, async (req, res) => {
  try {
    const rows = await all(`SELECT DISTINCT o.* FROM orders o JOIN order_items oi ON o.id = oi.order_id JOIN products p ON oi.product_id = p.id WHERE p.seller_id = ? ORDER BY o.created_at DESC`, [req.user.id]);
    res.json({ orders: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const rows = await all('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.json({ notifications: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  await run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ message: 'Marked as read.' });
});
app.get('/product/:id', async (req, res) => {
  try {
    const product = await get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!product) return res.status(404).sendFile(path.join(__dirname, 'public/404.html'));
    let html = fs.readFileSync(path.join(__dirname, 'public/product.html'), 'utf8');
    html = html.replace('</head>', `<script id="product-data" type="application/json">${JSON.stringify(product)}</script></head>`);
    res.send(html);
  } catch (e) { res.status(500).send('Server error'); }
});
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public/404.html'));
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err && err.stack ? err.stack : err);
});
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err && err.stack ? err.stack : err);
});
initDb().then(() => {
  app.listen(PORT, () => console.log(`\n Amazon Clone running at http://localhost:${PORT}\n Demo Customer: user@example.com / password123\n Demo Seller:   seller@example.com / password123\n`));
});