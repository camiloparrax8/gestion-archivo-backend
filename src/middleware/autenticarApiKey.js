const config = require('../config');
const AppError = require('../utils/AppError');
const apiKeyService = require('../services/clientes/apiKeyService');

function extraerClave(req) {
  const header = req.get('x-api-key') || req.get('X-API-Key');
  if (header) {
    return String(header).trim();
  }
  const auth = req.get('authorization') || req.get('Authorization');
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  return null;
}

function legacyAutenticar(req, res, next) {
  const key = extraerClave(req);
  if (!config.apiKey) {
    req.auth = { legacy: true, cliente: { _id: null } };
    return next();
  }
  if (!key || key !== config.apiKey) {
    return next(new AppError('API key no válida', 401));
  }
  req.auth = { legacy: true, cliente: { _id: null } };
  return next();
}

async function autenticarApiKey(req, res, next) {
  if (!config.mongodbUri) {
    return legacyAutenticar(req, res, next);
  }

  const plain = extraerClave(req);
  if (!plain) {
    return next(new AppError('API key requerida (X-API-Key o Bearer)', 401));
  }

  try {
    const doc = await apiKeyService.buscarPorClavePlana(plain);
    if (!doc || !doc.cliente || !doc.cliente.activo) {
      return next(new AppError('API key no válida o cliente inactivo', 401));
    }
    req.auth = {
      legacy: false,
      cliente: doc.cliente,
      apiKeyDoc: doc,
    };
    await apiKeyService.marcarUso(doc._id);
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = autenticarApiKey;
