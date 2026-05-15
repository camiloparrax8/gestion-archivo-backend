const path = require('path');
const os = require('os');

const uploadMaxMb = Number(process.env.UPLOAD_MAX_MB) || 5;

const storageDriver = (process.env.STORAGE_DRIVER || 'local').toLowerCase();

const signedUrlExpiresSeconds = Math.min(
  Math.max(Number(process.env.SIGNED_URL_EXPIRES_SECONDS) || 900, 60),
  86400,
);

function resolveStorageDir() {
  const fromEnv = (process.env.STORAGE_DIR || process.env.UPLOADS_DIR || '').trim();
  if (fromEnv) {
    return path.resolve(process.cwd(), fromEnv);
  }
  /** En Vercel solo `/tmp` es escribible; los archivos no sobreviven entre invocaciones frías. */
  if (process.env.VERCEL) {
    return path.join(os.tmpdir(), 'orion-storage');
  }
  return path.resolve(process.cwd(), 'storage');
}

const storageDirResolved = resolveStorageDir();

module.exports = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  /** `local` = disco (`storage/` por defecto). `s3` = Amazon S3. */
  storageDriver,
  /**
   * Carpeta raíz en disco para STORAGE_DRIVER=local.
   * `STORAGE_DIR` tiene prioridad; `UPLOADS_DIR` se acepta por compatibilidad.
   */
  storageDir: storageDirResolved,
  /** @deprecated Usar `storageDir`. */
  get uploadsDir() {
    return storageDirResolved;
  },
  uploadMaxBytes: uploadMaxMb * 1024 * 1024,
  /** Si está definida y no hay MONGODB_URI, se usa como API key global (modo legado). */
  apiKey: process.env.API_KEY || undefined,
  /** URI de MongoDB. Si está definida, multimedia usa clientes y API keys en BD. */
  mongodbUri: (process.env.MONGODB_URI || '').trim() || undefined,
  /** Clave maestra para crear clientes y API keys (cabecera X-Master-Key). */
  masterApiKey: (process.env.MASTER_API_KEY || '').trim() || undefined,
  /** Secreto HS256 para enlaces temporales en almacenamiento local con MongoDB. */
  jwtMediaSecret: (process.env.JWT_MEDIA_SECRET || '').trim() || undefined,
  /** Secreto HS256 para autenticación de usuarios (login). */
  jwtAuthSecret: (process.env.JWT_AUTH_SECRET || '').trim() || undefined,
  /** TTL del token de login (ejemplo: 15m, 1h, 7d). */
  jwtAuthExpiresIn: (process.env.JWT_AUTH_EXPIRES_IN || '1h').trim(),
  /** TTL de firmas S3 / JWT (segundos, máx. 86400). */
  signedUrlExpiresSeconds,
  /** Días hasta expiración de documentos de auditoría (índice TTL). */
  auditoriaTtlDias: Math.min(Math.max(Number(process.env.AUDITORIA_TTL_DIAS) || 30, 1), 365),
  /** URL pública base para enlaces locales (ej. https://api.tudominio.com). Opcional. */
  publicBaseUrl: (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, ''),
  /**
   * Lista opcional de slugs de contexto permitidos (separados por coma).
   * Solo aplica en modo legado (sin MONGODB_URI).
   * Con MongoDB, el alcance de contextos lo controlan los prefijos por API key.
   */
  multimediaContextosPermitidos: (process.env.MULTIMEDIA_CONTEXTOS_PERMITIDOS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  s3: {
    bucket: process.env.S3_BUCKET || '',
    region: process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1',
    /** Prefijo opcional dentro del bucket (sin slashes al inicio/final). */
    keyPrefix: (process.env.S3_KEY_PREFIX || '').replace(/^\/+/, '').replace(/\/+$/, ''),
    /**
     * Base pública para URLs de objetos (CloudFront o dominio personalizado).
     * Si está vacío, se usa el host virtual del bucket: https://{bucket}.s3.{region}.amazonaws.com/...
     */
    publicBaseUrl: (process.env.S3_PUBLIC_BASE_URL || '').replace(/\/$/, ''),
  },
};
