const config = require('../config');
const AppError = require('../utils/AppError');

function requerirPermiso(permiso) {
  return (req, res, next) => {
    if (req.auth?.panelJwt && !req.auth?.apiKeyDoc) {
      return next();
    }
    if (!config.mongodbUri || req.auth?.legacy || !req.auth?.apiKeyDoc) {
      return next();
    }
    const ok = req.auth?.apiKeyDoc?.permisos?.[permiso];
    if (!ok) {
      return next(new AppError(`Permiso "${permiso}" no concedido para esta API key`, 403));
    }
    return next();
  };
}

module.exports = requerirPermiso;
