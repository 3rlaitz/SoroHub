  // ── Estado local (caché de notas cargadas desde SoroAPI) ────────────────
  let notas = [];
  let filtroActual = 'todas';

  // ── Utilidades ───────────────────────────────────────────────────────────
  function claseBadge(asig) {
    const mapa = { 'Matemáticas':'mates','Lengua':'lengua','Historia':'historia','Inglés':'ingles','Ciencias':'ciencias' };
    return 'asignatura-badge badge-' + (mapa[asig] || 'otros');
  }
  function claseNota(n) {
    if (n >= 7) return 'nota-alta';
    if (n >= 5) return 'nota-media';
    return 'nota-baja';
  }
  function claseBarra(n) {
    if (n >= 7) return 'barra-alta';
    if (n >= 5) return 'barra-media';
    return 'barra-baja';
  }
  function formatFecha(f) {
    const [y,m,d] = f.split('-');
    return `${d}/${m}/${y}`;
  }

  // ── Renderizado ──────────────────────────────────────────────────────────
  function renderizar() {
    const orden = document.getElementById('selectOrden').value;
    let datos = filtroActual === 'todas' ? [...notas] : notas.filter(n => n.asignatura === filtroActual);

    datos.sort((a, b) => {
      if (orden === 'fecha-desc')  return b.fecha.localeCompare(a.fecha);
      if (orden === 'fecha-asc')   return a.fecha.localeCompare(b.fecha);
      if (orden === 'nota-desc')   return b.nota - a.nota;
      if (orden === 'nota-asc')    return a.nota - b.nota;
      if (orden === 'asignatura')  return a.asignatura.localeCompare(b.asignatura);
      return 0;
    });

    const tbody = document.getElementById('cuerpoTabla');
    if (datos.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="sin-notas"><span>📭</span>No hay notas registradas para esta asignatura.</div></td></tr>`;
    } else {
      tbody.innerHTML = datos.map(n => `
        <tr>
          <td><span class="${claseBadge(n.asignatura)}">${n.asignatura}</span></td>
          <td>${n.evaluacion}</td>
          <td>${formatFecha(n.fecha)}</td>
          <td><span class="nota-valor ${claseNota(n.nota)}">${n.nota.toFixed(1)}</span></td>
          <td>
            <div class="barra-nota">
              <div class="barra-fondo">
                <div class="barra-relleno ${claseBarra(n.nota)}" style="width:${n.nota * 10}%"></div>
              </div>
            </div>
          </td>
          <td><button class="accion-eliminar" onclick="eliminar(${n.id})">✕ Eliminar</button></td>
        </tr>
      `).join('');
    }

    // Estadísticas
    const media = notas.length ? (notas.reduce((s,n) => s + n.nota, 0) / notas.length).toFixed(2) : '—';
    const mejor = notas.length ? Math.max(...notas.map(n => n.nota)).toFixed(1) : '—';
    document.getElementById('stat-media').textContent = media;
    document.getElementById('stat-total').textContent = notas.length;
    document.getElementById('stat-mejor').textContent = mejor;
  }

  // ── Filtros / Orden ──────────────────────────────────────────────────────
  document.getElementById('filtros').addEventListener('click', e => {
    if (!e.target.matches('.filtro-btn')) return;
    document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('activo'));
    e.target.classList.add('activo');
    filtroActual = e.target.dataset.filtro;
    renderizar();
  });
  document.getElementById('selectOrden').addEventListener('change', renderizar);

  // ── Eliminar nota ────────────────────────────────────────────────────────
  async function eliminar(id) {
    await SoroAPI.notas.delete(id);
    notas = notas.filter(n => n.id !== id);
    renderizar();
  }

  // ── Modal ────────────────────────────────────────────────────────────────
  const overlay = document.getElementById('overlayModal');
  document.getElementById('btnNuevaNota').addEventListener('click', () => {
    document.getElementById('inputFecha').value = new Date().toISOString().slice(0,10);
    overlay.classList.add('visible');
  });
  document.getElementById('btnCancelar').addEventListener('click', () => overlay.classList.remove('visible'));
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('visible'); });

  document.getElementById('btnGuardar').addEventListener('click', async () => {
    const asig  = document.getElementById('inputAsignatura').value;
    const eval_ = document.getElementById('inputEvaluacion').value.trim();
    const fecha = document.getElementById('inputFecha').value;
    const nota  = parseFloat(document.getElementById('inputNota').value);

    if (!eval_ || !fecha || isNaN(nota) || nota < 0 || nota > 10) {
      alert('Por favor, completa todos los campos correctamente (nota entre 0 y 10).');
      return;
    }

    const res = await SoroAPI.notas.add(asig, eval_, fecha, nota);
    if (res.ok) {
      notas.push(res.nota);
      document.getElementById('inputEvaluacion').value = '';
      document.getElementById('inputNota').value = '';
      overlay.classList.remove('visible');
      filtroActual = 'todas';
      document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('activo'));
      document.querySelector('[data-filtro="todas"]').classList.add('activo');
      renderizar();
    }
  });

  // ── Nombre del alumno en el hero ─────────────────────────────────────────
  const sesion = SoroAPI.auth.getSession();
  if (sesion) {
    document.getElementById('nombre-alumno').textContent = sesion.nombre + ' ' + sesion.apellidos;
  }

  // ── Inicializar: carga notas desde SoroAPI ───────────────────────────────
  (async function init() {
    notas = await SoroAPI.notas.getAll();
    renderizar();
  })();
