/**
 * Segmentos de ruta libres (contexto, entidad): minúsculas, empiezan con letra.
 */
const SEGMENTO_SLUG_RE = /^[a-z][a-z0-9_-]{0,62}$/;

/**
 * Subcarpetas por tipo de contenido (perfil, galería, logo, etc.).
 */
const TIPOS_CARPETA_PERMITIDOS = new Set([
  'perfil',
  'logo',
  'galeria',
  'documentos',
  'marca',
  'otros',
]);

const MIME_PERMITIDOS = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel.sheet.macroEnabled.12',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
]);

/** Subcarpeta física bajo `{tipo}/` según MIME. */
const MIME_A_SUBCARPETA = new Map([
  ['application/pdf', 'pdf'],
  ['image/jpeg', 'jpeg'],
  ['image/png', 'png'],
  ['image/gif', 'gif'],
  ['image/webp', 'webp'],
  ['application/msword', 'doc'],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx'],
  ['application/vnd.ms-excel', 'xls'],
  ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx'],
  ['application/vnd.ms-excel.sheet.macroEnabled.12', 'xlsm'],
  ['application/vnd.oasis.opendocument.text', 'odt'],
  ['application/vnd.oasis.opendocument.spreadsheet', 'ods'],
]);

const SUBCARPETAS_TIPO_ARCHIVO = new Set(MIME_A_SUBCARPETA.values());

/**
 * @param {string} mimetype
 * @returns {string}
 */
function subcarpetaPorMime(mimetype) {
  const s = MIME_A_SUBCARPETA.get(mimetype);
  if (!s) {
    throw new Error(`MIME sin subcarpeta definida: ${mimetype}`);
  }
  return s;
}

const CAMPO_ARCHIVO = 'archivo';

module.exports = {
  TIPOS_CARPETA_PERMITIDOS,
  MIME_PERMITIDOS,
  MIME_A_SUBCARPETA,
  SUBCARPETAS_TIPO_ARCHIVO,
  subcarpetaPorMime,
  CAMPO_ARCHIVO,
  SEGMENTO_SLUG_RE,
};
