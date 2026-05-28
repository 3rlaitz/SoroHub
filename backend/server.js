// ── IMPORTACIONES ──
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session)
const db = require('./database');
const bcrypt = require('bcrypt')
const path = require('path');
const fs = require('fs');

// ── CONFIGURACIÓN DEL SERVIDOR ──
const app = express();
// Crea la carpeta de subidas si no existe
const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

// Middlewares básicos
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));

// Configura las sesiones en SQLite
app.use(session({
  store: new SQLiteStore({ db: 'sessions.db' , dir: __dirname}),
  secret: 'sorohub_secret_2026',
  resave: false,
  saveUninitialized: false,
}));

// Sirve los archivos estáticos de la app
app.use(express.static(path.join(__dirname, '..')));

// ── HELPERS DE ARCHIVOS ──

// Valida que solo suban RAR o PDF
function extensionPermitida(nombreArchivo) {
  const nombre = String(nombreArchivo || '').toLowerCase();
  return nombre.endsWith('.rar') || nombre.endsWith('.pdf');
}

// Extrae los bytes de un archivo en Base64
function extraerArchivoData(archivoData) {
  const match = String(archivoData || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Formato de archivo no valido');
  }

  const buffer = Buffer.from(match[2], 'base64');
  return { mime: match[1], buffer };
}

// Genera un nombre único para evitar colisiones
function nombreArchivoSeguro(id, nombreArchivo) {
  const extension = path.extname(nombreArchivo || '').toLowerCase();
  return `recurso-${id}${extension}`;
}

// Guarda un archivo en disco y devuelve sus datos
function guardarArchivoRecurso(id, nombreArchivo, archivoData) {
  const { mime, buffer } = extraerArchivoData(archivoData);
  const filename = nombreArchivoSeguro(id, nombreArchivo);
  const absolutePath = path.join(uploadsDir, filename);
  fs.writeFileSync(absolutePath, buffer);

  return {
    archivoPath: path.join('uploads', filename),
    archivoMime: mime,
    archivoSize: buffer.length,
  };
}

// Valida que no intenten acceder a rutas peligrosas
function rutaArchivoAbsoluta(archivoPath) {
  const absolutePath = path.resolve(__dirname, archivoPath || '');
  if (!absolutePath.startsWith(uploadsDir)) {
    throw new Error('Ruta de archivo no valida');
  }
  return absolutePath;
}

// ── MIGRACIONES ──
// Mueve los archivos viejos (guardados en Base64) al disco duro
function migrarRecursosBase64() {
  const pendientes = db.prepare(`
    SELECT id, nombre_archivo, archivo_data
    FROM recursos
    WHERE archivo_data IS NOT NULL
      AND archivo_data != ''
      AND (archivo_path IS NULL OR archivo_path = '')
  `).all();

  const update = db.prepare(`
    UPDATE recursos
    SET archivo_path = ?, archivo_mime = ?, archivo_size = ?
    WHERE id = ?
  `);

  for (const recurso of pendientes) {
    try {
      if (!extensionPermitida(recurso.nombre_archivo)) continue;
      const archivo = guardarArchivoRecurso(recurso.id, recurso.nombre_archivo, recurso.archivo_data);
      update.run(archivo.archivoPath, archivo.archivoMime, archivo.archivoSize, recurso.id);
    } catch (err) {
      console.warn(`No se pudo migrar el recurso ${recurso.id}: ${err.message}`);
    }
  }
}

migrarRecursosBase64();

// ── MIDDLEWARE AUTENTICACIÓN ──
// Protege las rutas que requieren inicio de sesión
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Debes iniciar sesion' });
  }
  next();
}

// ── AUTH ────────────────────────────────────────────────────────────────

// Registro de usuario nuevo
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

// Inicio de sesión
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

// Cerrar sesión
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

// ── NOTAS ───────────────────────────────────────────────────────────────

