const path = require('path');
const crypto = require('crypto');

function extensionDesdeMime(mime) {
  const map = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.ms-excel.sheet.macroEnabled.12': '.xlsm',
    'application/vnd.oasis.opendocument.text': '.odt',
    'application/vnd.oasis.opendocument.spreadsheet': '.ods',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
  };
  return map[mime] || '';
}

function generarNombreArchivoMultimedia(originalname, mimetype) {
  const ext = path.extname(originalname) || extensionDesdeMime(mimetype);
  return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
}

module.exports = { generarNombreArchivoMultimedia, extensionDesdeMime };
