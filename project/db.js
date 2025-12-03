// db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'data.sqlite');

let db;

function connect() {
  if (!db) db = new sqlite3.Database(dbPath);
  return db;
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    connect().run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    connect().all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    connect().get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function init() {
  const ddl = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await run('PRAGMA foreign_keys = ON;');
  await new Promise((resolve, reject) => connect().exec(ddl, (err) => err ? reject(err) : resolve()));
  // Seed one admin if not exists
  const admin = await get('SELECT * FROM admins LIMIT 1');
  if (!admin) {
    await run('INSERT INTO admins (username, password_hash) VALUES (?, ?)', ['admin', '$2b$10$QOmM9Kf3tqP5NQ0C2Sdf6u9oEJYQkIYV/nYQ2sCtpXl3Sn0bO7KCy']); // password: admin123
  }
  // Seed parts
  const parts = await all('SELECT * FROM parts');
  if (parts.length === 0) {
    await run('INSERT INTO parts (name, description, price) VALUES (?, ?, ?)', ['Widget A', 'Standard widget', 19.99]);
    await run('INSERT INTO parts (name, description, price) VALUES (?, ?, ?)', ['Widget B', 'Premium widget', 49.99]);
    await run('INSERT INTO parts (name, description, price) VALUES (?, ?, ?)', ['Gear X', 'Industrial gear', 89.5]);
  }
}

module.exports = {
  init,
  run,
  all,
  get
};
