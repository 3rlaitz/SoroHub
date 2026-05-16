// ═══════════════════════════════════════════════════════════════════════════
//  SOROHUB – GESTIÓN DE SESIÓN Y HEADER
//  Depende de: config.js, api.js  (deben cargarse antes que este archivo)
//
//  • Lee la sesión activa a través de SoroAPI.auth.getSession()
//  • Actualiza el bloque .acciones del header en todas las páginas
//  • Expone window.SoroAuth como alias para login.html
// ═══════════════════════════════════════════════════════════════════════════

(function () {

  // ── Actualiza el header según el estado de sesión ─────────────────────
  function actualizarHeader() {
    const acciones = document.querySelector('.acciones');
    if (!acciones) return;

    const usuario = SoroAPI.auth.getSession();

    if (usuario) {
      acciones.innerHTML = `
        <span class="saludo-usuario">
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
        <a class="boton boton-secundario" href="login.html?modo=login">Iniciar sesión</a>
        <a class="boton boton-principal"  href="login.html?modo=registro">Registrarse</a>
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
  };

  actualizarHeader();

})();
