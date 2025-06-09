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
    } else if (req.url === '/Pacient.html') {
      filePath = path.join(__dirname, 'Pages', 'Pacient.html');
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
      const { email, fullname, password } = formData;

      if (!email || !fullname || !password) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Missing required fields');
        return;
      }

      db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Database error');
        } else if (row) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <script>
              alert("An account with this email already exists.");
              window.location.href = "/Register.html";
            </script>
          `);
        } else {
          bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
            if (err) {
              res.writeHead(500, { 'Content-Type': 'text/plain' });
              res.end('Error hashing password');
              return;
            }

            db.run(
              'INSERT INTO users (email, fullname, password, type) VALUES (?, ?, ?, ?)',
              [email, fullname, hashedPassword, 'user'],
              (err) => {
                if (err) {
                  res.writeHead(500, { 'Content-Type': 'text/plain' });
                  res.end('Database insert error');
                } else {
                  res.writeHead(200, { 'Content-Type': 'text/html' });
                  res.end(`
                    <script>
                      alert("Account created successfully.");
                      window.location.href = "/LogIn.html";
                    </script>
                  `);
                }
              }
            );
          });
        }
      });
    });

  return;
  }

if (req.method === "POST" && req.url === "/login") {
  let body = "";

  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    const { email, password, type} = Object.fromEntries(new URLSearchParams(body));

    db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
      if (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Database error" }));
      }

      if (!user) {
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "No account found for that e-mail." }));
      }

      bcrypt.compare(password, user.password, (err, ok) => {
        if (err) {
          res.writeHead(500, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "Password check error" }));
        }

        if (!ok) {
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "Password incorrect. Try again." }));
        }

        if (user.type.toLowerCase() !== type.toLowerCase()) {
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "No account with that type exists." }));
        }

        let redirectPage = "/Pacient.html";
        if (type.toLowerCase() === "admin") redirectPage = "/Admin.html";
        else if (type.toLowerCase() === "doctor") redirectPage = "/Doctor.html";

        res.writeHead(200, {
          "Content-Type": "application/json",
          "Set-Cookie": `userEmail=${encodeURIComponent(email)}; HttpOnly; Path=/; SameSite=Lax`,
        });
        res.end(JSON.stringify({ redirect: redirectPage }));
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
    const { email, fullname, password, type, specialization } = formData;
    console.log('Inserting user:', { email, fullname, password, type, specialization });

    db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Database error');
        return;
      }

      if (row) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <script>
            alert("That email is already in use.");
            window.location.href = "/Admin.html";
          </script>
        `);
        return;
      }

      bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Error hashing password');
          return;
        }

        if (type.toLowerCase() === 'doctor') {
          db.run(
            'INSERT INTO users (email, fullname, password, type, specialization) VALUES (?, ?, ?, ?, ?)',
            [email, fullname, hashedPassword, type.toLowerCase(), specialization],
            (err) => {
              if (err) {
                console.error('DB Insert error:', err);  // <-- LOG IT!
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error saving user');
                return;
              }

              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(`
                <script>
                  alert("Account created successfully!");
                  window.location.href = "/Admin.html";
                </script>
              `);
            }
          );
        } else {
          db.run(
            'INSERT INTO users (email, fullname, password, type) VALUES (?, ?, ?, ?)',
            [email, fullname, hashedPassword, type.toLowerCase()],
            (err) => {
              if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error saving user');
                return;
              }

              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(`
                <script>
                  alert("Account created successfully!");
                  window.location.href = "/Admin.html";
                </script>
              `);
            }
          );
        }
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