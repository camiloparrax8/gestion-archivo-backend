const config = require('./index');

/**
 * Opciones de CORS: solo orígenes en la lista blanca (config.corsOrigins).
 * Peticiones sin cabecera Origin (curl, Postman, integraciones servidor) se permiten.
 */
function buildCorsOptions() {
  const allowed = new Set(config.corsOrigins);

  return {
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }
      const normalized = String(origin).replace(/\/$/, '');
      if (allowed.has(normalized)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-API-Key',
      'X-Master-Key',
      'X-Llave-Id',
    ],
  };
}

module.exports = { buildCorsOptions };
