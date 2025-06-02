const http = require('http');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const { parse } = require('querystring');

const saltRounds = 10;

const db = new sqlite3.Database('users.db');
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  fullname TEXT NOT NULL,
  password TEXT NOT NULL
)`);

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
    } else {
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
              'INSERT INTO users (email, fullname, password) VALUES (?, ?, ?)',
              [email, fullname, hashedPassword],
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
    const { email, password } = Object.fromEntries(new URLSearchParams(body));

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

        // On successful login, set cookie and redirect
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Set-Cookie": `userEmail=${encodeURIComponent(email)}; HttpOnly; Path=/; SameSite=Lax`,
        });
        res.end(JSON.stringify({ redirect: "/Pacient.html" }));
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