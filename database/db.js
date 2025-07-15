const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const saltRounds = 10;
const db = new sqlite3.Database('database.db');

db.serialize(() => {
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
  `, () => {
    db.run(`
      CREATE TRIGGER IF NOT EXISTS update_status_when_notes_added
      AFTER UPDATE OF notes ON Appointments
      FOR EACH ROW
      WHEN NEW.notes IS NOT NULL AND TRIM(NEW.notes) != ''
      BEGIN
        UPDATE Appointments
        SET status = 1
        WHERE id = NEW.id;
      END;
    `);
  });

  //Mock Data ---------------
  bcrypt.hash('admin', saltRounds, (err, hashedPassword) => {
    if (err) return console.error('Error hashing admin password:', err);

    db.run(
      `INSERT OR IGNORE INTO Patients (email, surname, last_name, password)
       VALUES (?, ?, ?, ?)`,
      ['admin@admin.com', 'admin', 'admin', hashedPassword],
      err => {
        if (err) console.error('Error inserting admin user:', err);
        else console.log('Inserted admin');
      }
    );
  });

  const specializations = ["Cardiology", "Neurology", "Pediatrics", "Dermatology", "Psychiatry", "Orthopedics"];

  specializations.forEach(spec => {
    const email = `${spec.toLowerCase()}@doctor.com`;
    const surname = `${spec}Doc`;
    const lastName = "Demo";

    bcrypt.hash('doctor', saltRounds, (err, hashedPassword) => {
      if (err) return console.error(`Hash error for ${spec}:`, err);

      db.run(
        `INSERT OR IGNORE INTO Doctors (email, surname, last_name, specialization, password)
         VALUES (?, ?, ?, ?, ?)`,
        [email, surname, lastName, spec, hashedPassword],
        err => {
          if (err) console.error(`Insert error for ${spec} doctor:`, err);
          else console.log(`Inserted doctor for specialization: ${spec}`);
        }
      );
    });
  });
});

module.exports = db;
