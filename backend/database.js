// ── CONFIGURACIÓN DE BASE DE DATOS ──
// Inicializa la conexión con SQLite
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'sorohub.db'));

// Crea las tablas principales si no existen
db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre   TEXT,
    apellidos TEXT,
    email    TEXT UNIQUE,
    password TEXT
  );

  CREATE TABLE IF NOT EXISTS notas (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER,
    asignatura TEXT,
    evaluacion TEXT,
    fecha      TEXT,
    nota       REAL
  );

  CREATE TABLE IF NOT EXISTS tareas (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER,
    tipo       TEXT DEFAULT 'Tarea',
    nombre     TEXT,
    asignatura TEXT,
    fecha      TEXT,
    estado     TEXT
  );

  CREATE TABLE IF NOT EXISTS recursos (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER,
    titulo         TEXT,
    desc           TEXT,
    autor          TEXT,
    fecha          TEXT,
    nombre_archivo TEXT,
    archivo_data   TEXT,
    comentarios    TEXT DEFAULT '[]'
  );
`);

// ── MIGRACIONES DE ESQUEMA ──
// Añade nuevas columnas a tablas existentes para no perder datos

const columnasTareas = db.prepare('PRAGMA table_info(tareas)').all().map(col => col.name);
if (!columnasTareas.includes('tipo')) {
  db.prepare("ALTER TABLE tareas ADD COLUMN tipo TEXT DEFAULT 'Tarea'").run();
}

const columnasRecursos = db.prepare('PRAGMA table_info(recursos)').all().map(col => col.name);
if (!columnasRecursos.includes('archivo_path')) {
  db.prepare('ALTER TABLE recursos ADD COLUMN archivo_path TEXT').run();
}
if (!columnasRecursos.includes('archivo_mime')) {
  db.prepare('ALTER TABLE recursos ADD COLUMN archivo_mime TEXT').run();
}
if (!columnasRecursos.includes('archivo_size')) {
  db.prepare('ALTER TABLE recursos ADD COLUMN archivo_size INTEGER').run();
}

// Exporta la instancia para usarla en el servidor
module.exports = db;
