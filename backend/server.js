const express = require('express');
const cors = require('cors');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session)
const db = require('./database');
const bcrypt = require('bcrypt')
const path = require('path');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(session({
  store: new SQLiteStore({ db: 'sessions.db' , dir: __dirname}),
  secret: 'sorohub_secret_2026',
  resave: false,
  saveUninitialized: false,
}));

app.use(express.static(path.join(__dirname, '..')));

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Debes iniciar sesion' });
  }
  next();
}

// ── AUTH ────────────────────────────────────────────────────────────────

app.post('/api/auth/register', async (req, res) => {
  const { nombre, apellidos, email, password } = req.body;
  const existe = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);
  if (existe) return res.status(400).json({ message: 'El correo ya está registrado' });

  const hash = await bcrypt.hash(password, 10);

  const result = db.prepare(
    'INSERT INTO usuarios (nombre, apellidos, email, password) VALUES (?, ?, ?, ?)'
  ).run(nombre, apellidos, email, hash);

  const user = { id: result.lastInsertRowid, nombre, apellidos, email };
  req.session.user = user;
  res.json({ ok: true, user });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ message: 'Credenciales incorrectas' });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ message: 'Credenciales incorrectas' });

  const { password: _, ...safe } = user;
  req.session.user = safe;
  res.json({ ok: true, user: safe });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

// ── NOTAS ───────────────────────────────────────────────────────────────

app.get('/api/notas', requireAuth, (req, res) => {
  const notas = db.prepare('SELECT * FROM notas WHERE user_id = ?').all(req.session.user.id);
  res.json({ notas });
});

app.post('/api/notas', requireAuth, (req, res) => {
  const { asignatura, evaluacion, fecha, nota } = req.body;
  const result = db.prepare(
    'INSERT INTO notas (user_id, asignatura, evaluacion, fecha, nota) VALUES (?, ?, ?, ?, ?)'
  ).run(req.session.user.id, asignatura, evaluacion, fecha, nota);
  res.json({ nota: { id: result.lastInsertRowid, asignatura, evaluacion, fecha, nota } });
});

app.delete('/api/notas/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM notas WHERE id = ? AND user_id = ?').run(req.params.id, req.session.user.id);
  res.json({ ok: true });
});

// ── TAREAS ──────────────────────────────────────────────────────────────

app.get('/api/tareas', requireAuth, (req, res) => {
  const tareas = db.prepare('SELECT * FROM tareas WHERE user_id = ?').all(req.session.user.id);
  res.json({ tareas });
});

