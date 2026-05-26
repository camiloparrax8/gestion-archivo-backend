const config = require('../config');
const AppError = require('../utils/AppError');

function alcanzaPrefijos(rutaLogica, prefijos) {
  const prefs = prefijos || [];
  if (!prefs.length) {
    return true;
  }
  return prefs.some((p) => rutaLogica === p || rutaLogica.startsWith(`${p}/`));
}

function itemVisibleEnPrefijos(itemPath, prefijos) {
  const prefs = prefijos || [];
  if (!prefs.length) {
    return true;
  }
  const path = String(itemPath || '').replace(/^\/+|\/+$/g, '');
  return prefs.some((p) => {
    if (!path) {
      return true;
    }
    return path === p || path.startsWith(`${p}/`) || p.startsWith(`${path}/`);
  });
}

function validarAlcanceMultimedia(req, res, next) {
  if (!config.mongodbUri || req.auth?.legacy || !req.auth?.apiKeyDoc) {
    return next();
  }
  const { contexto, entidad, id, tipo } = req.params;
  const rutaLogica = `${contexto}/${entidad}/${id}/${tipo}`;
  const prefs = req.auth.apiKeyDoc.prefijos || [];
  if (!alcanzaPrefijos(rutaLogica, prefs)) {
    return next(new AppError('La ruta está fuera del alcance de esta API key', 403));
  }
  return next();
}

function validarAlcanceBrowse(req, res, next) {
  if (!config.mongodbUri || req.auth?.legacy || !req.auth?.apiKeyDoc) {
    return next();
  }
  const prefix = String(req.query.prefix || '').replace(/^\/+|\/+$/g, '');
  const prefs = req.auth.apiKeyDoc.prefijos || [];
  if (!itemVisibleEnPrefijos(prefix, prefs)) {
    return next(new AppError('Prefijo fuera del alcance de la llave', 403));
  }
  return next();
}

function validarAlcanceRutaCliente(rutaRelativaCliente) {
  return (req, res, next) => {
    if (!config.mongodbUri || req.auth?.legacy || !req.auth?.apiKeyDoc) {
      return next();
    }
    const prefs = req.auth.apiKeyDoc.prefijos || [];
    if (!alcanzaPrefijos(rutaRelativaCliente, prefs)) {
      return next(new AppError('La ruta está fuera del alcance de esta API key', 403));
    }
    return next();
  };
}

module.exports = {
  validarAlcanceMultimedia,
  validarAlcanceBrowse,
  alcanzaPrefijos,
  itemVisibleEnPrefijos,
  validarAlcanceRutaCliente,
};
