const fs = require('fs');
const config = require('./config');
const { conectarMongo } = require('./db/mongoose');
const AppError = require('./utils/AppError');

let initPromise = null;
let initError = null;

function isVercel() {
  return Boolean(process.env.VERCEL);
}

/**
 * Validación de entorno y conexión a MongoDB (idempotente).
 * Usado por `server.js` al arrancar y por middleware en serverless (Vercel).
 */
async function ensureServerReady() {
  if (initError) {
    throw initError;
  }
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    if (config.isProduction && config.corsOrigins.length === 0) {
      throw new AppError(
        'En producción defina CORS_ORIGINS con los dominios del frontend (separados por coma).',
        503,
      );
    }

    if (isVercel() && config.storageDriver !== 's3') {
      console.warn(
        '[orion] Vercel + STORAGE_DRIVER=local: los archivos se guardan en',
        config.storageDir,
        '(temporal; no persisten entre despliegues ni entre todas las invocaciones). Use S3 en producción.',
      );
    }

    if (config.storageDriver === 's3') {
      if (!config.s3.bucket) {
        throw new AppError('STORAGE_DRIVER=s3 requiere la variable S3_BUCKET.', 503);
      }
    } else {
      fs.mkdirSync(config.storageDir, { recursive: true });
    }

    if (config.mongodbUri) {
      await conectarMongo();
      if (!config.jwtMediaSecret && config.storageDriver !== 's3') {
        throw new AppError(
          'Con MONGODB_URI y almacenamiento local defina JWT_MEDIA_SECRET para enlaces de acceso.',
          503,
        );
      }
      if (!config.jwtAuthSecret) {
        throw new AppError('Con MONGODB_URI defina JWT_AUTH_SECRET para login de usuarios.', 503);
      }
    }
  })().catch((err) => {
    initError = err;
    initPromise = null;
    throw err;
  });

  return initPromise;
}

module.exports = { ensureServerReady, isVercel };
