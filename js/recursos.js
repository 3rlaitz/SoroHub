// ESTADO
let recursos = [];
let recursoEditandoId = null;

function leerArchivoComoDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function archivoValido(file) {
  const nombre = file.name.toLowerCase();
  return nombre.endsWith('.rar') || nombre.endsWith('.pdf');
}

// INIT
async function init() {
  const inputFile = document.getElementById('inputFile');
  if (inputFile) inputFile.accept = '.rar,.pdf';

  try {
    recursos = await SoroAPI.recursos.getAll();
  } catch (e) {
    alert('No se pudieron cargar los recursos del servidor');
    recursos = [];
  }

  renderRecursos();
  SoroAuth.requerirSesion();
}

// RENDER
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

// COMENTARIOS
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

// DESCARGA
function descargarRecurso(id) {
  const r = recursos.find(x => x.id === id);
  if (!r) return;

  if (r.archivoUrl) {
    window.location.href = r.archivoUrl.startsWith('http')
      ? r.archivoUrl
      : `${SoroConfig.API_BASE_URL}${r.archivoUrl}`;
    return;
  }

  const enlace = document.createElement('a');
  enlace.href = r.archivoData;
  enlace.download = r.nombreArchivo || `${r.titulo}.rar`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
}

// MODAL
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

  let nombreArchivo;
  let archivoData;

  if (file) {
    try {
      nombreArchivo = file.name;
      archivoData = await leerArchivoComoDataURL(file);
    } catch {
      return alert('No se pudo leer el archivo seleccionado');
    }
  }

  const res = esEdicion
    ? await SoroAPI.recursos.update(recursoEditandoId, titulo, desc, nombreArchivo, archivoData)
    : await SoroAPI.recursos.add(titulo, desc, nombreArchivo, archivoData);
  if (!res.ok) return alert(res.message || 'No se pudo publicar el recurso');

  if (esEdicion) {
    recursos = recursos.map(r => r.id === recursoEditandoId ? res.recurso : r);
  } else {
    recursos.push(res.recurso);
  }

  recursoEditandoId = null;
  modalSubir.classList.remove('visible');
  renderRecursos();
});

init();
