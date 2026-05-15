const fs = require('fs');
const path = require('path');
const multer = require('multer');
const config = require('../config');
const { MIME_PERMITIDOS, CAMPO_ARCHIVO, subcarpetaPorMime } = require('../config/multimedia');
const AppError = require('../utils/AppError');
const multimediaService = require('../services/multimediaService');
const { generarNombreArchivoMultimedia } = require('../utils/generarNombreArchivoMultimedia');

const storageDisco = multer.diskStorage({
  destination(req, file, cb) {
    try {
      const { contexto, entidad, id, tipo } = req.params;
      const clienteId =
        config.mongodbUri && !req.auth?.legacy && req.auth?.cliente?._id
          ? String(req.auth.cliente._id)
          : null;
      const sub = subcarpetaPorMime(file.mimetype);
      const dir = multimediaService.obtenerDirectorioAbsoluto(
        clienteId,
        contexto,
        entidad,
        id,
        tipo,
        sub,
      );
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    } catch (err) {
      cb(err);
    }
  },
  filename(req, file, cb) {
    const name = generarNombreArchivoMultimedia(file.originalname, file.mimetype);
    cb(null, name);
  },
});

const storageMemoria = multer.memoryStorage();

function crearUpload() {
  const storage = config.storageDriver === 's3' ? storageMemoria : storageDisco;
  return multer({
    storage,
    limits: { fileSize: config.uploadMaxBytes },
    fileFilter(req, file, cb) {
      if (!MIME_PERMITIDOS.has(file.mimetype)) {
        return cb(new AppError(`Tipo de archivo no permitido: ${file.mimetype}`, 400));
      }
      cb(null, true);
    },
  });
}

const upload = crearUpload();

module.exports = {
  subirUnArchivo: upload.single(CAMPO_ARCHIVO),
  nombreCampoArchivo: CAMPO_ARCHIVO,
};
