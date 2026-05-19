const express = require('express');
const cors = require('cors');
const session = require('express-session');
const db = require('./database');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(session({
  secret: 'sorohub_secret_2026',
  resave: false,
  saveUninitialized: false,
}));

// ── AUTH ────────────────────────────────────────────────────────────────

app.post('/api/auth/register', (req, res) => {
  const { nombre, apellidos, email, password } = req.body;
  const existe = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);
  if (existe) return res.status(400).json({ message: 'El correo ya está registrado' });

  const result = db.prepare(
    'INSERT INTO usuarios (nombre, apellidos, email, password) VALUES (?, ?, ?, ?)'
  ).run(nombre, apellidos, email, password);

  const user = { id: result.lastInsertRowid, nombre, apellidos, email };
  req.session.user = user;
  res.json({ ok: true, user });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM usuarios WHERE email = ? AND password = ?').get(email, password);
  if (!user) return res.status(401).json({ message: 'Credenciales incorrectas' });

  const { password: _, ...safe } = user;
  req.session.user = safe;
  res.json({ ok: true, user: safe });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

// ── NOTAS ───────────────────────────────────────────────────────────────

app.get('/api/notas', (req, res) => {
  const notas = db.prepare('SELECT * FROM notas WHERE user_id = ?').all(req.session.user?.id);
  res.json({ notas });
});

app.post('/api/notas', (req, res) => {
  const { asignatura, evaluacion, fecha, nota } = req.body;
  const result = db.prepare(
    'INSERT INTO notas (user_id, asignatura, evaluacion, fecha, nota) VALUES (?, ?, ?, ?, ?)'
  ).run(req.session.user?.id, asignatura, evaluacion, fecha, nota);
  res.json({ nota: { id: result.lastInsertRowid, asignatura, evaluacion, fecha, nota } });
});

app.delete('/api/notas/:id', (req, res) => {
  db.prepare('DELETE FROM notas WHERE id = ? AND user_id = ?').run(req.params.id, req.session.user?.id);
  res.json({ ok: true });
});

// ── TAREAS ──────────────────────────────────────────────────────────────

app.get('/api/tareas', (req, res) => {
  const tareas = db.prepare('SELECT * FROM tareas WHERE user_id = ?').all(req.session.user?.id);
  res.json({ tareas });
});

app.listen(3000, () => console.log('SoroHub backend corriendo en http://localhost:3000'));