const Database = require('better-sqlite3');
const db = new Database('sorohub.db');

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

const columnasTareas = db.prepare('PRAGMA table_info(tareas)').all().map(col => col.name);
if (!columnasTareas.includes('tipo')) {
  db.prepare("ALTER TABLE tareas ADD COLUMN tipo TEXT DEFAULT 'Tarea'").run();
}

module.exports = db;
