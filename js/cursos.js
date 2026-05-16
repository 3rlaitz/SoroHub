  // ── Datos de ejemplo ─────────────────────────────────────────────────────
  const CURSOS = [
    {
      id: 1, nombre: 'Matemáticas II', profesor: 'Prof. García Martínez',
      icono: '📐', color: '#6366f1', estado: 'En progreso',
      progreso: 68, lecciones: 24, completadas: 16, horas: 40,
    },
    {
      id: 2, nombre: 'Lengua Castellana y Literatura', profesor: 'Prof. Rodríguez López',
      icono: '📖', color: '#ef4444', estado: 'En progreso',
      progreso: 45, lecciones: 20, completadas: 9, horas: 35,
    },
    {
      id: 3, nombre: 'Historia de España', profesor: 'Prof. Sánchez Ruiz',
      icono: '🏛️', color: '#eab308', estado: 'Completado',
      progreso: 100, lecciones: 18, completadas: 18, horas: 30,
    },
    {
      id: 4, nombre: 'Inglés B2', profesor: 'Prof. Williams',
      icono: '🌍', color: '#22c55e', estado: 'En progreso',
      progreso: 30, lecciones: 22, completadas: 7, horas: 45,
    },
    {
      id: 5, nombre: 'Biología y Geología', profesor: 'Prof. Fernández Díaz',
      icono: '🔬', color: '#f97316', estado: 'Sin empezar',
      progreso: 0, lecciones: 20, completadas: 0, horas: 38,
    },
    {
      id: 6, nombre: 'Física y Química', profesor: 'Prof. Moreno Torres',
      icono: '⚗️', color: '#0ea5e9', estado: 'Completado',
      progreso: 100, lecciones: 26, completadas: 26, horas: 50,
    },
    {
      id: 7, nombre: 'Educación Física', profesor: 'Prof. Jiménez Vega',
      icono: '⚽', color: '#a855f7', estado: 'En progreso',
      progreso: 80, lecciones: 10, completadas: 8, horas: 20,
    },
    {
      id: 8, nombre: 'Tecnología e Informática', profesor: 'Prof. Alonso Pérez',
      icono: '💻', color: '#14b8a6', estado: 'Sin empezar',
      progreso: 0, lecciones: 16, completadas: 0, horas: 32,
    },
  ];

  let filtroActual = 'todos';
  let busqueda = '';

  // ── Render ────────────────────────────────────────────────────────────────
  function render() {
    let datos = CURSOS.filter(c => {
      const filtroOk = filtroActual === 'todos' || c.estado === filtroActual;
      const busOk    = c.nombre.toLowerCase().includes(busqueda) || c.profesor.toLowerCase().includes(busqueda);
      return filtroOk && busOk;
    });

    const grid = document.getElementById('gridCursos');

    if (datos.length === 0) {
      grid.innerHTML = `<div class="sin-resultados"><span>🔍</span>No hay cursos que coincidan con la búsqueda.</div>`;
      return;
    }

    grid.innerHTML = datos.map(c => {
      const estadoClass = { 'En progreso': 'estado-progreso', 'Completado': 'estado-completado', 'Sin empezar': 'estado-pendiente' }[c.estado];
      const btnClass = c.estado === 'Sin empezar' ? 'btn-ver' : 'btn-continuar';
      const btnTexto = c.estado === 'Completado' ? '✓ Ver curso' : c.estado === 'En progreso' ? '▶ Continuar' : '▷ Empezar';
      const colorBarra = c.progreso === 100 ? '#22c55e' : c.progreso > 0 ? '#0ea5e9' : '#475569';

      return `
        <div class="tarjeta-curso">
          <div class="curso-banner" style="background: ${c.color}"></div>
          <div class="curso-cuerpo">
            <div class="curso-cabecera">
              <div class="curso-icono" style="background: ${c.color}22">${c.icono}</div>
              <span class="estado-badge ${estadoClass}">${c.estado}</span>
            </div>
            <div class="curso-nombre">${c.nombre}</div>
            <div class="curso-profesor">👤 ${c.profesor}</div>
            <div class="curso-meta">
              <span class="meta-item">📚 ${c.lecciones} lecciones</span>
              <span class="meta-item">⏱ ${c.horas}h</span>
            </div>
            <div class="barra-progreso-cont">
              <div class="barra-prog-label">
                <span>Progreso</span>
                <span>${c.completadas}/${c.lecciones} completadas</span>
              </div>
              <div class="barra-prog-fondo">
                <div class="barra-prog-relleno" style="width:${c.progreso}%; background:${colorBarra}"></div>
              </div>
            </div>
            <button class="btn-curso ${btnClass}">${btnTexto}</button>
          </div>
        </div>
      `;
    }).join('');
  }

  // ── Estadísticas ──────────────────────────────────────────────────────────
  function actualizarStats() {
    document.getElementById('stat-total').textContent = CURSOS.length;
    document.getElementById('stat-progreso').textContent = CURSOS.filter(c => c.estado === 'En progreso').length;
    document.getElementById('stat-completados').textContent = CURSOS.filter(c => c.estado === 'Completado').length;
  }

  // ── Filtros ───────────────────────────────────────────────────────────────
  document.getElementById('filtros').addEventListener('click', e => {
    if (!e.target.matches('.tab-btn')) return;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('activo'));
    e.target.classList.add('activo');
    filtroActual = e.target.dataset.filtro;
    render();
  });

  document.getElementById('buscador').addEventListener('input', e => {
    busqueda = e.target.value.toLowerCase();
    render();
  });

  // ── Badge alumno ──────────────────────────────────────────────────────────
  const sesion = SoroAPI.auth.getSession();
  if (sesion) {
    document.getElementById('alumno-badge').innerHTML =
      `📚 ${sesion.nombre} ${sesion.apellidos}`;
  }

  actualizarStats();
  render();
