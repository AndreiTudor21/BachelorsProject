const http = require('http');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { parse } = require('querystring');

const saltRounds = 10;
const db = require('./database/db');


  function parseCookies(req) {
  const list = {};
  const cookieHeader = req.headers?.cookie;
  if (!cookieHeader) return list;

  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.trim().split('=');
    const value = rest.join('=');
    list[name] = decodeURIComponent(value);
  });

  return list;
  }
  function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
  }
  function minutesToTime(m) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
  }

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url.startsWith('/static/')) {
    const filePath = path.join(__dirname, req.url);

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      let contentType = 'application/octet-stream';
      if (ext === '.css') contentType = 'text/css';
      else if (ext === '.js') contentType = 'application/javascript';
      else if (ext === '.html') contentType = 'text/html';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
    return;
  }
  if (req.method === 'GET' && req.url === '/patient-appointments') {
  const cookies = parseCookies(req);
  const patientEmail = cookies.userEmail;

  if (!patientEmail) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'User not logged in' }));
  }

  db.get('SELECT id FROM Patients WHERE email = ?', [patientEmail], (err, patientRow) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Database error while looking up patient' }));
    }

    if (!patientRow) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Patient not found' }));
    }

    const patientId = patientRow.id;

    const query = `
      SELECT
        Appointments.id AS appointment_id,
        Appointments.notes,
        Appointments.status,
        Schedule.date,
        Schedule.start_time,
        Doctors.surname AS doctor_surname,
        Doctors.last_name AS doctor_last_name,
        Doctors.specialization
      FROM Appointments
      JOIN Schedule ON Appointments.schedule_id = Schedule.id
      JOIN Doctors ON Schedule.doctor_id = Doctors.id
      WHERE Appointments.patient_id = ?
      ORDER BY Schedule.date DESC, Schedule.start_time ASC
    `;

    db.all(query, [patientId], (err, rows) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Error fetching appointments' }));
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(rows));
    });
  });

  return;
  }
  if (req.method === 'GET' && req.url === '/doctor-appointments') {
  const cookies = parseCookies(req);
  const doctorEmail = cookies.userEmail;

  if (!doctorEmail) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'User not logged in' }));
  }

  db.get('SELECT id, specialization FROM Doctors WHERE email = ?', [doctorEmail], (err, doctorRow) => {
    if (err || !doctorRow) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Doctor not found or DB error' }));
    }

    const doctorId = doctorRow.id;

    const query = `
      SELECT
        Appointments.id AS appointment_id,
        Appointments.notes,
        Schedule.date,
        Schedule.start_time,
        Patients.surname || ' ' || Patients.last_name AS patient_name
      FROM Appointments
      JOIN Schedule ON Appointments.schedule_id = Schedule.id
      JOIN Patients ON Appointments.patient_id = Patients.id
      WHERE Schedule.doctor_id = ?
      ORDER BY Schedule.date DESC, Schedule.start_time ASC
    `;

    db.all(query, [doctorId], (err, rows) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Error fetching doctor appointments' }));
      }

      const enriched = rows.map(row => ({
        ...row,
        specialization: doctorRow.specialization,
        location: "THE CLINIC",
        status: row.notes && row.notes.trim() !== "" ? "Honored" : "Not Honored"
      }));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(enriched));
    });
  });

  return;
  }
  if (req.method === 'GET') {
    let filePath = '';
    if (req.url === '/' || req.url === '/LogIn.html') {
      filePath = path.join(__dirname, 'Pages', 'LogIn.html');
    } else if (req.url === '/Register.html') {
      filePath = path.join(__dirname, 'Pages', 'Register.html');
    } else if (req.url === '/Patient.html') {
      filePath = path.join(__dirname, 'Pages', 'Patient.html');
    } else if (req.url === '/Admin.html') {
      filePath = path.join(__dirname, 'Pages', 'Admin.html');
    } else if (req.url === '/Doctor.html') {
      filePath = path.join(__dirname, 'Pages', 'Doctor.html');}
      else {
      res.writeHead(404);
      res.end('Page not found');
      return;
    }

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Server error');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
    });
    return;
  }
  if (req.method === 'POST' && req.url === '/submit') {
  let body = '';

  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    const formData = Object.fromEntries(new URLSearchParams(body));
    const { email, surname, last_name, password } = formData;

    db.get('SELECT * FROM Patients WHERE email = ?', [email], (err, patient) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        return res.end(`
          <div class="alert alert-danger" role="alert">
            Database error occurred.
          </div>
        `);
      }

      if (patient) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end(`
          <div class="alert alert-danger" role="alert">
            An account with this email already exists.
          </div>
        `);
      }

      db.get('SELECT * FROM Doctors WHERE email = ?', [email], (err, doctor) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/html' });
          return res.end(`
            <div class="alert alert-danger" role="alert">
              Database error occurred.
            </div>
          `);
        }

        if (doctor) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          return res.end(`
            <div class="alert alert-danger" role="alert">
              An account with this email already exists.
            </div>
          `);
        }

        bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'text/html' });
            return res.end(`
              <div class="alert alert-danger" role="alert">
                Error hashing password.
              </div>
            `);
          }

          db.run(
            'INSERT INTO Patients (email, surname, last_name, password) VALUES (?, ?, ?, ?)',
            [email, surname, last_name, hashedPassword],
            (err) => {
              if (err) {
                res.writeHead(500, { 'Content-Type': 'text/html' });
                return res.end(`
                  <div class="alert alert-danger" role="alert">
                    Failed to create account.
                  </div>
                `);
              }

              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(`
                <div class="alert alert-success" role="alert">
                  Account created successfully! Redirecting to login...
                </div>
              `);
            }
          );
        });
      });
    });
  });

  return;
  }
  if (req.method === 'POST' && req.url === '/login') {
    let body = "";

    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const { email, password } = Object.fromEntries(new URLSearchParams(body));

      if (email === "admin@admin.com") {
        db.get("SELECT * FROM Patients WHERE email = ?", [email], (err, user) => {
          if (err) {
            res.writeHead(500, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ error: "Database error" }));
          }

          if (!user) {
            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ error: "No account found for those credentials." }));
          }

          bcrypt.compare(password, user.password, (err, ok) => {
            if (!ok || err) {
              res.writeHead(200, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ error: "No account found for those credentials." }));
            }

            res.writeHead(200, {
              "Content-Type": "application/json",
              "Set-Cookie": `userEmail=${encodeURIComponent(email)}; HttpOnly; Path=/; SameSite=Lax`,
            });
            return res.end(JSON.stringify({ redirect: "/Admin.html" }));
          });
        });
        return;
      }

      db.get("SELECT * FROM Patients WHERE email = ?", [email], (err, patient) => {
        if (err) {
          res.writeHead(500, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "Database error" }));
        }

        if (patient) {
          return bcrypt.compare(password, patient.password, (err, ok) => {
            if (!ok || err) {
              res.writeHead(200, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ error: "No account found for those credentials." }));
            }

            res.writeHead(200, {
              "Content-Type": "application/json",
              "Set-Cookie": `userEmail=${encodeURIComponent(email)}; HttpOnly; Path=/; SameSite=Lax`,
            });
            return res.end(JSON.stringify({ redirect: "/Patient.html" }));
          });
        }

        db.get("SELECT * FROM Doctors WHERE email = ?", [email], (err, doctor) => {
          if (err) {
            res.writeHead(500, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ error: "Database error" }));
          }

          if (!doctor) {
            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ error: "No account found for those credentials." }));
          }

          return bcrypt.compare(password, doctor.password, (err, ok) => {
            if (!ok || err) {
              res.writeHead(200, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ error: "No account found for those credentials." }));
            }

            res.writeHead(200, {
              "Content-Type": "application/json",
              "Set-Cookie": `userEmail=${encodeURIComponent(email)}; HttpOnly; Path=/; SameSite=Lax`,
            });
            return res.end(JSON.stringify({ redirect: "/Doctor.html" }));
          });
        });
      });
    });
    return;
  }
  if (req.method === 'POST' && req.url === '/admin-create') {
  let body = '';

  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    const formData = Object.fromEntries(new URLSearchParams(body));
    const { email, surname, last_name, password, type, specialization } = formData;

    if (!email || !surname || !last_name || !password || !type || (type === 'Doctor' && !specialization)) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      return res.end(`
        <div class="alert alert-danger" role="alert">
          Missing required fields.
        </div>
      `);
    }

    db.get('SELECT * FROM Patients WHERE email = ?', [email], (err, patient) => {
      if (err) {
        console.error('DB Lookup error (Patients):', err);
        res.writeHead(500, { 'Content-Type': 'text/html' });
        return res.end(`
          <div class="alert alert-danger" role="alert">
            Database error during patient lookup.
          </div>
        `);
      }

      if (patient) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end(`
          <div class="alert alert-danger" role="alert">
            An account with this email already exists in Patients.
          </div>
        `);
      }

      db.get('SELECT * FROM Doctors WHERE email = ?', [email], (err, doctor) => {
        if (err) {
          console.error('DB Lookup error (Doctors):', err);
          res.writeHead(500, { 'Content-Type': 'text/html' });
          return res.end(`
            <div class="alert alert-danger" role="alert">
              Database error during doctor lookup.
            </div>
          `);
        }

        if (doctor) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          return res.end(`
            <div class="alert alert-danger" role="alert">
              An account with this email already exists in Doctors.
            </div>
          `);
        }

        bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
          if (err) {
            console.error('Password hashing error:', err);
            res.writeHead(500, { 'Content-Type': 'text/html' });
            return res.end(`
              <div class="alert alert-danger" role="alert">
                Error hashing password.
              </div>
            `);
          }

          if (type === 'Doctor') {
            db.run(
              'INSERT INTO Doctors (email, surname, last_name, password, specialization) VALUES (?, ?, ?, ?, ?)',
              [email, surname, last_name, hashedPassword, specialization],
              err => {
                if (err) {
                  console.error('DB Insert error (Doctor):', err);
                  res.writeHead(500, { 'Content-Type': 'text/html' });
                  return res.end(`
                    <div class="alert alert-danger" role="alert">
                      Error saving doctor to the database.
                    </div>
                  `);
                }

                res.writeHead(200, { 'Content-Type': 'text/html' });
                return res.end(`
                  <div class="alert alert-success" role="alert">
                    Doctor account created successfully!
                  </div>
                `);
              }
            );
          } else {
            db.run(
              'INSERT INTO Patients (email, surname, last_name, password) VALUES (?, ?, ?, ?)',
              [email, surname, last_name, hashedPassword],
              err => {
                if (err) {
                  console.error('DB Insert error (Patient):', err);
                  res.writeHead(500, { 'Content-Type': 'text/html' });
                  return res.end(`
                    <div class="alert alert-danger" role="alert">
                      Error saving patient to the database.
                    </div>
                  `);
                }

                res.writeHead(200, { 'Content-Type': 'text/html' });
                return res.end(`
                  <div class="alert alert-success" role="alert">
                    Patient account created successfully!
                  </div>
                `);
              }
            );
          }
        });
      });
    });
  });

  return;
  }
  if (req.method === 'POST' && req.url === '/schedule') {
  let body = '';

  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    const formData = Object.fromEntries(new URLSearchParams(body));
    const { date, start_time, end_time } = formData;

    const cookies = parseCookies(req);
    const doctorEmail = cookies.userEmail;

    if (!doctorEmail || !date || !start_time || !end_time) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      return res.end(`
        <div class="alert alert-danger" role="alert">
          Missing required fields or not logged in.
        </div>
      `);
    }

    db.get('SELECT id FROM Doctors WHERE email = ?', [doctorEmail], (err, doctor) => {
      if (err || !doctor) {
        console.error('Doctor lookup error:', err);
        res.writeHead(500, { 'Content-Type': 'text/html' });
        return res.end(`
          <div class="alert alert-danger" role="alert">
            Doctor not found.
          </div>
        `);
      }

      const doctorId = doctor.id;
      const startMin = timeToMinutes(start_time);
      const endMin = timeToMinutes(end_time);

      if (endMin <= startMin) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        return res.end(`
          <div class="alert alert-danger" role="alert">
            End time must be after start time.
          </div>
        `);
      }

      db.all('SELECT start_time, end_time FROM Schedule WHERE doctor_id = ? AND date = ?', [doctorId, date], (err, existingSchedules) => {
        if (err) {
          console.error('Schedule fetch error:', err);
          res.writeHead(500, { 'Content-Type': 'text/html' });
          return res.end(`
            <div class="alert alert-danger" role="alert">
              Database error fetching schedules.
            </div>
          `);
        }

        const overlaps = existingSchedules.some(s => {
          const sStart = timeToMinutes(s.start_time);
          const sEnd = timeToMinutes(s.end_time);
          return Math.max(startMin, sStart) < Math.min(endMin, sEnd);
        });

        if (overlaps) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          return res.end(`
            <div class="alert alert-danger" role="alert">
              Schedule already set for that time-frame.
            </div>
          `);
        }

        const inserts = [];
        for (let t = startMin; t < endMin; t += 60) {
          const blockStart = minutesToTime(t);
          const blockEnd = minutesToTime(Math.min(t + 60, endMin));

          inserts.push(new Promise((resolve, reject) => {
            db.run(
              'INSERT INTO Schedule (doctor_id, date, start_time, end_time) VALUES (?, ?, ?, ?)',
              [doctorId, date, blockStart, blockEnd],
              err => (err ? reject(err) : resolve())
            );
          }));
        }

        Promise.all(inserts)
          .then(() => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <div class="alert alert-success" role="alert">
                Schedule successfully created!
              </div>
            `);
          })
          .catch(err => {
            console.error('Insertion error:', err);
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end(`
              <div class="alert alert-danger" role="alert">
                Error saving schedule entries.
              </div>
            `);
          });
      });
    });
  });

  return;
  }
  if (req.method === 'POST' && req.url === '/appointment') {
  let body = '';

  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    const formData = Object.fromEntries(new URLSearchParams(body));
    const { specialization, date, time } = formData;


    if (!specialization || !date || !time) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      return res.end(`
        <div class="alert alert-danger" role="alert">
          Missing required fields or not logged in.
        </div>
      `);
    }
      const sql = `
        SELECT 
          Schedule.id as schedule_id,
          Doctors.surname, Doctors.last_name, Doctors.specialization,
          Schedule.date, Schedule.start_time, Schedule.end_time
        FROM Schedule
        JOIN Doctors ON Schedule.doctor_id = Doctors.id
        LEFT JOIN Appointments ON Schedule.id = Appointments.schedule_id
        WHERE Doctors.specialization = ?
          AND Schedule.date = ?
          AND Schedule.start_time >= ?
          AND Appointments.id IS NULL
        ORDER BY Schedule.start_time ASC LIMIT 3
      `;

      db.all(sql, [specialization, date, time], (err, slots) => {
        if (err) {
          console.error('Appointment fetch error:', err);
          res.writeHead(500, { 'Content-Type': 'text/html' });
          return res.end(`
            <div class="alert alert-danger" role="alert">
              Database error fetching available slots.
            </div>
          `);
        }

        if (!slots.length) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          return res.end(`
            <div class="alert alert-warning" role="alert">
              No available slots for that specialization and date after the requested time.
            </div>
          `);
        }

        const alertHtml = `
        <div class="alert alert-info" role="alert">
          We found the following appointments for you:
        </div>`;

        const cardsHtml = slots.map(slot => `
          <div class="card mb-3">
            <div class="card-body">
              <h5 class="card-title">${slot.surname} ${slot.last_name} (${slot.specialization})</h5>
              <p class="card-text">Date: ${slot.date} | Time: ${slot.start_time} - ${slot.end_time}</p>
              <button class="btn btn-primary create-appointment-btn" data-schedule-id="${slot.schedule_id}">Create Appointment</button>
            </div>
          </div>
        `).join('');

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(alertHtml + cardsHtml);
      });
    
  });

  return;
  }
  if (req.method === 'POST' && req.url === '/create-appointment') {
  let body = '';

  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    const formData = Object.fromEntries(new URLSearchParams(body));
    const { schedule_id } = formData;

    const cookies = parseCookies(req);
    const patientEmail = cookies.userEmail;

    if (!patientEmail || !schedule_id) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Missing required info or not logged in' }));
    }

    db.get('SELECT id FROM Patients WHERE email = ?', [patientEmail], (err, patient) => {
      if (err || !patient) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Patient not found' }));
      }

      db.get('SELECT * FROM Appointments WHERE schedule_id = ?', [schedule_id], (err, appointment) => {
        if (appointment) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Slot already booked' }));
        }

        db.run(
          'INSERT INTO Appointments (patient_id, schedule_id, status) VALUES (?, ?, ?)',
          [patient.id, schedule_id, 0],
          err => {
            if (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({ error: 'Failed to book appointment' }));
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          }
        );
      });
    });
  });

  return;
  }
  if (req.method === 'POST' && req.url === '/add-notes') {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    const { appointment_id, notes } = Object.fromEntries(new URLSearchParams(body));

    if (!appointment_id || !notes) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: 'Missing fields' }));
    }

    db.run('UPDATE Appointments SET notes = ? WHERE id = ?', [notes, appointment_id], function (err) {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: 'Database error' }));
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    });
  });
  return;
  }






  res.writeHead(404);
  res.end('Not found');
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});