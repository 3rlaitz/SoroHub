// ═══════════════════════════════════════════════════════════════════════════
//  SOROHUB – GESTIÓN DE SESIÓN Y HEADER
//  Depende de: config.js, api.js  (deben cargarse antes que este archivo)
//
//  • Lee la sesión activa a través de SoroAPI.auth.getSession()
//  • Actualiza el bloque .acciones del header en todas las páginas
//  • Expone window.SoroAuth como alias para login.html
// ═══════════════════════════════════════════════════════════════════════════

(function () {
  const enViews = window.location.pathname.includes('/views/');
  const rutaLogin = enViews ? 'login.html' : 'views/login.html';

  // ── Actualiza el header según el estado de sesión ─────────────────────
  function actualizarHeader() {
    const acciones = document.querySelector('.acciones');
    if (!acciones) return;

    const usuario = SoroAPI.auth.getSession();

    if (usuario) {
      acciones.innerHTML = `
        <span class="saludo-usuario" style="padding: 0% 0% 5% 0%;">
          👋 Bienvenid@, <strong>${usuario.nombre} ${usuario.apellidos}</strong>
        </span>
        <button class="boton boton-secundario" id="btnCerrarSesion">Cerrar sesión</button>
      `;
      document.getElementById('btnCerrarSesion').addEventListener('click', async () => {
        await SoroAPI.auth.logout();
        window.location.reload();
      });
    } else {
      acciones.innerHTML = `
        <a class="boton boton-secundario" href="${rutaLogin}?modo=login">Iniciar sesión</a>
        <a class="boton boton-principal"  href="${rutaLogin}?modo=registro">Registrarse</a>
      `;
    }
  }

  // ── API pública (usada en login.html) ─────────────────────────────────
  // Alias que delega en SoroAPI para mantener compatibilidad.
  window.SoroAuth = {
    login     : (email, pass)                         => SoroAPI.auth.login(email, pass),
    register  : (nombre, apellidos, email, pass)      => SoroAPI.auth.register(nombre, apellidos, email, pass),
    logout    : ()                                    => SoroAPI.auth.logout(),
    getSession: ()                                    => SoroAPI.auth.getSession(),
    requerirSesion: () => {
      if (!SoroAPI.auth.getSession()) {
        const main = document.querySelector('main');
        if (main) main.classList.add('contenido-borroso');
        
        const div = document.createElement('div');
        div.className = 'bloqueo-overlay';
        div.innerHTML = `
          <div class="bloqueo-contenido">
            <h1>🔒 Acceso Restringido</h1>
            <p>Inicia sesión o regístrate para ver y gestionar el contenido de esta sección.</p>
            <div style="display:flex; gap:10px; justify-content:center;">
              <a class="boton boton-principal" href="${rutaLogin}?modo=login">Iniciar sesión</a>
            </div>
          </div>
        `;
        document.body.appendChild(div);
        document.body.style.overflow = 'hidden';
        return false;
      }
      return true;
    }
  };

  actualizarHeader();

})();
