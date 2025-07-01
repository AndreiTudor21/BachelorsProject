const http = require('http');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { parse } = require('querystring');

const saltRounds = 10;
const db = require('./database/db');

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

    if (!email || !surname || !last_name || !password) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing required fields');
      return;
    }

    db.get('SELECT * FROM Patients WHERE email = ?', [email], (err, patient) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        return res.end('Database error');
      }

      if (patient) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end(`
          <script>
            alert("An account with this email already exists.");
            window.location.href = "/Register.html";
          </script>
        `);
      }

      db.get('SELECT * FROM Doctors WHERE email = ?', [email], (err, doctor) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          return res.end('Database error');
        }

        if (doctor) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          return res.end(`
            <script>
              alert("An account with this email already exists.");
              window.location.href = "/Register.html";
            </script>
          `);
        }

        bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            return res.end('Error hashing password');
          }

          db.run(
            'INSERT INTO Patients (email, surname, last_name, password) VALUES (?, ?, ?, ?)',
            [email, surname, last_name, hashedPassword],
            (err) => {
              if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                return res.end('Database insert error');
              }

              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(`
                <script>
                  alert("Account created successfully.");
                  window.location.href = "/LogIn.html";
                </script>
              `);
            }
          );
        });
      });
    });
  });

  return;
  }
  if (req.method === "POST" && req.url === "/login") {
    let body = "";

    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const { email, password } = Object.fromEntries(new URLSearchParams(body));

      // for admin
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

            // Admin success
            res.writeHead(200, {
              "Content-Type": "application/json",
              "Set-Cookie": `userEmail=${encodeURIComponent(email)}; HttpOnly; Path=/; SameSite=Lax`,
            });
            return res.end(JSON.stringify({ redirect: "/Admin.html" }));
          });
        });
        return;
      }

      // First check Patients
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

            // Success as patient
            res.writeHead(200, {
              "Content-Type": "application/json",
              "Set-Cookie": `userEmail=${encodeURIComponent(email)}; HttpOnly; Path=/; SameSite=Lax`,
            });
            return res.end(JSON.stringify({ redirect: "/Patient.html" }));
          });
        }

        // If not patient, check Doctors
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

            // Success as doctor
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

      db.get('SELECT * FROM Patients WHERE email = ?', [email], (err, patient) => {
        if (err) {
          console.error('DB Lookup error (Patients):', err);
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          return res.end('Database error');
        }

        if (patient) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          return res.end(`
            <script>
              alert("An account with this email already exists (in Patients)!");
              window.location.href = "/Admin.html";
            </script>
          `);
        }

        db.get('SELECT * FROM Doctors WHERE email = ?', [email], (err, doctor) => {
          if (err) {
            console.error('DB Lookup error (Doctors):', err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            return res.end('Database error');
          }

          if (doctor) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            return res.end(`
              <script>
                alert("An account with this email already exists (in Doctors)!");
                window.location.href = "/Admin.html";
              </script>
            `);
          }

          bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
            if (err) {
              console.error('Password hashing error:', err);
              res.writeHead(500, { 'Content-Type': 'text/plain' });
              return res.end('Error hashing password');
            }

            if (type === 'Doctor') {
              db.run(
                'INSERT INTO Doctors (email, surname, last_name, password, specialization) VALUES (?, ?, ?, ?, ?)',
                [email, surname, last_name, hashedPassword, specialization],
                (err) => {
                  if (err) {
                    console.error('DB Insert error (Doctor):', err);
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    return res.end('Error saving doctor');
                  }

                  res.writeHead(200, { 'Content-Type': 'text/html' });
                  res.end(`
                    <script>
                      alert("Doctor account created successfully!");
                      window.location.href = "/Admin.html";
                    </script>
                  `);
                }
              );
            } else {
              db.run(
                'INSERT INTO Patients (email, surname, last_name, password) VALUES (?, ?, ?, ?)',
                [email, surname, last_name, hashedPassword],
                (err) => {
                  if (err) {
                    console.error('DB Insert error (Patient):', err);
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    return res.end('Error saving patient');
                  }

                  res.writeHead(200, { 'Content-Type': 'text/html' });
                  res.end(`
                    <script>
                      alert("Patient account created successfully!");
                      window.location.href = "/Admin.html";
                    </script>
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





  res.writeHead(404);
  res.end('Not found');
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});