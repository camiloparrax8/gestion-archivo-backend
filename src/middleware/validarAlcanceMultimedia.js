const config = require('../config');
const AppError = require('../utils/AppError');

function alcanzaPrefijos(rutaLogica, prefijos) {
  const prefs = prefijos || [];
  if (!prefs.length) {
    return true;
  }
  return prefs.some((p) => rutaLogica === p || rutaLogica.startsWith(`${p}/`));
}

function validarAlcanceMultimedia(req, res, next) {
  if (!config.mongodbUri || req.auth?.legacy) {
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

function validarAlcanceRutaCliente(rutaRelativaCliente) {
  return (req, res, next) => {
    if (!config.mongodbUri || req.auth?.legacy) {
      return next();
    }
    const prefs = req.auth.apiKeyDoc.prefijos || [];
    if (!alcanzaPrefijos(rutaRelativaCliente, prefs)) {
      return next(new AppError('La ruta está fuera del alcance de esta API key', 403));
    }
    return next();
  };
}

module.exports = { validarAlcanceMultimedia, alcanzaPrefijos, validarAlcanceRutaCliente };
