const apiKeyService = require('../services/clientes/apiKeyService');
const auditoriaService = require('../services/auditoria/auditoriaService');
const AppError = require('../utils/AppError');

async function listarMisLlaves(req, res) {
  const list = await apiKeyService.listarPorCliente(req.user._id);
  await auditoriaService.registrar({
    clienteId: req.user._id,
    accion: 'cliente.api_key_listar',
    metodo: req.method,
    ruta: req.originalUrl,
    statusCode: 200,
    origen: 'auth_cliente',
    detalle: { cantidad: list.length, clientePublicId: req.user.publicId },
  });
  res.json({ data: list });
}

async function crearMiLlave(req, res) {
  const { nombre, prefijos, permisos, activo } = req.body || {};
  if (!nombre) {
    throw new AppError('nombre es obligatorio', 400);
  }
  const { plain, doc } = await apiKeyService.crearLlave(req.user._id, {
    nombre,
    prefijos,
    permisos,
    activo,
  });
  await auditoriaService.registrar({
    clienteId: req.user._id,
    apiKeyId: doc._id,
    accion: 'cliente.api_key_crear',
    metodo: req.method,
    ruta: req.originalUrl,
    statusCode: 201,
    origen: 'auth_cliente',
    detalle: {
      llavePublicId: doc.publicId,
      llaveNombre: doc.nombre,
      prefijos: doc.prefijos,
      permisos: doc.permisos,
      activo: doc.activo,
    },
  });
  res.status(201).json({
    data: {
      id: doc.publicId,
      legacyId: doc._id,
      apiKey: plain,
      nombre: doc.nombre,
      prefijos: doc.prefijos,
      permisos: doc.permisos,
      activo: doc.activo,
      mensaje: 'Guarde la API key',
    },
  });
}

async function actualizarEstadoMiLlave(req, res) {
  const { activo } = req.body || {};
  if (typeof activo !== 'boolean') {
    throw new AppError('activo debe ser booleano', 400);
  }
  const key = await apiKeyService.actualizarEstado(req.user._id, req.params.llaveId, activo);
  if (!key) {
    throw new AppError('API key no encontrada', 404);
  }
  await auditoriaService.registrar({
    clienteId: req.user._id,
    apiKeyId: key._id,
    accion: 'cliente.api_key_estado',
    metodo: req.method,
    ruta: req.originalUrl,
    statusCode: 200,
    origen: 'auth_cliente',
    detalle: { llavePublicId: key.publicId, activo: key.activo },
  });
  res.json({
    data: {
      id: key.publicId,
      nombre: key.nombre,
      activo: key.activo,
    },
  });
}

async function rotarMiLlave(req, res) {
  const { nombre, desactivarAnterior = true } = req.body || {};
  if (typeof desactivarAnterior !== 'boolean') {
    throw new AppError('desactivarAnterior debe ser booleano', 400);
  }
  const resultado = await apiKeyService.rotarLlave(req.user._id, req.params.llaveId, {
    nombre,
    desactivarAnterior,
  });
  if (!resultado) {
    throw new AppError('API key no encontrada', 404);
  }
  await auditoriaService.registrar({
    clienteId: req.user._id,
    apiKeyId: resultado.nueva._id,
    accion: 'cliente.api_key_rotar',
    metodo: req.method,
    ruta: req.originalUrl,
    statusCode: 201,
    origen: 'auth_cliente',
    detalle: {
      llaveAnteriorPublicId: resultado.anterior.publicId,
      llaveNuevaPublicId: resultado.nueva.publicId,
      desactivarAnterior,
    },
  });
  res.status(201).json({
    data: {
      id: resultado.nueva.publicId,
      legacyId: resultado.nueva._id,
      apiKey: resultado.plain,
      nombre: resultado.nueva.nombre,
      prefijos: resultado.nueva.prefijos,
      permisos: resultado.nueva.permisos,
      activo: resultado.nueva.activo,
      anterior: {
        id: resultado.anterior.publicId,
        activo: resultado.anterior.activo,
      },
      mensaje: 'Guarde la nueva API key',
    },
  });
}

async function eliminarMiLlave(req, res) {
  const doc = await apiKeyService.eliminarLlave(req.user._id, req.params.llaveId);
  if (!doc) {
    throw new AppError('API key no encontrada', 404);
  }
  await auditoriaService.registrar({
    clienteId: req.user._id,
    apiKeyId: doc._id,
    accion: 'cliente.api_key_eliminar',
    metodo: req.method,
    ruta: req.originalUrl,
    statusCode: 200,
    origen: 'auth_cliente',
    detalle: { llavePublicId: doc.publicId, llaveNombre: doc.nombre },
  });
  res.json({
    data: {
      id: doc.publicId,
      mensaje: 'API key eliminada',
    },
  });
}

module.exports = {
  listarMisLlaves,
  crearMiLlave,
  actualizarEstadoMiLlave,
  rotarMiLlave,
  eliminarMiLlave,
};
