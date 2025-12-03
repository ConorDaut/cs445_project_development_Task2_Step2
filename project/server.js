// server.js
const express = require('express');
const path = require('path');
const session = require('express-session');
const methodOverride = require('method-override');
const dotenv = require('dotenv');
const db = require('./db');

dotenv.config();

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret-key',
  resave: false,
  saveUninitialized: false
}));
app.use(express.static(path.join(__dirname, 'public')));

// Simple template render using layout wrapper
function render(res, view, params = {}) {
  const fs = require('fs');
  const layout = fs.readFileSync(path.join(__dirname, 'views', 'layout.html'), 'utf8');
  const content = fs.readFileSync(path.join(__dirname, 'views', view), 'utf8');
  const merged = layout
    .replace('{{content}}', content)
    .replace('{{title}}', params.title || 'Dashboard')
    .replace('{{message}}', params.message || '')
    .replace('{{data}}', JSON.stringify(params.data || {}));
  res.send(merged);
}

// Routes
const authRoutes = require('./routes/auth')(render);
const userRoutes = require('./routes/user')(render);
const adminRoutes = require('./routes/admin')(render);

app.use('/', authRoutes);
app.use('/user', userRoutes);
app.use('/admin', adminRoutes);

// Seed/init db if flagged
if (process.argv.includes('--init-db')) {
  db.init()
    .then(() => {
      console.log('Database initialized.');
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  await db.init();
  console.log(`Server running on http://localhost:${PORT}`);
});
