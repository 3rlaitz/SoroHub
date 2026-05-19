// ═══════════════════════════════════════════════════════════════════════════
//  SOROHUB – CONFIGURACIÓN GLOBAL
//  Modifica este archivo para conectar la base de datos real.
// ═══════════════════════════════════════════════════════════════════════════

const SoroConfig = {
  // ── URL base de la API del servidor ─────────────────────────────────────
  // TODO: cambia esta URL por la del servidor cuando la BD esté lista.
  // Ejemplos:
  //   Desarrollo local → 'http://localhost:8080/api'
  //   Producción       → 'https://sorohub.com/api'
  API_BASE_URL: 'http://localhost:3000/api',

  // ── Modo mock ────────────────────────────────────────────────────────────
  // true  → usa localStorage (sin servidor, para desarrollo/pruebas)
  // false → usa fetch() contra API_BASE_URL (requiere servidor + BD activos)
  //
  // TODO: pon USE_MOCK = false cuando la base de datos esté conectada.
  USE_MOCK: false,
};
