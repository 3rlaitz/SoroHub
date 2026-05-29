# SoroHub

Plataforma web académica con autenticación propia, gestión de recursos, tareas y notas personales.

🌐 [sorohub.duckdns.org](http://sorohub.duckdns.org)

---

## Stack

| Tecnología | Versión | Uso |
|---|---|---|
| Node.js | v20+ | Servidor |
| Express.js | 5.2.1 | API REST |
| SQLite + better-sqlite3 | 3.x / 12.10.0 | Base de datos |
| bcrypt | 6.0.0 | Hash de contraseñas |
| express-session | 1.19.0 | Sesiones |
| HTML5 / CSS3 / JavaScript | ES6+ | Frontend |

---

## Instalación

```bash
git clone https://github.com/3rlaitz/SoroHub.git
cd SoroHub/backend
npm install
node server.js
```

Disponible en `http://localhost:3000`.

> Para usar el frontend sin backend, activa `USE_MOCK = true` en `frontend/js/config.js`.

---

## Arquitectura

Tres capas comunicadas mediante API REST / JSON:

```
Frontend (HTML + CSS + JS)
        ↕ HTTP / JSON
Backend (Node.js + Express)
        ↕ SQL
Base de datos (SQLite)
```

Las sesiones se persisten en SQLite con `connect-sqlite3` y sobreviven a reinicios del servidor.

---

## Estructura

```
SoroHub/
├── backend/
│   ├── server.js          # Punto de entrada
│   ├── db.js              # Esquema y conexión SQLite
│   ├── routes/            # auth, tareas, recursos, notas
│   └── uploads/           # Archivos subidos
└── frontend/
    ├── index.html
    ├── login.html
    ├── recursos.html
    ├── tareas.html
    ├── notas.html
    └── js/
        ├── config.js      # URL base y flag USE_MOCK
        ├── api.js         # Abstracción real/mock
        ├── auth.js        # Sesión y protección de rutas
        ├── login.js
        ├── recursos.js
        ├── tareas.js
        └── notas.js
```

---

## API REST

| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/api/auth/register` | Registro de usuario |
| POST | `/api/auth/login` | Inicio de sesión |
| GET | `/api/auth/session` | Sesión activa |
| POST | `/api/auth/logout` | Cerrar sesión |
| GET / POST | `/api/tareas` | Listar / crear tareas |
| PUT / DELETE | `/api/tareas/:id` | Actualizar / eliminar tarea |
| GET / POST | `/api/recursos` | Listar / subir recursos |
| DELETE | `/api/recursos/:id` | Eliminar recurso |
| GET / POST | `/api/notas` | Listar / crear notas |
| DELETE | `/api/notas/:id` | Eliminar nota |

---

## Seguridad

- Contraseñas hasheadas con bcrypt (10 rondas)
- Sesiones con cookies HTTP-only
- Subida de archivos: solo `.pdf` y `.rar`, nombres saneados, validación de rutas absolutas (path traversal)
- Queries parametrizadas (SQL injection)

---

## Autores

| Autor | GitHub |
|---|---|
| Erlaitz Alonso | [@3rlaitz](https://github.com/3rlaitz) |
| Eneko Martin | [@enekoo8](https://github.com/enekoo8) |
| Arkaitz Jimenez | [@Arkaaiiitz](https://github.com/Arkaaiiitz) |

Centro Formación Somorrostro · 2025-2026