// Obtener todas las notas del usuario logueado
app.get('/api/notas', requireAuth, (req, res) => {
  const notas = db.prepare('SELECT * FROM notas WHERE user_id = ?').all(req.session.user.id);
  res.json({ notas });
});

// Añadir una nueva nota
app.post('/api/notas', requireAuth, (req, res) => {
  const { asignatura, evaluacion, fecha, nota } = req.body;
  const result = db.prepare(
    'INSERT INTO notas (user_id, asignatura, evaluacion, fecha, nota) VALUES (?, ?, ?, ?, ?)'
  ).run(req.session.user.id, asignatura, evaluacion, fecha, nota);
  res.json({ nota: { id: result.lastInsertRowid, asignatura, evaluacion, fecha, nota } });
});

// Eliminar una nota existente
app.delete('/api/notas/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM notas WHERE id = ? AND user_id = ?').run(req.params.id, req.session.user.id);
  res.json({ ok: true });
});

// ── TAREAS ──────────────────────────────────────────────────────────────

// Obtener lista de tareas
app.get('/api/tareas', requireAuth, (req, res) => {
  const tareas = db.prepare('SELECT * FROM tareas WHERE user_id = ?').all(req.session.user.id);
  res.json({ tareas });
});

// Crear una nueva tarea
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

// Actualizar una tarea (p.ej. cambiar estado)
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

// Borrar una tarea
app.delete('/api/tareas/:id', requireAuth, (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ message: 'Debes iniciar sesión' });

  db.prepare('DELETE FROM tareas WHERE id = ? AND user_id = ?').run(req.params.id, user.id);
  res.json({ ok: true });
});

// ── RECURSOS ─────────────────────────────────────────────────────────────

// Normaliza los datos de un recurso para enviarlo al cliente
function normalizarRecurso(r, user) {
  return {
    id: r.id,
    titulo: r.titulo,
    desc: r.desc,
    autor: r.autor,
    fecha: r.fecha,
    nombreArchivo: r.nombre_archivo,
    archivoUrl: `/recursos/${r.id}/descargar`,
    esPropietario: Boolean(user && r.user_id === user.id),
    comentarios: JSON.parse(r.comentarios || '[]'),
  };
}

// Listar todos los recursos
app.get('/api/recursos', (req, res) => {
  const recursos = db.prepare('SELECT * FROM recursos ORDER BY id ASC').all()
    .map(r => normalizarRecurso(r, req.session.user));
  res.json({ recursos });
});

