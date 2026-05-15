const config = require('../config');
const AppError = require('../utils/AppError');

function requerirMasterKey(req, res, next) {
  const enviada = req.get('x-master-key') || req.get('X-Master-Key');
  if (!config.masterApiKey) {
    return next(new AppError('MASTER_API_KEY no está configurada en el servidor', 503));
  }
  if (!enviada || enviada !== config.masterApiKey) {
    return next(new AppError('Master key no válida', 401));
  }
  return next();
}

module.exports = requerirMasterKey;
