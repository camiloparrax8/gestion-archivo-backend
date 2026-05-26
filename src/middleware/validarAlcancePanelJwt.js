const config = require('../config');
const AppError = require('../utils/AppError');
const { alcanzaPrefijos } = require('./validarAlcanceMultimedia');

/**
 * Alcance para panel JWT sin API key: mismo cliente; opcionalmente prefijos si se envió llave.
 */
function validarAlcanceMultimediaPanel(req, res, next) {
  if (!config.mongodbUri || req.auth?.legacy) {
    return next();
  }
  if (!req.auth?.panelJwt) {
    return next();
  }
  if (req.auth?.apiKeyDoc) {
    return next();
  }

  const { contexto, entidad, id, tipo } = req.params;
  const rutaLogica = `${contexto}/${entidad}/${id}/${tipo}`;
  const prefs = req.auth?.panelPrefijos || [];
  if (prefs.length > 0 && !alcanzaPrefijos(rutaLogica, prefs)) {
    return next(new AppError('La ruta queda fuera del alcance permitido', 403));
  }
  return next();
}

function validarAlcanceBrowsePanel(req, res, next) {
  if (!config.mongodbUri || req.auth?.legacy) {
    return next();
  }
  if (!req.auth?.panelJwt || req.auth?.apiKeyDoc) {
    return next();
  }
  return next();
}

function validarAlcanceUrlFirmaPanel(req, res, next) {
  if (!config.mongodbUri || req.auth?.legacy) {
    return next();
  }
  if (!req.auth?.panelJwt || req.auth?.apiKeyDoc) {
    return next();
  }
  return next();
}

module.exports = {
  validarAlcanceMultimediaPanel,
  validarAlcanceBrowsePanel,
  validarAlcanceUrlFirmaPanel,
};
