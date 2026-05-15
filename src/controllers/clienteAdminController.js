const clienteService = require('../services/clientes/clienteService');
const apiKeyService = require('../services/clientes/apiKeyService');
const auditoriaService = require('../services/auditoria/auditoriaService');
const AppError = require('../utils/AppError');

/** `estado` o `activo` en el body: booleano activo/inactivo (prioridad: activo). */
function resolverActivoDesdeBody(body) {
  if (!body) return undefined;
  if (Object.prototype.hasOwnProperty.call(body, 'activo')) {
    const v = body.activo;
    if (v === null || v === '') return undefined;
    return Boolean(v);
  }
  if (Object.prototype.hasOwnProperty.call(body, 'estado')) {
    const v = body.estado;
    if (v === null || v === '') return undefined;
    return Boolean(v);
  }
  return undefined;
}

async function crearCliente(req, res) {
  const body = req.body || {};
  const email = String(body.email || '').trim().toLowerCase();
  const nombre = String(body.nombre || '').trim();
  const telefono = String(body.telefono ?? body.phone ?? '').trim();
  const tipoDocumento = String(body.tipoDocumento ?? body.documentType ?? '').trim();
  const numeroDocumento = String(body.numeroDocumento ?? '').trim();
  const activo = resolverActivoDesdeBody(body);

  if (!email || !nombre) {
    throw new AppError('email y nombre son obligatorios', 400);
  }
  if (!telefono) {
    throw new AppError('telefono es obligatorio', 400);
  }
  if (!tipoDocumento) {
    throw new AppError('tipoDocumento es obligatorio', 400);
  }
  if (!numeroDocumento) {
    throw new AppError('numeroDocumento es obligatorio', 400);
  }
  if (activo === undefined) {
    throw new AppError('activo o estado es obligatorio', 400);
  }

  const c = await clienteService.crearCliente({
    email,
    nombre,
    telefono,
    tipoDocumento,
    numeroDocumento,
    activo,
  });
  const data = clienteService.serializarClienteAdmin(c.toObject());
  await auditoriaService.registrar({
    clienteId: c._id,
    accion: 'admin.cliente_crear',
    metodo: req.method,
    ruta: req.originalUrl,
    statusCode: 201,
    origen: 'auth_admin',
    detalle: { publicId: c.publicId, nombre: c.nombre },
  });
  res.status(201).json({ data });
}

async function actualizarCliente(req, res) {
  const raw = await clienteService.actualizarCliente(req.params.clienteId, req.body || {});
  if (!raw) {
    throw new AppError('Cliente no encontrado', 404);
  }
  const doc = clienteService.serializarClienteAdmin(raw.toObject ? raw.toObject() : raw);
  await auditoriaService.registrar({
    clienteId: doc._id,
    accion: 'admin.cliente_actualizar',
    metodo: req.method,
    ruta: req.originalUrl,
    statusCode: 200,
    origen: 'auth_admin',
    detalle: { publicId: doc.publicId },
  });
  res.json({ data: doc });
}

async function listarClientes(req, res) {
  const list = await clienteService.listarClientes(req.query || {});
  await auditoriaService.registrar({
    accion: 'admin.cliente_listar',
    metodo: req.method,
    ruta: req.originalUrl,
    statusCode: 200,
    origen: 'auth_admin',
    detalle: { cantidad: list.length },
  });
  res.json({ data: list });
}

async function obtenerCliente(req, res) {
  const doc = await clienteService.obtenerClienteSerializado(req.params.clienteId);
  if (!doc) {
    throw new AppError('Cliente no encontrado', 404);
  }
  await auditoriaService.registrar({
    clienteId: doc._id,
    accion: 'admin.cliente_obtener',
    metodo: req.method,
    ruta: req.originalUrl,
    statusCode: 200,
    origen: 'auth_admin',
    detalle: { publicId: doc.publicId },
  });
  res.json({ data: doc });
}

