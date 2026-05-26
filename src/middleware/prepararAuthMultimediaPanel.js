const config = require('../config');
const AppError = require('../utils/AppError');
const clienteService = require('../services/clientes/clienteService');
const apiKeyService = require('../services/clientes/apiKeyService');

function extraerLlaveId(req) {
  const header = req.get('x-llave-id') || req.get('X-Llave-Id');
  if (header) {
    return String(header).trim();
  }
  const query = req.query?.llaveId;
  if (query != null && String(query).trim()) {
    return String(query).trim();
  }
  return null;
}

function prepararAuthMultimediaCliente(req, res, next) {
  if (!config.mongodbUri) {
    return next(new AppError('Multimedia con sesión requiere MONGODB_URI', 503));
  }
  req.auth = {
    legacy: false,
    cliente: req.user,
    panelJwt: true,
  };
  return next();
}

async function prepararAuthMultimediaAdmin(req, res, next) {
  if (!config.mongodbUri) {
    return next(new AppError('Multimedia con sesión requiere MONGODB_URI', 503));
  }
  try {
    const cliente = await clienteService.obtenerPorId(req.params.clienteId);
    if (!cliente || !cliente.activo) {
      return next(new AppError('Cliente no encontrado o inactivo', 404));
    }
    req.auth = {
      legacy: false,
      cliente,
      panelJwt: true,
    };
    return next();
  } catch (err) {
    return next(err);
  }
}

async function adjuntarLlavePanelOpcional(req, res, next) {
  const llaveId = extraerLlaveId(req);
  if (!llaveId) {
    return next();
  }
  if (!req.auth?.cliente?._id) {
    return next(new AppError('Cliente no identificado', 401));
  }
  try {
    const doc = await apiKeyService.obtenerPorPublicId(req.auth.cliente._id, llaveId);
    if (!doc) {
      return next(new AppError('Llave API no encontrada o inactiva', 404));
    }
    req.auth.apiKeyDoc = doc;
    await apiKeyService.marcarUso(doc._id);
    return next();
  } catch (err) {
    return next(err);
  }
}

function requerirLlavePanel(req, res, next) {
  if (!req.auth?.apiKeyDoc) {
    return next(
      new AppError('Selecciona una llave API (header X-Llave-Id o query llaveId)', 400),
    );
  }
  return next();
}

module.exports = {
  prepararAuthMultimediaCliente,
  prepararAuthMultimediaAdmin,
  adjuntarLlavePanelOpcional,
  requerirLlavePanel,
  extraerLlaveId,
};
