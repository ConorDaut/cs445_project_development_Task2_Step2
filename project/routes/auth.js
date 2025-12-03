// routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');

module.exports = function(render) {
  const router = express.Router();

  router.get('/', (req, res) => render(res, 'index.html', { title: 'Home' }));

  // Standard user login
  router.get('/login', (req, res) => render(res, 'login.html', { title: 'User login' }));
  router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return render(res, 'login.html', { title: 'User login', message: 'Invalid email or password.' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return render(res, 'login.html', { title: 'User login', message: 'Invalid email or password.' });
    req.session.userId = user.id;
    req.session.role = 'user';
    res.redirect('/user/dashboard');
  });

  // Create account (signup)
  router.get('/signup', (req, res) => render(res, 'signup.html', { title: 'Create account' }));
  router.post('/signup', async (req, res) => {
    const { company, email, password } = req.body;
    if (!company || !email || !password) {
      return render(res, 'signup.html', { title: 'Create account', message: 'All fields are required.' });
    }
    const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return render(res, 'signup.html', { title: 'Create account', message: 'An account with that email already exists.' });
    }
    const hash = await bcrypt.hash(password, 10);
    await db.run('INSERT INTO users (company, email, password_hash) VALUES (?, ?, ?)', [company, email, hash]);
    // Return to login page, database updated
    render(res, 'login.html', { title: 'User login', message: 'Account created. Please log in.' });
  });

  // Logout
  router.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/'));
  });

  // Admin login and reset are in admin routes but mount shortcut paths:
  router.get('/admin/login', (req, res) => res.redirect('/admin/login'));

  return router;
};
