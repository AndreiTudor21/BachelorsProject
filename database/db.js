const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const saltRounds = 10;
const db = new sqlite3.Database('database.db');

db.run(`
  CREATE TABLE IF NOT EXISTS Patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    surname TEXT NOT NULL,
    last_name TEXT NOT NULL,
    password TEXT NOT NULL
  )
`);
db.run(`
  CREATE TABLE IF NOT EXISTS Doctors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    surname TEXT NOT NULL,
    last_name TEXT NOT NULL,
    password TEXT NOT NULL,
    specialization TEXT NOT NULL
  )
`);
db.run(`
  CREATE TABLE IF NOT EXISTS Schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doctor_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    FOREIGN KEY (doctor_id) REFERENCES Doctors (id)
  )
`);
db.run(`
  CREATE TABLE IF NOT EXISTS Appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    schedule_id INTEGER NOT NULL,
    status BOOLEAN,
    notes TEXT,
    FOREIGN KEY (patient_id) REFERENCES Patients (id),
    FOREIGN KEY (schedule_id) REFERENCES Schedule (id)
  )
`);


bcrypt.hash('admin', saltRounds, (err, hashedPassword) => {
  if (err) {
    console.error('Error hashing admin password:', err);
    return;
  }

  db.run(
    `INSERT OR IGNORE INTO Patients (email, surname, last_name, password)
     VALUES (?, ?, ?, ?)`,
    ['admin@admin.com', 'admin', 'admin', hashedPassword],
    (err) => {
      if (err) {
        console.error('Error inserting admin user:', err);
      }
    }
  );
});

module.exports = db;
