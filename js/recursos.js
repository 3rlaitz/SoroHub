// ── ESTADO ───────────────────────────────────────────────────────────────
let recursos = [];

function leerArchivoComoDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── INIT ─────────────────────────────────────────────────────────────────
async function init() {
  const inputFile = document.getElementById('inputFile');
  if (inputFile) inputFile.accept = '.rar';

  try {
    recursos = await SoroAPI.recursos.getAll();
  } catch (e) {
    alert('No se pudieron cargar los recursos del servidor');
    recursos = [];
  }

  renderRecursos();
  SoroAuth.requerirSesion();
}

// ── RENDER ────────────────────────────────────────────────────────────────
function renderRecursos() {
  const cont = document.getElementById('gridRecursos');
  if (recursos.length === 0) {
    cont.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: #475569;">No hay recursos todavía. ¡Sé el primero en publicar!</div>`;
    return;
  }

  const ordenados = [...recursos].reverse();

  cont.innerHTML = ordenados.map(r => `
    <div class="recurso-card">
      <div class="recurso-header">
        <h3>${r.titulo}</h3>
        <p>${r.desc || ''}</p>
      </div>
      <div class="recurso-meta">
        <span class="recurso-autor">👤 ${r.autor}</span>
        <span>📅 ${r.fecha}</span>
      </div>
      <div class="recurso-acciones">
        <a href="#" class="btn-descargar" onclick="descargarRecurso(${r.id}); event.preventDefault();">⬇️ Descargar archivo</a>
      </div>
      <div class="comentarios-section">
        <div class="comentarios-lista">
          ${(r.comentarios || []).map(c => `
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
async function agregarComentario(id) {
  const input = document.getElementById(`inputComentario_${id}`);
  const texto = input.value.trim();
  if (!texto) return;

  const res = await SoroAPI.recursos.addComentario(id, texto);
  if (!res.ok) return alert(res.message || 'No se pudo guardar el comentario');

  const r = recursos.find(x => x.id === id);
  if (r) {
    r.comentarios = r.comentarios || [];
    r.comentarios.push(res.comentario);
    renderRecursos();
  }
}

// ── DESCARGA ─────────────────────────────────────────────────────────────
function descargarRecurso(id) {
  const r = recursos.find(x => x.id === id);
  if (!r) return;

  const enlace = document.createElement('a');
  enlace.href = r.archivoData;
  enlace.download = r.nombreArchivo || `${r.titulo}.rar`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
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

document.getElementById('btnGuardarRecurso')?.addEventListener('click', async () => {
  const titulo = document.getElementById('inputTitulo').value.trim();
  const desc = document.getElementById('inputDesc').value.trim();
  const file = document.getElementById('inputFile').files[0];

  if (!titulo) return alert('El título es obligatorio');
  if (!file) return alert('Selecciona un archivo .rar');
  if (!file.name.toLowerCase().endsWith('.rar')) return alert('Solo se pueden subir archivos .rar');

  let archivoData;
  try {
    archivoData = await leerArchivoComoDataURL(file);
  } catch {
    return alert('No se pudo leer el archivo seleccionado');
  }

  const res = await SoroAPI.recursos.add(titulo, desc, file.name, archivoData);
  if (!res.ok) return alert(res.message || 'No se pudo publicar el recurso');

  recursos.push(res.recurso);
  modalSubir.classList.remove('visible');
  renderRecursos();
});

init();
