// routes/admin.js
const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');

function requireAdmin(req, res, next) {
  if (req.session.role === 'admin' && req.session.adminId) return next();
  res.redirect('/admin/login');
}

module.exports = function(render) {
  const router = express.Router();

  router.get('/login', (req, res) => render(res, 'admin_login.html', { title: 'Admin login' }));
  router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const admin = await db.get('SELECT * FROM admins WHERE username = ?', [username]);
    if (!admin) return render(res, 'admin_login.html', { title: 'Admin login', message: 'Invalid credentials.' });
    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) return render(res, 'admin_login.html', { title: 'Admin login', message: 'Invalid credentials.' });
    req.session.adminId = admin.id;
    req.session.role = 'admin';
    res.redirect('/admin/dashboard');
  });

  // Admin reset password (forget password option)
  router.post('/reset', async (req, res) => {
    const { username, new_password } = req.body;
    const admin = await db.get('SELECT * FROM admins WHERE username = ?', [username]);
    if (!admin) return render(res, 'admin_login.html', { title: 'Admin login', message: 'Admin not found.' });
    const hash = await bcrypt.hash(new_password, 10);
    await db.run('UPDATE admins SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [hash, admin.id]);
    render(res, 'admin_login.html', { title: 'Admin login', message: 'Password updated. Please log in.' });
  });

  router.get('/dashboard', requireAdmin, (req, res) => {
    render(res, 'admin_dashboard.html', { title: 'Admin dashboard' });
  });

  // View current or previous orders
  router.get('/orders', requireAdmin, async (req, res) => {
    const type = req.query.type === 'previous' ? 'previous' : 'current';
    const statusList = type === 'previous' ? ['cancelled','complete'] : ['pending','active'];
    const orders = await db.all(`
      SELECT o.*, u.email, u.company, p.name AS part_name
      FROM orders o
      JOIN users u ON u.id = o.user_id
      JOIN parts p ON p.id = o.part_id
      WHERE o.status IN (${statusList.map(() => '?').join(',')})
      ORDER BY o.created_at DESC
    `, statusList);
    render(res, 'admin_orders.html', { title: type === 'previous' ? 'Previous orders' : 'Current orders', data: { orders, title: type === 'previous' ? 'Previous orders' : 'Current orders' } });
  });

  // View all standard users
  router.get('/users', requireAdmin, async (req, res) => {
    const users = await db.all('SELECT id, company, email, created_at FROM users ORDER BY created_at DESC');
    render(res, 'admin_users.html', { title: 'Standard users', data: { users } });
  });

  // Sort orders: by date, company, status
  router.get('/sort', requireAdmin, async (req, res) => {
    const by = req.query.by || 'date';
    let orderBy = 'o.created_at DESC';
    if (by === 'company') orderBy = 'u.company ASC, o.created_at DESC';
    if (by === 'status') orderBy = "CASE o.status WHEN 'pending' THEN 1 WHEN 'active' THEN 2 WHEN 'complete' THEN 3 WHEN 'cancelled' THEN 4 END, o.created_at DESC";
    const orders = await db.all(`
      SELECT o.*, u.email, u.company, p.name AS part_name
      FROM orders o
      JOIN users u ON u.id = o.user_id
      JOIN parts p ON p.id = o.part_id
      ORDER BY ${orderBy}
    `);
    render(res, 'admin_sort.html', { title: 'Sort orders', data: { orders } });
  });

  // Update or modify orders: choose order, set status
  router.get('/update-order', requireAdmin, async (req, res) => {
    const orders = await db.all(`
      SELECT o.*, u.email, u.company, p.name AS part_name
      FROM orders o
      JOIN users u ON u.id = o.user_id
      JOIN parts p ON p.id = o.part_id
      ORDER BY o.created_at DESC
    `);
    let selected = null;
    const { order_id } = req.query;
    if (order_id) {
      selected = await db.get(`
        SELECT o.*, u.email, u.company, p.name AS part_name
        FROM orders o
        JOIN users u ON u.id = o.user_id
        JOIN parts p ON p.id = o.part_id
        WHERE o.id = ?
      `, [order_id]);
    }
    render(res, 'admin_update_order.html', { title: 'Update orders', data: { orders, selected } });
  });

  router.post('/update-order/:id', requireAdmin, async (req, res) => {
    const { status } = req.body;
    const valid = ['active','pending','cancelled','complete'];
    if (!valid.includes(status)) return res.redirect('/admin/update-order');
    await db.run('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, req.params.id]);
    res.redirect(`/admin/update-order?order_id=${req.params.id}`);
  });

  return router;
};
