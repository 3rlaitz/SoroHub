// ── CONFIGURACIÓN DE BASE DE DATOS ──
// Inicializa la conexión con SQLite
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'sorohub.db'));
db.pragma('foreign_keys = ON');

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
    nota       REAL,
    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tareas (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER,
    tipo       TEXT DEFAULT 'Tarea',
    nombre     TEXT,
    asignatura TEXT,
    fecha      TEXT,
    estado     TEXT,
    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS recursos (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER,
    titulo         TEXT,
    desc           TEXT,
    autor          TEXT,
    fecha          TEXT,
    nombre_archivo TEXT,
    archivo_path   TEXT,
    archivo_mime   TEXT,
    archivo_size   INTEGER,
    comentarios    TEXT DEFAULT '[]',
    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
  );
`);

// Exporta la instancia para usarla en el servidor
module.exports = db;
