// routes/user.js
const express = require('express');
const db = require('../db');

function requireUser(req, res, next) {
  if (req.session.role === 'user' && req.session.userId) return next();
  res.redirect('/login');
}

module.exports = function(render) {
  const router = express.Router();

  router.get('/dashboard', requireUser, async (req, res) => {
    const user = await db.get('SELECT company, email FROM users WHERE id = ?', [req.session.userId]);
    const orders = await db.all(`
      SELECT o.*, p.name AS part_name
      FROM orders o
      JOIN parts p ON p.id = o.part_id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
      LIMIT 10
    `, [req.session.userId]);
    render(res, 'dashboard.html', { title: 'User dashboard', data: { company: user.company, email: user.email, orders } });
  });

  router.get('/account', requireUser, async (req, res) => {
    const user = await db.get('SELECT company, email FROM users WHERE id = ?', [req.session.userId]);
    render(res, 'account.html', { title: 'Account', data: user });
  });

  // Order parts flow: select part, quantity, input payment, checkout
  router.get('/order', requireUser, async (req, res) => {
    const parts = await db.all('SELECT * FROM parts ORDER BY name ASC');
    render(res, 'order.html', { title: 'Order parts', data: { parts } });
  });

  router.post('/order', requireUser, async (req, res) => {
    const { part_id, quantity, card_number, expiry, cvc } = req.body;
    const part = await db.get('SELECT * FROM parts WHERE id = ?', [part_id]);
    if (!part) return render(res, 'order.html', { title: 'Order parts', message: 'Invalid part selected.', data: { parts: await db.all('SELECT * FROM parts') } });
    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    const amount = part.price * qty;
    // Payment info would be processed here; for demo, accept any input.
    await db.run('INSERT INTO orders (user_id, part_id, quantity, amount, status) VALUES (?, ?, ?, ?, ?)', [req.session.userId, part.id, qty, amount, 'pending']);
    // After ordering, return to dashboard; order appears pending; database updated
    res.redirect('/user/dashboard');
  });

  router.get('/orders', requireUser, async (req, res) => {
    const current = await db.all(`
      SELECT o.*, p.name AS part_name
      FROM orders o JOIN parts p ON p.id = o.part_id
      WHERE o.user_id = ? AND o.status IN ('pending','active')
      ORDER BY o.created_at DESC
    `, [req.session.userId]);
    const previous = await db.all(`
      SELECT o.*, p.name AS part_name
      FROM orders o JOIN parts p ON p.id = o.part_id
      WHERE o.user_id = ? AND o.status IN ('cancelled','complete')
      ORDER BY o.created_at DESC
    `, [req.session.userId]);
    render(res, 'orders.html', { title: 'Your orders', data: { current, previous } });
  });

  return router;
};
