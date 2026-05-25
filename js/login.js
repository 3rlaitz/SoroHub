  // ── PESTAÑAS ─────────────────────────────────────────────────────
  function cambiarTab(modo) {
    const esLogin = modo === 'login';
    document.getElementById('tabLogin').classList.toggle('activa', esLogin);
    document.getElementById('tabRegistro').classList.toggle('activa', !esLogin);
    document.getElementById('formLogin').classList.toggle('visible', esLogin);
    document.getElementById('formRegistro').classList.toggle('visible', !esLogin);
    limpiarMensajes();
  }

  function limpiarMensajes() {
    ['msgLogin','msgRegistro'].forEach(id => {
      const el = document.getElementById(id);
      el.className = 'mensaje';
      el.textContent = '';
    });
  }

  function mostrarMensaje(id, texto, tipo) {
    const el = document.getElementById(id);
    el.textContent = texto;
    el.className = 'mensaje ' + tipo;
  }

  // ── LOGIN ──────────────────────────────────────────────────────
  async function iniciarSesion() {
    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
      mostrarMensaje('msgLogin', '⚠️ Por favor, rellena todos los campos.', 'error');
      return;
    }

    const res = await SoroAuth.login(email, password);
    if (res.ok) {
      mostrarMensaje('msgLogin', '✅ ¡Sesión iniciada! Redirigiendo…', 'exito');
      setTimeout(() => window.location.href = '../index.html', 1200);
    } else {
      mostrarMensaje('msgLogin', '❌ ' + (res.message || 'Email o contraseña incorrectos.'), 'error');
    }
  }

  // ── REGISTRO ────────────────────────────────────────────────────
  async function registrar() {
    const nombre    = document.getElementById('regNombre').value.trim();
    const apellidos = document.getElementById('regApellidos').value.trim();
    const email     = document.getElementById('regEmail').value.trim();
    const pass      = document.getElementById('regPassword').value;
    const pass2     = document.getElementById('regPassword2').value;

    if (!nombre || !apellidos || !email || !pass || !pass2) {
      mostrarMensaje('msgRegistro', '⚠️ Rellena todos los campos.', 'error');
      return;
    }
    if (pass.length < 6) {
      mostrarMensaje('msgRegistro', '⚠️ La contraseña debe tener al menos 6 caracteres.', 'error');
      return;
    }
    if (pass !== pass2) {
      mostrarMensaje('msgRegistro', '❌ Las contraseñas no coinciden.', 'error');
      return;
    }

    const res = await SoroAuth.register(nombre, apellidos, email, pass);
    if (res.ok) {
      mostrarMensaje('msgRegistro', '✅ ¡Cuenta creada! Redirigiendo…', 'exito');
      setTimeout(() => window.location.href = '../index.html', 1200);
    } else {
      mostrarMensaje('msgRegistro', '❌ ' + (res.message || 'Ya existe una cuenta con ese correo.'), 'error');
    }
  }

  // ── ENTER para enviar ────────────────────────────────────────────
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const tabActiva = document.getElementById('tabLogin').classList.contains('activa');
    tabActiva ? iniciarSesion() : registrar();
  });

  // ── INICIALIZAR PESTAÑA SEGÚN URL ────────────────────────────────
  const modoURL = new URLSearchParams(window.location.search).get('modo');
  cambiarTab(modoURL === 'registro' ? 'registro' : 'login');

  // Redirigir si ya hay sesión activa
  if (SoroAuth.getSession()) window.location.href = '../index.html';
