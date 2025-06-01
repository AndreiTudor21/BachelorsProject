const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.resolve(__dirname, 'users.db'), (err) => {
  if (err) console.error('Could not connect to database', err);
  else console.log('Connected to SQLite DB');
});

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    fullname TEXT NOT NULL,
    password TEXT NOT NULL
  )
`);

module.exports = db;
