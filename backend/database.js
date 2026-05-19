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
    nombre     TEXT,
    asignatura TEXT,
    fecha      TEXT,
    estado     TEXT
  );
`);

module.exports = db;