  // ── ESTADO ───────────────────────────────────────────────────────────────
  let tareas = [];
  let fechaCalendario = new Date(); // Mes y año actual visualizado
  let filtroActual = 'todas';
  let busqueda = '';

  // ── INIT ─────────────────────────────────────────────────────────────────
  async function init() {
    tareas = await SoroAPI.tareas.getAll();
    
    // Actualizar estados automáticos (Vencidas si la fecha pasó y están Pendientes)
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    let modificado = false;
    tareas.forEach(t => {
      if (t.tipo !== 'Evento' && t.estado === 'Pendiente') {
        const d = new Date(t.fecha + 'T00:00:00');
        if (d < hoy) { t.estado = 'Vencida'; modificado = true; }
      }
    });
    if (modificado) await SoroAPI.tareas.saveAll(tareas);

    renderCalendario();
    renderLista();
    actualizarStats();
  }

  // ── CALENDARIO ───────────────────────────────────────────────────────────
  function renderCalendario() {
    const year = fechaCalendario.getFullYear();
    const month = fechaCalendario.getMonth();
    
    const mesNombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    document.getElementById('mesActualStr').textContent = `${mesNombres[month]} ${year}`;

    const primerDia = new Date(year, month, 1).getDay(); // 0 (Dom) - 6 (Sab)
    const offset = primerDia === 0 ? 6 : primerDia - 1; // Lunes = 0, Domingo = 6
    const diasMes = new Date(year, month + 1, 0).getDate();

    const grid = document.querySelector('.cal-grid');
    // Eliminar días antiguos
    document.querySelectorAll('.cal-dia, .cal-dia.empty').forEach(el => el.remove());

    const hoy = new Date();

    // Rellenar huecos inicio
    for (let i = 0; i < offset; i++) {
      const div = document.createElement('div');
      div.className = 'cal-dia empty';
      grid.appendChild(div);
    }

    // Días del mes
    for (let i = 1; i <= diasMes; i++) {
      const fechaStr = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
      const div = document.createElement('div');
      div.className = 'cal-dia';
      div.onclick = () => abrirModal(null, fechaStr); // Añadir tarea en este día

      let numHtml = `<span class="dia-num">${i}</span>`;
      if (hoy.getDate() === i && hoy.getMonth() === month && hoy.getFullYear() === year) {
        numHtml = `<span class="dia-num dia-hoy">${i}</span>`;
      }

      // Tareas de este día
      const tareasDia = tareas.filter(t => t.fecha === fechaStr);
      let tareasHtml = tareasDia.map(t => {
        const cls = t.tipo === 'Evento' ? 't-evento' : (t.estado === 'Pendiente' ? 't-pendiente' : t.estado === 'Acabada' ? 't-acabada' : 't-vencida');
        // Evitar burbujeo para que al clickar la tarea abra la edición
        return `<div class="cal-tarea ${cls}" onclick="event.stopPropagation(); abrirModal(${t.id})">${t.nombre}</div>`;
      }).join('');

      div.innerHTML = numHtml + tareasHtml;
      grid.appendChild(div);
    }
  }

  document.getElementById('btnPrevMes').onclick = () => {
    fechaCalendario.setMonth(fechaCalendario.getMonth() - 1);
    renderCalendario();
  };
  document.getElementById('btnNextMes').onclick = () => {
    fechaCalendario.setMonth(fechaCalendario.getMonth() + 1);
    renderCalendario();
  };

  // ── LISTA ────────────────────────────────────────────────────────────────
  function renderLista() {
    let datos = filtroActual === 'todas' ? [...tareas] : tareas.filter(t => t.estado === filtroActual);
    
    if (busqueda) {
      datos = datos.filter(t => t.nombre.toLowerCase().includes(busqueda) || t.asignatura.toLowerCase().includes(busqueda));
    }

    // Ordenar: Pendientes/Vencidas arriba por fecha. Acabadas abajo.
    datos.sort((a, b) => {
      if (a.estado === 'Acabada' && b.estado !== 'Acabada') return 1;
      if (a.estado !== 'Acabada' && b.estado === 'Acabada') return -1;
      return a.fecha.localeCompare(b.fecha);
    });

    const cont = document.getElementById('contenedorTareas');
    if (datos.length === 0) {
      cont.innerHTML = `<div style="text-align:center; padding: 40px; color: #475569;">No hay tareas.</div>`;
      return;
    }

    cont.innerHTML = datos.map(t => {
      const esEvento = t.tipo === 'Evento';
      const cls = esEvento ? 'evento' : t.estado.toLowerCase();
      const pillCls = esEvento ? 'pill-evento' : `pill-${cls}`;
      const estadoTxt = esEvento ? 'Evento' : t.estado;
      
      // Transformar fecha YYYY-MM-DD a DD/MM/YYYY
      const [y,m,d] = t.fecha.split('-');
      const fechaFmt = `${d}/${m}/${y}`;

      return `
        <div class="tarea-item ${cls}" onclick="abrirModal(${t.id})">
          <div class="tarea-info">
            <div class="tarea-nombre">${t.nombre}</div>
            <div class="tarea-meta">
              <span class="t-badge-asig">${t.asignatura}</span>
              <span>📅 ${fechaFmt}</span>
            </div>
          </div>
          <div class="tarea-derecha">
            <span class="estado-pill ${pillCls}">${estadoTxt}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // ── MODAL ────────────────────────────────────────────────────────────────
  const modal = document.getElementById('overlayModal');
  
  function abrirModal(id = null, fechaDefecto = '') {
    modal.classList.add('visible');
    const esEdicion = id !== null;
    
    document.getElementById('modalTitulo').textContent = esEdicion ? 'Editar Tarea' : 'Añadir Tarea';
    document.getElementById('btnEliminar').style.display = esEdicion ? 'block' : 'none';
    
    if (esEdicion) {
      const t = tareas.find(x => x.id === id);
      document.getElementById('inputId').value = t.id;
      document.getElementById('inputTipo').value = t.tipo || 'Tarea';
      document.getElementById('inputNombre').value = t.nombre;
      document.getElementById('inputAsignatura').value = t.asignatura;
      document.getElementById('inputFecha').value = t.fecha;
      document.getElementById('inputEstado').value = t.estado || 'Pendiente';
    } else {
      document.getElementById('inputId').value = '';
      document.getElementById('inputTipo').value = 'Tarea';
      document.getElementById('inputNombre').value = '';
      document.getElementById('inputAsignatura').value = '';
      document.getElementById('inputFecha').value = fechaDefecto || new Date().toISOString().slice(0,10);
      document.getElementById('inputEstado').value = 'Pendiente';
    }
    toggleCamposEvento();
  }

  function toggleCamposEvento() {
    const isEvento = document.getElementById('inputTipo').value === 'Evento';
    document.getElementById('wrapEstado').style.display = isEvento ? 'none' : 'flex';
    
    // Botón finalizar solo si es Tarea y no está Acabada, y es edición
    const isEdicion = !!document.getElementById('inputId').value;
    const isAcabada = document.getElementById('inputEstado').value === 'Acabada';
    document.getElementById('btnFinalizar').style.display = (isEdicion && !isEvento && !isAcabada) ? 'block' : 'none';
  }

  function cerrarModal() { modal.classList.remove('visible'); }
  document.getElementById('btnCancelar').onclick = cerrarModal;
  modal.onclick = e => { if (e.target === modal) cerrarModal(); };

  document.getElementById('btnGuardar').onclick = async () => {
    const id = document.getElementById('inputId').value;
    const tipo = document.getElementById('inputTipo').value;
    const nombre = document.getElementById('inputNombre').value.trim();
    const asignatura = document.getElementById('inputAsignatura').value.trim();
    const fecha = document.getElementById('inputFecha').value;
    const estado = tipo === 'Evento' ? 'Pendiente' : document.getElementById('inputEstado').value;

    if (!nombre || !fecha) return alert('Rellena el nombre y la fecha');

    if (id) {
      // Editar
      const t = tareas.find(x => x.id == id);
      t.tipo = tipo; t.nombre = nombre; t.asignatura = asignatura; t.fecha = fecha; t.estado = estado;
    } else {
      // Nuevo
      const newId = tareas.length ? Math.max(...tareas.map(x=>x.id)) + 1 : 1;
      tareas.push({ id: newId, tipo, nombre, asignatura, fecha, estado });
    }

    await SoroAPI.tareas.saveAll(tareas);
    cerrarModal();
    actualizarVistas();
  };

  document.getElementById('btnEliminar').onclick = async () => {
    const id = document.getElementById('inputId').value;
    if (confirm('¿Seguro que quieres eliminar esta tarea?')) {
      tareas = tareas.filter(x => x.id != id);
      await SoroAPI.tareas.saveAll(tareas);
      cerrarModal();
      actualizarVistas();
    }
  };

  document.getElementById('btnFinalizar').onclick = async () => {
    const id = document.getElementById('inputId').value;
    const t = tareas.find(x => x.id == id);
    if(t) {
      t.estado = 'Acabada';
      await SoroAPI.tareas.saveAll(tareas);
      cerrarModal();
      actualizarVistas();
    }
  };

  // ── ACTUALIZAR TODO ──────────────────────────────────────────────────────
  function actualizarVistas() {
    actualizarStats();
    renderCalendario();
    renderLista();
  }

  function actualizarStats() {
    document.getElementById('stat-total').textContent = tareas.length;
    document.getElementById('stat-pendientes').textContent = tareas.filter(t => t.tipo !== 'Evento' && t.estado === 'Pendiente').length;
    document.getElementById('stat-entregadas').textContent = tareas.filter(t => t.tipo !== 'Evento' && t.estado === 'Acabada').length;
    document.getElementById('stat-vencidas').textContent = tareas.filter(t => t.tipo !== 'Evento' && t.estado === 'Vencida').length;
  }

  // ── FILTROS LISTA ────────────────────────────────────────────────────────
  document.getElementById('filtros').addEventListener('click', e => {
    if (!e.target.matches('.tab-btn')) return;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('activo'));
    e.target.classList.add('activo');
    filtroActual = e.target.dataset.filtro;
    renderLista();
  });

  document.getElementById('buscador').addEventListener('input', e => {
    busqueda = e.target.value.toLowerCase();
    renderLista();
  });

  // Badge alumno
  const sesion = SoroAPI.auth.getSession();
  if (sesion) {
    document.getElementById('alumno-badge').innerHTML = `📋 ${sesion.nombre} ${sesion.apellidos}`;
  }

  init();
