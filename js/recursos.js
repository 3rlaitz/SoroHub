// ── ESTADO ───────────────────────────────────────────────────────────────
let recursos = JSON.parse(localStorage.getItem('sorohub_recursos')) || [
  { id: 1, titulo: "Apuntes de Historia - Tema 1", desc: "Resumen completo de la Revolución Industrial", autor: "Admin", fecha: "2026-05-15", comentarios: [{autor: "María", texto: "¡Gracias! Muy útil."}] },
  { id: 2, titulo: "Plantilla Trabajo Ciencias", desc: "Formato en Word para entregar las prácticas", autor: "Profe Ciencias", fecha: "2026-05-14", comentarios: [] }
];
let sesionUsuario = SoroAPI.auth.getSession();

// ── INIT ─────────────────────────────────────────────────────────────────
function init() {
  if (!sesionUsuario) {
    document.getElementById('seccionBloqueada').style.display = 'flex';
    document.getElementById('contenidoPrincipal').style.display = 'none';
  } else {
    document.getElementById('seccionBloqueada').style.display = 'none';
    document.getElementById('contenidoPrincipal').style.display = 'block';
    renderRecursos();
  }
}

// ── RENDER ───────────────────────────────────────────────────────────────
function renderRecursos() {
  const cont = document.getElementById('gridRecursos');
  if (recursos.length === 0) {
    cont.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: #475569;">No hay recursos todavía. ¡Sé el primero en publicar!</div>`;
    return;
  }

  // Mostrar más recientes primero
  const ordenados = [...recursos].reverse();

  cont.innerHTML = ordenados.map(r => `
    <div class="recurso-card">
      <div class="recurso-header">
        <h3>${r.titulo}</h3>
        <p>${r.desc}</p>
      </div>
      <div class="recurso-meta">
        <span class="recurso-autor">👤 ${r.autor}</span>
        <span>📅 ${r.fecha}</span>
      </div>
      <div class="recurso-acciones">
        <a href="#" class="btn-descargar" onclick="alert('Descarga simulada de: ${r.titulo}'); event.preventDefault();">⬇️ Descargar archivo</a>
      </div>
      <div class="comentarios-section">
        <div class="comentarios-lista">
          ${r.comentarios.map(c => `
            <div class="comentario-item">
              <span class="comentario-autor">${c.autor}:</span>
              <span class="comentario-texto">${c.texto}</span>
            </div>
          `).join('') || '<div class="comentario-item" style="color:#64748b; background:transparent;">No hay comentarios aún.</div>'}
        </div>
        <div class="form-comentario">
          <input type="text" id="inputComentario_${r.id}" placeholder="Escribe un comentario..." onkeypress="if(event.key==='Enter') agregarComentario(${r.id})">
          <button class="btn-comentar" onclick="agregarComentario(${r.id})">Enviar</button>
        </div>
      </div>
    </div>
  `).join('');
}

// ── COMENTARIOS ──────────────────────────────────────────────────────────
function agregarComentario(id) {
  const input = document.getElementById(`inputComentario_${id}`);
  const texto = input.value.trim();
  if (!texto) return;

  const r = recursos.find(x => x.id === id);
  if (r) {
    r.comentarios.push({
      autor: sesionUsuario.nombre,
      texto: texto
    });
    localStorage.setItem('sorohub_recursos', JSON.stringify(recursos));
    renderRecursos();
  }
}

// ── MODAL SUBIR ──────────────────────────────────────────────────────────
const modalSubir = document.getElementById('modalSubir');
document.getElementById('btnSubirRecurso')?.addEventListener('click', () => {
  document.getElementById('inputTitulo').value = '';
  document.getElementById('inputDesc').value = '';
  document.getElementById('inputFile').value = '';
  modalSubir.classList.add('visible');
});
document.getElementById('btnCancelarSubir')?.addEventListener('click', () => modalSubir.classList.remove('visible'));

document.getElementById('btnGuardarRecurso')?.addEventListener('click', () => {
  const titulo = document.getElementById('inputTitulo').value.trim();
  const desc = document.getElementById('inputDesc').value.trim();
  
  if (!titulo) return alert('El título es obligatorio');

  const nuevoId = recursos.length ? Math.max(...recursos.map(r=>r.id)) + 1 : 1;
  recursos.push({
    id: nuevoId,
    titulo,
    desc,
    autor: sesionUsuario.nombre,
    fecha: new Date().toISOString().slice(0,10),
    comentarios: []
  });

  localStorage.setItem('sorohub_recursos', JSON.stringify(recursos));
  modalSubir.classList.remove('visible');
  renderRecursos();
});

init();