// Subir un nuevo recurso
app.post('/api/recursos', (req, res) => {
  const { titulo, desc, nombreArchivo, archivoData } = req.body;
  const user = req.session.user;

  if (!user) return res.status(401).json({ message: 'Debes iniciar sesión' });
  if (!titulo || !nombreArchivo || !archivoData) {
    return res.status(400).json({ message: 'Faltan datos del recurso' });
  }
  if (!extensionPermitida(nombreArchivo)) {
    return res.status(400).json({ message: 'Solo se pueden subir archivos .rar o PDF' });
  }

  const fecha = new Date().toISOString().slice(0, 10);
  const result = db.prepare(`
    INSERT INTO recursos (user_id, titulo, desc, autor, fecha, nombre_archivo, comentarios)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(user.id, titulo, desc || '', user.nombre, fecha, nombreArchivo, '[]');

  let archivo;
  try {
    archivo = guardarArchivoRecurso(result.lastInsertRowid, nombreArchivo, archivoData);
  } catch {
    db.prepare('DELETE FROM recursos WHERE id = ? AND user_id = ?').run(result.lastInsertRowid, user.id);
    return res.status(400).json({ message: 'No se pudo procesar el archivo' });
  }

  db.prepare(`
    UPDATE recursos
    SET archivo_path = ?, archivo_mime = ?, archivo_size = ?
    WHERE id = ? AND user_id = ?
  `).run(archivo.archivoPath, archivo.archivoMime, archivo.archivoSize, result.lastInsertRowid, user.id);

  res.json({
    recurso: {
      id: result.lastInsertRowid,
      titulo,
      desc: desc || '',
      autor: user.nombre,
      fecha,
      nombreArchivo,
      archivoUrl: `/recursos/${result.lastInsertRowid}/descargar`,
      esPropietario: true,
      comentarios: [],
    }
  });
});

// Actualizar un recurso
app.put('/api/recursos/:id', (req, res) => {
  const user = req.session.user;
  const { titulo, desc, nombreArchivo, archivoData } = req.body;

  if (!user) return res.status(401).json({ message: 'Debes iniciar sesión' });
  if (!titulo?.trim()) return res.status(400).json({ message: 'El título es obligatorio' });

  const recurso = db.prepare('SELECT * FROM recursos WHERE id = ?').get(req.params.id);
  if (!recurso) return res.status(404).json({ message: 'Recurso no encontrado' });
  if (recurso.user_id !== user.id) {
    return res.status(403).json({ message: 'No puedes modificar un recurso que no es tuyo' });
  }

  let nuevoNombreArchivo = nombreArchivo || recurso.nombre_archivo;
  let nuevoArchivoPath = recurso.archivo_path;
  let nuevoArchivoMime = recurso.archivo_mime;
  let nuevoArchivoSize = recurso.archivo_size;

  if (!extensionPermitida(nuevoNombreArchivo)) {
    return res.status(400).json({ message: 'Solo se pueden subir archivos .rar o PDF' });
  }

  if (archivoData) {
    try {
      const archivo = guardarArchivoRecurso(req.params.id, nuevoNombreArchivo, archivoData);
      nuevoArchivoPath = archivo.archivoPath;
      nuevoArchivoMime = archivo.archivoMime;
      nuevoArchivoSize = archivo.archivoSize;
    } catch {
      return res.status(400).json({ message: 'No se pudo procesar el archivo' });
    }
  }

  db.prepare(`
    UPDATE recursos
    SET titulo = ?, desc = ?, nombre_archivo = ?, archivo_path = ?, archivo_mime = ?, archivo_size = ?
    WHERE id = ? AND user_id = ?
  `).run(
    titulo.trim(),
    desc || '',
    nuevoNombreArchivo,
    nuevoArchivoPath,
    nuevoArchivoMime,
    nuevoArchivoSize,
    req.params.id,
    user.id
  );

  const actualizado = db.prepare('SELECT * FROM recursos WHERE id = ?').get(req.params.id);
  res.json({ recurso: normalizarRecurso(actualizado, user) });
});

// Descargar un recurso
app.get('/api/recursos/:id/descargar', (req, res) => {
  const recurso = db.prepare('SELECT * FROM recursos WHERE id = ?').get(req.params.id);
  if (!recurso) return res.status(404).json({ message: 'Recurso no encontrado' });

  if (recurso.archivo_path) {
    try {
      return res.download(rutaArchivoAbsoluta(recurso.archivo_path), recurso.nombre_archivo);
    } catch {
      return res.status(500).json({ message: 'No se pudo descargar el archivo' });
    }
  }

  if (recurso.archivo_data) {
    const { mime, buffer } = extraerArchivoData(recurso.archivo_data);
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `attachment; filename="${recurso.nombre_archivo}"`);
    return res.send(buffer);
  }

  res.status(404).json({ message: 'Archivo no encontrado' });
});

// Borrar un recurso
app.delete('/api/recursos/:id', (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ message: 'Debes iniciar sesión' });

  const result = db.prepare('DELETE FROM recursos WHERE id = ? AND user_id = ?').run(req.params.id, user.id);
  if (result.changes === 0) {
    return res.status(403).json({ message: 'No puedes eliminar un recurso que no es tuyo' });
  }

  res.json({ ok: true });
});

// Añadir comentario a un recurso
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

// Arranca el servidor
app.listen(3000, () => console.log('SoroHub backend corriendo en http://localhost:3000'));
