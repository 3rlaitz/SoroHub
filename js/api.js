// ═══════════════════════════════════════════════════════════════════════════
//  SOROHUB – CAPA DE API
//  Centraliza todas las llamadas a datos (modo Mock o API Real).
//  Depende de: config.js (debe cargarse antes)
// ═══════════════════════════════════════════════════════════════════════════

const SoroAPI = (() => {

  const BASE = SoroConfig.API_BASE_URL;
  const MOCK = SoroConfig.USE_MOCK;

  // ── Claves de localStorage (solo se usan en modo mock) ─────────────────
  const KEYS = {
    session : 'sorohub_session',
    users   : 'sorohub_users',
    notes   : 'sorohub_notes',
  };

  // ── Helpers de localStorage ─────────────────────────────────────────────
  function mockGet(key, def = null) {
    try { return JSON.parse(sessionStorage.getItem(key)) ?? def; }
    catch { return def; }
  }
  function mockSet(key, val) { sessionStorage.setItem(key, JSON.stringify(val)); }
  function mockDel(key)      { sessionStorage.removeItem(key); }

  // ── Helper de fetch para la API real ───────────────────────────────────
  // Añade cabeceras JSON y gestiona errores HTTP
  async function fetchJSON(endpoint, options = {}) {
    const res = await fetch(BASE + endpoint, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Envía cookies de sesión
      ...options,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `Error ${res.status}: ${res.statusText}`);
    }
    return res.json();
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  AUTH
  // ═══════════════════════════════════════════════════════════════════════
  const auth = {

    async login(email, password) {
      if (MOCK) {
        // ── [MOCK] ───────────────────────────────────────────────────────
        const users = mockGet(KEYS.users, []);
        const user  = users.find(u => u.email === email && u.password === password);
        if (!user) return { ok: false, message: 'Credenciales incorrectas' };
        const { password: _, ...safe } = user;   // no guardamos la contraseña en sesión
        mockSet(KEYS.session, safe);
        return { ok: true, user: safe };
        // ── [MOCK] ───────────────────────────────────────────────────────
      }

      // ── [REAL API] ───────────────────────────────────────────────────────
      try {
        const data = await fetchJSON('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        mockSet(KEYS.session, data.user);   // cachea la sesión en localStorage
        return { ok: true, user: data.user };
      } catch (e) {
        return { ok: false, message: e.message };
      }
      // ── [REAL API] ───────────────────────────────────────────────────────
    },

    async register(nombre, apellidos, email, password) {
      if (MOCK) {
        // ── [MOCK] ───────────────────────────────────────────────────────
        // const users = mockGet(KEYS.users, []);
        // if (users.find(u => u.email === email))
        //   return { ok: false, message: 'El correo ya está registrado' };
        // const newUser = { nombre, apellidos, email, password };
        // users.push(newUser);
        // mockSet(KEYS.users, users);
        // const { password: _, ...safe } = newUser;
        // mockSet(KEYS.session, safe);
        // return { ok: true, user: safe };
        // ── [MOCK] ───────────────────────────────────────────────────────
      }

      // ── [REAL API] ───────────────────────────────────────────────────────
      try {
        const data = await fetchJSON('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ nombre, apellidos, email, password }),
        });
        mockSet(KEYS.session, data.user);
        return { ok: true, user: data.user };
      } catch (e) {
        return { ok: false, message: e.message };
      }
      // ── [REAL API] ───────────────────────────────────────────────────────
    },

    async logout() {
      if (MOCK) {
        // ── [MOCK] ───────────────────────────────────────────────────────
        // mockDel(KEYS.session);
        // return { ok: true };
        // ── [MOCK] ───────────────────────────────────────────────────────
      }

      // ── [REAL API] ───────────────────────────────────────────────────────
      try {
        await fetchJSON('/auth/logout', { method: 'POST' });
        mockDel(KEYS.session);    // borra la caché local de sesión
        return { ok: true };
      } catch (e) {
        return { ok: false, message: e.message };
      }
      // ── [REAL API] ───────────────────────────────────────────────────────
    },

    // Devuelve el usuario activo en sesión (síncrono)
    getSession() {
      return mockGet(KEYS.session, null);
    },
  };

  // ═══════════════════════════════════════════════════════════════════════
  //  NOTAS
  // ═══════════════════════════════════════════════════════════════════════
  const NOTAS_DEFAULT = [
    { id: 1, asignatura: 'Matemáticas', evaluacion: 'Examen Álgebra',           fecha: '2026-04-10', nota: 8.5 },
    { id: 2, asignatura: 'Lengua',      evaluacion: 'Redacción narrativa',       fecha: '2026-04-15', nota: 7.0 },
    { id: 3, asignatura: 'Historia',    evaluacion: 'Prueba Revolución Francesa',fecha: '2026-04-22', nota: 9.2 },
    { id: 4, asignatura: 'Inglés',      evaluacion: 'Listening B2',              fecha: '2026-05-02', nota: 6.5 },
    { id: 5, asignatura: 'Ciencias',    evaluacion: 'Lab: Reacciones Químicas',  fecha: '2026-05-08', nota: 5.0 },
    { id: 6, asignatura: 'Matemáticas', evaluacion: 'Control Geometría',         fecha: '2026-05-12', nota: 9.8 },
  ];

  const notas = {
    async getAll() {
      if (MOCK) {
        // ── [MOCK] ───────────────────────────────────────────────────────
        // const stored = mockGet(KEYS.notes, null);
        // if (!stored) { mockSet(KEYS.notes, NOTAS_DEFAULT); return [...NOTAS_DEFAULT]; }
        // return stored;
        // ── [MOCK] ───────────────────────────────────────────────────────
      }

      // ── [REAL API] ───────────────────────────────────────────────────────
      const data = await fetchJSON('/notas');
      return data.notas;
      // ── [REAL API] ───────────────────────────────────────────────────────
    },

    async add(asignatura, evaluacion, fecha, nota) {
      if (MOCK) {
        // ── [MOCK] ───────────────────────────────────────────────────────
        // const list = mockGet(KEYS.notes, []);
        // const id   = list.length ? Math.max(...list.map(n => n.id)) + 1 : 1;
        // const nueva = { id, asignatura, evaluacion, fecha, nota };
        // list.push(nueva);
        // mockSet(KEYS.notes, list);
        // return { ok: true, nota: nueva };
        // ── [MOCK] ───────────────────────────────────────────────────────
      }

      // ── [REAL API] ───────────────────────────────────────────────────────
      try {
        const data = await fetchJSON('/notas', {
          method: 'POST',
          body: JSON.stringify({ asignatura, evaluacion, fecha, nota }),
        });
        return { ok: true, nota: data.nota };
      } catch (e) {
        return { ok: false, message: e.message };
      }
      // ── [REAL API] ───────────────────────────────────────────────────────
    },

    async delete(id) {
      if (MOCK) {
        // ── [MOCK] ───────────────────────────────────────────────────────
        // const list = mockGet(KEYS.notes, []).filter(n => n.id !== id);
        // mockSet(KEYS.notes, list);
        // return { ok: true };
        // ── [MOCK] ───────────────────────────────────────────────────────
      }

      // ── [REAL API] ───────────────────────────────────────────────────────
      try {
        await fetchJSON(`/notas/${id}`, { method: 'DELETE' });
        return { ok: true };
      } catch (e) {
        return { ok: false, message: e.message };
      }
      // ── [REAL API] ───────────────────────────────────────────────────────
    },
  };

  // ═══════════════════════════════════════════════════════════════════════
  //  CURSOS
  // ═══════════════════════════════════════════════════════════════════════
  const cursos = {
    async getAll() {
      if (MOCK) return [];   // TODO: rellenar con datos de prueba cuando se diseñe cursos.html
      // ── [REAL API] ─────────────────────────────────────────────────────
      const data = await fetchJSON('/cursos');
      return data.cursos;
      // ── [REAL API] ─────────────────────────────────────────────────────
    },
  };

  // ═══════════════════════════════════════════════════════════════════════
  //  TAREAS
  // ═══════════════════════════════════════════════════════════════════════
  const TAREAS_DEFAULT = [
    { id: 1, nombre: 'Ejercicios de Álgebra', asignatura: 'Matemáticas', fecha: '2026-05-18', estado: 'Pendiente' },
    { id: 2, nombre: 'Redacción sobre El Quijote', asignatura: 'Lengua', fecha: '2026-05-20', estado: 'Pendiente' },
    { id: 3, nombre: 'Informe Revolución Industrial', asignatura: 'Historia', fecha: '2026-05-10', estado: 'Vencida' },
    { id: 4, nombre: 'Listening Unit 8', asignatura: 'Inglés', fecha: '2026-05-15', estado: 'Acabada' },
  ];

  const tareas = {
    async getAll() {
      if (MOCK) {
        const stored = mockGet('sorohub_tareas', null);
        if (!stored) { mockSet('sorohub_tareas', TAREAS_DEFAULT); return [...TAREAS_DEFAULT]; }
        return stored;
      }
      // ── [REAL API] ─────────────────────────────────────────────────────
      const data = await fetchJSON('/tareas');
      return data.tareas;
    },
    async saveAll(lista) {
      if (MOCK) {
        mockSet('sorohub_tareas', lista);
        return { ok: true };
      }
      const guardadas = await Promise.all(lista.map(t => this.update(t.id, t)));
      return { ok: guardadas.every(r => r.ok) };
    },
    async add(tarea) {
      if (MOCK) {
        const list = mockGet('sorohub_tareas', []);
        const id = list.length ? Math.max(...list.map(t => t.id)) + 1 : 1;
        const nueva = { id, ...tarea };
        list.push(nueva);
        mockSet('sorohub_tareas', list);
        return { ok: true, tarea: nueva };
      }
      try {
        const data = await fetchJSON('/tareas', {
          method: 'POST',
          body: JSON.stringify(tarea),
        });
        return { ok: true, tarea: data.tarea };
      } catch (e) {
        return { ok: false, message: e.message };
      }
    },
    async update(id, tarea) {
      if (MOCK) {
        const list = mockGet('sorohub_tareas', []);
        const index = list.findIndex(t => t.id == id);
        if (index >= 0) list[index] = { ...list[index], ...tarea, id: Number(id) };
        mockSet('sorohub_tareas', list);
        return { ok: true, tarea: list[index] };
      }
      try {
        const data = await fetchJSON(`/tareas/${id}`, {
          method: 'PUT',
          body: JSON.stringify(tarea),
        });
        return { ok: true, tarea: data.tarea };
      } catch (e) {
        return { ok: false, message: e.message };
      }
    },
    async delete(id) {
      if (MOCK) {
        const list = mockGet('sorohub_tareas', []).filter(t => t.id != id);
        mockSet('sorohub_tareas', list);
        return { ok: true };
      }
      try {
        await fetchJSON(`/tareas/${id}`, { method: 'DELETE' });
        return { ok: true };
      } catch (e) {
        return { ok: false, message: e.message };
      }
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  //  RECURSOS
  // ═══════════════════════════════════════════════════════════════════════
  const recursos = {
    async getAll() {
      const data = await fetchJSON('/recursos');
      return data.recursos;
    },
    async add(titulo, desc, nombreArchivo, archivoData) {
      try {
        const data = await fetchJSON('/recursos', {
          method: 'POST',
          body: JSON.stringify({ titulo, desc, nombreArchivo, archivoData }),
        });
        return { ok: true, recurso: data.recurso };
      } catch (e) {
        return { ok: false, message: e.message };
      }
    },
    async update(id, titulo, desc, nombreArchivo, archivoData) {
      try {
        const data = await fetchJSON(`/recursos/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ titulo, desc, nombreArchivo, archivoData }),
        });
        return { ok: true, recurso: data.recurso };
      } catch (e) {
        return { ok: false, message: e.message };
      }
    },
    async delete(id) {
      try {
        await fetchJSON(`/recursos/${id}`, { method: 'DELETE' });
        return { ok: true };
      } catch (e) {
        return { ok: false, message: e.message };
      }
    },
    async addComentario(id, texto) {
      try {
        const data = await fetchJSON(`/recursos/${id}/comentarios`, {
          method: 'POST',
          body: JSON.stringify({ texto }),
        });
        return { ok: true, comentario: data.comentario };
      } catch (e) {
        return { ok: false, message: e.message };
      }
    },
  };

  // API pública
  return { auth, notas, cursos, tareas, recursos };

})();
