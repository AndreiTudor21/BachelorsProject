const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const saltRounds = 10;
const db = new sqlite3.Database('users.db');

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    fullname TEXT NOT NULL,
    password TEXT NOT NULL,
    type TEXT NOT NULL,
    specialization TEXT
  );

  CREATE TABLE IF NOT EXISTS schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    day TEXT NOT NULL,
    hour TEXT NOT NULL,
    specialization TEXT NOT NULL,
    FOREIGN KEY (email) REFERENCES users(email)
  );
`);

bcrypt.hash('admin', saltRounds, (err, hashedPassword) => {
  if (err) {
    console.error('Error hashing admin password:', err);
    return;
  }

  db.run(
    `INSERT OR IGNORE INTO users (email, fullname, password, type)
     VALUES (?, ?, ?, ?)`,
    ['admin@admin.com', 'admin', hashedPassword, 'admin'],
    (err) => {
      if (err) {
        console.error('Error inserting admin user:', err);
      }
    }
  );
});

module.exports = db;
