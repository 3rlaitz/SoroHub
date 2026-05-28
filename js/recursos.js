// ── ESTADO ───────────────────────────────────────────────────────────────
let recursos = [];
let recursoEditandoId = null;
const MAX_RECURSO_FILE_SIZE_MB = 50;
const MAX_RECURSO_FILE_SIZE = MAX_RECURSO_FILE_SIZE_MB * 1024 * 1024;

function archivoValido(file) {
  const nombre = file.name.toLowerCase();
  return nombre.endsWith('.rar') || nombre.endsWith('.pdf');
}

function archivoDemasiadoGrande(file) {
  return file.size > MAX_RECURSO_FILE_SIZE;
}

function normalizarRecursoCliente(recurso) {
  let comentarios = recurso.comentarios || [];

  if (typeof comentarios === 'string') {
    try {
      comentarios = JSON.parse(comentarios);
    } catch {
      comentarios = [];
    }
  }

  if (!Array.isArray(comentarios)) comentarios = [];

  return {
    id: recurso.id,
    titulo: recurso.titulo || '',
    desc: recurso.desc || '',
    autor: recurso.autor || '',
    fecha: recurso.fecha || '',
    nombreArchivo: recurso.nombreArchivo || recurso.nombre_archivo || '',
    archivoPath: recurso.archivoPath || recurso.archivo_path || '',
    archivoMime: recurso.archivoMime || recurso.archivo_mime || '',
    archivoSize: recurso.archivoSize ?? recurso.archivo_size ?? 0,
    archivoUrl: recurso.archivoUrl || `/recursos/${recurso.id}/descargar`,
    esPropietario: Boolean(recurso.esPropietario),
    comentarios,
  };
}

// ── INICIALIZACIÓN ───────────────────────────────────────────────────────
async function init() {
  const inputFile = document.getElementById('inputFile');
  if (inputFile) inputFile.accept = '.rar,.pdf';

  try {
    recursos = (await SoroAPI.recursos.getAll()).map(normalizarRecursoCliente);
  } catch (e) {
    recursos = [];
  }

  renderRecursos();
  SoroAuth.requerirSesion();
}

// ── RENDERIZADO DE RECURSOS ──────────────────────────────────────────────
function renderRecursos() {
  const cont = document.getElementById('gridRecursos');
  if (recursos.length === 0) {
    cont.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: #475569;">No hay recursos todavia. Se el primero en publicar.</div>`;
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
        <span class="recurso-autor">Autor: ${r.autor}</span>
        <span>${r.fecha}</span>
      </div>
      <div class="recurso-meta">
        <span>${r.nombreArchivo || 'Archivo sin nombre'}</span>
        <span>${r.archivoSize ? `${Math.round(r.archivoSize / 1024)} KB` : ''}</span>
      </div>
      <div class="recurso-acciones">
        <a href="#" class="btn-descargar" onclick="descargarRecurso(${r.id}); event.preventDefault();">Descargar archivo</a>
        ${r.esPropietario ? `
          <button class="btn-editar" onclick="abrirModalEditar(${r.id})">Editar</button>
          <button class="btn-eliminar" onclick="eliminarRecurso(${r.id})">Eliminar</button>
        ` : ''}
      </div>
      <div class="comentarios-section">
        <div class="comentarios-lista">
          ${(r.comentarios || []).map(c => `
            <div class="comentario-item">
              <span class="comentario-autor">${c.autor}:</span>
              <span class="comentario-texto">${c.texto}</span>
            </div>
          `).join('') || '<div class="comentario-item" style="color:#64748b; background:transparent;">No hay comentarios aun.</div>'}
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

// ── DESCARGA DE ARCHIVOS ─────────────────────────────────────────────────
function descargarRecurso(id) {
  const r = recursos.find(x => x.id === id);
  if (!r || !r.archivoUrl) return alert('Este recurso no tiene archivo disponible.');

  window.location.href = r.archivoUrl.startsWith('http')
    ? r.archivoUrl
    : `${SoroConfig.API_BASE_URL}${r.archivoUrl}`;
}

// ── GESTIÓN DEL MODAL ────────────────────────────────────────────────────
const modalSubir = document.getElementById('modalSubir');

function abrirModalNuevo() {
  recursoEditandoId = null;
  document.getElementById('modalTitulo').textContent = 'Subir nuevo recurso';
  document.getElementById('inputTitulo').value = '';
  document.getElementById('inputDesc').value = '';
  document.getElementById('inputFile').value = '';
  document.getElementById('labelArchivo').textContent = 'Archivo .rar o PDF';
  document.getElementById('btnGuardarRecurso').textContent = 'Publicar';
  modalSubir.classList.add('visible');
}

function abrirModalEditar(id) {
  const recurso = recursos.find(r => r.id === id);
  if (!recurso) return;

  recursoEditandoId = id;
  document.getElementById('modalTitulo').textContent = 'Editar recurso';
  document.getElementById('inputTitulo').value = recurso.titulo;
  document.getElementById('inputDesc').value = recurso.desc || '';
  document.getElementById('inputFile').value = '';
  document.getElementById('labelArchivo').textContent = 'Nuevo archivo .rar o PDF (opcional)';
  document.getElementById('btnGuardarRecurso').textContent = 'Guardar cambios';
  modalSubir.classList.add('visible');
}

async function eliminarRecurso(id) {
  if (!confirm('Seguro que quieres eliminar este recurso?')) return;

  const res = await SoroAPI.recursos.delete(id);
  if (!res.ok) return alert(res.message || 'No se pudo eliminar el recurso');

  recursos = recursos.filter(r => r.id !== id);
  renderRecursos();
}

document.getElementById('btnSubirRecurso')?.addEventListener('click', abrirModalNuevo);
document.getElementById('btnCancelarSubir')?.addEventListener('click', () => modalSubir.classList.remove('visible'));

document.getElementById('btnGuardarRecurso')?.addEventListener('click', async () => {
  const titulo = document.getElementById('inputTitulo').value.trim();
  const desc = document.getElementById('inputDesc').value.trim();
  const file = document.getElementById('inputFile').files[0];
  const esEdicion = recursoEditandoId !== null;

  if (!titulo) return alert('El titulo es obligatorio');
  if (!esEdicion && !file) return alert('Selecciona un archivo .rar o PDF');
  if (file && !archivoValido(file)) return alert('Solo se pueden subir archivos .rar y PDF');
  if (file && archivoDemasiadoGrande(file)) return alert(`El archivo no puede superar ${MAX_RECURSO_FILE_SIZE_MB} MB`);

  // Se pasa el File directamente, SoroAPI construye el FormData internamente
  const res = esEdicion
    ? await SoroAPI.recursos.update(recursoEditandoId, titulo, desc, file ?? null)
    : await SoroAPI.recursos.add(titulo, desc, file);

  if (!res.ok) return alert(res.message || 'No se pudo publicar el recurso');

  const recursoGuardado = normalizarRecursoCliente(res.recurso);

  if (esEdicion) {
    recursos = recursos.map(r => r.id === recursoEditandoId ? recursoGuardado : r);
  } else {
    recursos.push(recursoGuardado);
  }

  recursoEditandoId = null;
  modalSubir.classList.remove('visible');
  renderRecursos();
});

init();