app.post('/api/tareas', requireAuth, (req, res) => {
  const user = req.session.user;
  const { tipo, nombre, asignatura, fecha, estado } = req.body;

  if (!user) return res.status(401).json({ message: 'Debes iniciar sesión' });
  if (!nombre || !fecha) return res.status(400).json({ message: 'Faltan datos de la tarea' });

  const tarea = {
    tipo: tipo || 'Tarea',
    nombre,
    asignatura: asignatura || '',
    fecha,
    estado: estado || 'Pendiente',
  };

  const result = db.prepare(`
    INSERT INTO tareas (user_id, tipo, nombre, asignatura, fecha, estado)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(user.id, tarea.tipo, tarea.nombre, tarea.asignatura, tarea.fecha, tarea.estado);

  res.json({ tarea: { id: result.lastInsertRowid, ...tarea } });
});

app.put('/api/tareas/:id', requireAuth, (req, res) => {
  const user = req.session.user;
  const { tipo, nombre, asignatura, fecha, estado } = req.body;

  if (!user) return res.status(401).json({ message: 'Debes iniciar sesión' });
  if (!nombre || !fecha) return res.status(400).json({ message: 'Faltan datos de la tarea' });

  const result = db.prepare(`
    UPDATE tareas
    SET tipo = ?, nombre = ?, asignatura = ?, fecha = ?, estado = ?
    WHERE id = ? AND user_id = ?
  `).run(tipo || 'Tarea', nombre, asignatura || '', fecha, estado || 'Pendiente', req.params.id, user.id);

  if (result.changes === 0) return res.status(404).json({ message: 'Tarea no encontrada' });
  res.json({ tarea: { id: Number(req.params.id), tipo: tipo || 'Tarea', nombre, asignatura: asignatura || '', fecha, estado: estado || 'Pendiente' } });
});

app.delete('/api/tareas/:id', requireAuth, (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ message: 'Debes iniciar sesión' });

  db.prepare('DELETE FROM tareas WHERE id = ? AND user_id = ?').run(req.params.id, user.id);
  res.json({ ok: true });
});

// ── RECURSOS ─────────────────────────────────────────────────────────────

function normalizarRecurso(r, user) {
  return {
    id: r.id,
    titulo: r.titulo,
    desc: r.desc,
    autor: r.autor,
    fecha: r.fecha,
    nombreArchivo: r.nombre_archivo,
    archivoData: r.archivo_data,
    esPropietario: Boolean(user && r.user_id === user.id),
    comentarios: JSON.parse(r.comentarios || '[]'),
  };
}

app.get('/api/recursos', (req, res) => {
  const recursos = db.prepare('SELECT * FROM recursos ORDER BY id ASC').all()
    .map(r => normalizarRecurso(r, req.session.user));
  res.json({ recursos });
});

app.post('/api/recursos', (req, res) => {
  const { titulo, desc, nombreArchivo, archivoData } = req.body;
  const user = req.session.user;

  if (!user) return res.status(401).json({ message: 'Debes iniciar sesión' });
  if (!titulo || !nombreArchivo || !archivoData) {
    return res.status(400).json({ message: 'Faltan datos del recurso' });
  }
  if (!nombreArchivo.toLowerCase().endsWith('.rar') && !nombreArchivo.toLowerCase().endsWith('.pdf')) {
    return res.status(400).json({ message: 'Solo se pueden subir archivos .rar o PDF' });
  }

  const fecha = new Date().toISOString().slice(0, 10);
  const result = db.prepare(`
    INSERT INTO recursos (user_id, titulo, desc, autor, fecha, nombre_archivo, archivo_data, comentarios)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(user.id, titulo, desc || '', user.nombre, fecha, nombreArchivo, archivoData, '[]');

  res.json({
    recurso: {
      id: result.lastInsertRowid,
      titulo,
      desc: desc || '',
      autor: user.nombre,
      fecha,
      nombreArchivo,
      archivoData,
      esPropietario: true,
      comentarios: [],
    }
  });
});

app.put('/api/recursos/:id', (req, res) => {
  const user = req.session.user;
  const { titulo, desc, nombreArchivo, archivoData } = req.body;

  if (!user) return res.status(401).json({ message: 'Debes iniciar sesiÃ³n' });
  if (!titulo?.trim()) return res.status(400).json({ message: 'El tÃ­tulo es obligatorio' });

  const recurso = db.prepare('SELECT * FROM recursos WHERE id = ?').get(req.params.id);
  if (!recurso) return res.status(404).json({ message: 'Recurso no encontrado' });
  if (recurso.user_id !== user.id) {
    return res.status(403).json({ message: 'No puedes modificar un recurso que no es tuyo' });
  }

  const nuevoNombreArchivo = nombreArchivo || recurso.nombre_archivo;
  const nuevoArchivoData = archivoData || recurso.archivo_data;

  if (!nuevoNombreArchivo.toLowerCase().endsWith('.rar') && !nuevoNombreArchivo.toLowerCase().endsWith('.pdf')) {
    return res.status(400).json({ message: 'Solo se pueden subir archivos .rar o PDF' });
  }

  db.prepare(`
    UPDATE recursos
    SET titulo = ?, desc = ?, nombre_archivo = ?, archivo_data = ?
    WHERE id = ? AND user_id = ?
  `).run(titulo.trim(), desc || '', nuevoNombreArchivo, nuevoArchivoData, req.params.id, user.id);

  const actualizado = db.prepare('SELECT * FROM recursos WHERE id = ?').get(req.params.id);
  res.json({ recurso: normalizarRecurso(actualizado, user) });
});

app.delete('/api/recursos/:id', (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ message: 'Debes iniciar sesiÃ³n' });

  const result = db.prepare('DELETE FROM recursos WHERE id = ? AND user_id = ?').run(req.params.id, user.id);
  if (result.changes === 0) {
    return res.status(403).json({ message: 'No puedes eliminar un recurso que no es tuyo' });
  }

  res.json({ ok: true });
});

app.post('/api/recursos/:id/comentarios', (req, res) => {
  const user = req.session.user;
  const { texto } = req.body;

  if (!user) return res.status(401).json({ message: 'Debes iniciar sesión' });
  if (!texto?.trim()) return res.status(400).json({ message: 'El comentario está vacío' });

  const recurso = db.prepare('SELECT comentarios FROM recursos WHERE id = ?').get(req.params.id);
  if (!recurso) return res.status(404).json({ message: 'Recurso no encontrado' });

  const comentario = { autor: user.nombre, texto: texto.trim() };
  const comentarios = JSON.parse(recurso.comentarios || '[]');
  comentarios.push(comentario);

  db.prepare('UPDATE recursos SET comentarios = ? WHERE id = ?').run(JSON.stringify(comentarios), req.params.id);
  res.json({ comentario });
});

app.listen(3000, () => console.log('SoroHub backend corriendo en http://localhost:3000'));