async function crearLlave(req, res) {
  const cliente = await clienteService.obtenerPorId(req.params.clienteId);
  if (!cliente) {
    throw new AppError('Cliente no encontrado', 404);
  }
  const { nombre, prefijos, permisos, activo } = req.body || {};
  if (!nombre) {
    throw new AppError('nombre es obligatorio', 400);
  }
  const { plain, doc } = await apiKeyService.crearLlave(cliente._id, {
    nombre,
    prefijos,
    permisos,
    activo,
  });
  await auditoriaService.registrar({
    clienteId: cliente._id,
    apiKeyId: doc._id,
    accion: 'admin.api_key_crear',
    metodo: req.method,
    ruta: req.originalUrl,
    statusCode: 201,
    origen: 'auth_admin',
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

async function listarLlaves(req, res) {
  const cliente = await clienteService.obtenerPorId(req.params.clienteId);
  if (!cliente) {
    throw new AppError('Cliente no encontrado', 404);
  }
  const list = await apiKeyService.listarPorCliente(cliente._id);
  await auditoriaService.registrar({
    clienteId: cliente._id,
    accion: 'admin.api_key_listar',
    metodo: req.method,
    ruta: req.originalUrl,
    statusCode: 200,
    origen: 'auth_admin',
    detalle: { cantidad: list.length, clientePublicId: cliente.publicId },
  });
  res.json({ data: list });
}

async function actualizarEstadoLlave(req, res) {
  const cliente = await clienteService.obtenerPorId(req.params.clienteId);
  if (!cliente) {
    throw new AppError('Cliente no encontrado', 404);
  }
  const { activo } = req.body || {};
  if (typeof activo !== 'boolean') {
    throw new AppError('activo debe ser booleano', 400);
  }
  const key = await apiKeyService.actualizarEstado(cliente._id, req.params.llaveId, activo);
  if (!key) {
    throw new AppError('API key no encontrada', 404);
  }
  await auditoriaService.registrar({
    clienteId: cliente._id,
    apiKeyId: key._id,
    accion: 'admin.api_key_estado',
    metodo: req.method,
    ruta: req.originalUrl,
    statusCode: 200,
    origen: 'auth_admin',
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

async function rotarLlave(req, res) {
  const cliente = await clienteService.obtenerPorId(req.params.clienteId);
  if (!cliente) {
    throw new AppError('Cliente no encontrado', 404);
  }
  const { nombre, desactivarAnterior = true } = req.body || {};
  if (typeof desactivarAnterior !== 'boolean') {
    throw new AppError('desactivarAnterior debe ser booleano', 400);
  }
  const resultado = await apiKeyService.rotarLlave(cliente._id, req.params.llaveId, {
    nombre,
    desactivarAnterior,
  });
  if (!resultado) {
    throw new AppError('API key no encontrada', 404);
  }
  await auditoriaService.registrar({
    clienteId: cliente._id,
    apiKeyId: resultado.nueva._id,
    accion: 'admin.api_key_rotar',
    metodo: req.method,
    ruta: req.originalUrl,
    statusCode: 201,
    origen: 'auth_admin',
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

async function eliminarLlave(req, res) {
  const cliente = await clienteService.obtenerPorId(req.params.clienteId);
  if (!cliente) {
    throw new AppError('Cliente no encontrado', 404);
  }
  const doc = await apiKeyService.eliminarLlave(cliente._id, req.params.llaveId);
  if (!doc) {
    throw new AppError('API key no encontrada', 404);
  }
  await auditoriaService.registrar({
    clienteId: cliente._id,
    apiKeyId: doc._id,
    accion: 'admin.api_key_eliminar',
    metodo: req.method,
    ruta: req.originalUrl,
    statusCode: 200,
    origen: 'auth_admin',
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
  crearCliente,
  actualizarCliente,
  listarClientes,
  obtenerCliente,
  crearLlave,
  listarLlaves,
  eliminarLlave,
  actualizarEstadoLlave,
  rotarLlave,
};
