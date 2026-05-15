const multer = require('multer');
const config = require('../config');

function errorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: { message: 'El archivo supera el tamaño máximo permitido' },
      });
    }
    return res.status(400).json({ error: { message: err.message } });
  }

  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Error interno del servidor';

  if (!config.isProduction) {
    console.error(err);
  }

  const body = {
    error: { message },
  };

  if (!config.isProduction && err.stack) {
    body.error.stack = err.stack;
  }

  res.status(status).json(body);
}

module.exports = errorHandler;
