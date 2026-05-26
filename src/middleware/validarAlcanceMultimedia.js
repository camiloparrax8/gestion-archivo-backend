const config = require('../config');
const AppError = require('../utils/AppError');

function normalizarSegmentoSlug(valor) {
  return String(valor || '').trim().toLowerCase();
}

/** Rutas lógicas 4 segmentos (params de URL multimedia). */
function rutasAlcanceDesdeParams(params) {
  const contexto = normalizarSegmentoSlug(params.contexto);
  const entidad = normalizarSegmentoSlug(params.entidad);
  const id = String(params.id || '').trim();
  const tipo = normalizarSegmentoSlug(params.tipo);
  return {
    completa: `${contexto}/${entidad}/${id}/${tipo}`,
    anchor: `${contexto}/${entidad}`,
    contexto,
  };
}

function alcanzaPrefijos(rutaLogica, prefijos) {
  const prefs = prefijos || [];
  if (!prefs.length) {
    return true;
  }
  const ruta = String(rutaLogica || '').replace(/^\/+|\/+$/g, '');
  return prefs.some((p) => {
    const pref = String(p || '').replace(/^\/+|\/+$/g, '').toLowerCase();
    if (!pref) {
      return true;
    }
    return ruta === pref || ruta.startsWith(`${pref}/`) || pref.startsWith(`${ruta}/`);
  });
}

/** Subida/borrado: la carpeta puede no existir aún; basta alcance por prefijo de llave. */
function alcanzaPrefijosEscritura(params, prefijos) {
  const { completa, anchor } = rutasAlcanceDesdeParams(params);
  return alcanzaPrefijos(completa, prefijos) || alcanzaPrefijos(anchor, prefijos);
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
  /** Panel JWT: la llave es filtro opcional; la subida crea carpetas bajo el tenant. */
  if (req.auth?.panelJwt) {
    return next();
  }
  const prefs = req.auth.apiKeyDoc.prefijos || [];
  const esEscritura = req.method === 'POST' || req.method === 'DELETE';
  const ok = esEscritura
    ? alcanzaPrefijosEscritura(req.params, prefs)
    : alcanzaPrefijos(rutasAlcanceDesdeParams(req.params).completa, prefs);
  if (!ok) {
    const hint =
      prefs.length > 0
        ? ` Prefijos permitidos: ${prefs.join(', ')}.`
        : '';
    return next(
      new AppError(`La ruta está fuera del alcance de esta API key.${hint}`, 403),
    );
  }
  return next();
}

function validarAlcanceBrowse(req, res, next) {
  if (!config.mongodbUri || req.auth?.legacy || !req.auth?.apiKeyDoc) {
    return next();
  }
  if (req.auth?.panelJwt) {
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
  alcanzaPrefijosEscritura,
  rutasAlcanceDesdeParams,
  itemVisibleEnPrefijos,
  validarAlcanceRutaCliente,
};
