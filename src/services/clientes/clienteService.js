const Cliente = require('../../models/Cliente');
const mongoose = require('mongoose');
const AppError = require('../../utils/AppError');

async function crearCliente({ email, nombre, telefono, tipoDocumento, numeroDocumento, activo }) {
  return Cliente.create({
    email,
    nombre,
    telefono,
    tipoDocumento,
    numeroDocumento,
    activo,
  });
}

async function obtenerPorEmail(email, incluirPassword = false) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  const query = Cliente.findOne({ email: normalized });
  if (incluirPassword) {
    query.select('+passwordHash');
  }
  return query;
}

async function obtenerPorId(id) {
  const valor = String(id || '').trim();
  if (!valor) {
    return null;
  }
  if (mongoose.Types.ObjectId.isValid(valor)) {
    const porObjectId = await Cliente.findById(valor);
    if (porObjectId) {
      return porObjectId;
    }
  }
  return Cliente.findOne({ publicId: valor });
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseQueryActivo(raw) {
  if (raw === undefined || raw === '') return undefined;
  const s = String(raw).toLowerCase();
  if (s === 'true' || s === '1') return true;
  if (s === 'false' || s === '0') return false;
  return undefined;
}


function serializarClienteAdmin(o) {
  if (!o) return null;
  const activo =
    Object.prototype.hasOwnProperty.call(o, 'activo') && o.activo !== null
      ? Boolean(o.activo)
      : null;
  return {
    _id: o._id,
    publicId: o.publicId,
    email: o.email,
    nombre: o.nombre,
    telefono: o.telefono ?? null,
    tipoDocumento: o.tipoDocumento ?? null,
    numeroDocumento: o.numeroDocumento ?? null,
    activo,
    rol: o.rol ?? 'cliente',
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

async function listarClientes(query = {}) {
  const filter = {};
  const q = String(query.q || '').trim();
  if (q) {
    const esc = escapeRegex(q);
    filter.$or = [
      { email: new RegExp(esc, 'i') },
      { nombre: new RegExp(esc, 'i') },
      { telefono: new RegExp(esc, 'i') },
      { tipoDocumento: new RegExp(esc, 'i') },
      { numeroDocumento: new RegExp(esc, 'i') },
    ];
  }
  const act = parseQueryActivo(query.activo);
  if (act !== undefined) {
    filter.activo = act;
  }

  const rows = await Cliente.find(filter)
    .select(
      '_id publicId email nombre telefono tipoDocumento numeroDocumento activo rol createdAt updatedAt',
    )
    .sort({ createdAt: -1 })
    .lean();

  return rows.map((row) => serializarClienteAdmin(row));
}

async function obtenerClienteSerializado(idParam) {
  const doc = await obtenerPorId(idParam);
  if (!doc) {
    return null;
  }
  return serializarClienteAdmin(doc.toObject());
}

function pickActivoDesdePatch(patch) {
  if (!patch) return undefined;
  if (Object.prototype.hasOwnProperty.call(patch, 'activo')) {
    const v = patch.activo;
    if (v === null || v === '') return undefined;
    return Boolean(v);
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'estado')) {
    const v = patch.estado;
    if (v === null || v === '') return undefined;
    return Boolean(v);
  }
  return undefined;
}

function aplicarStringOpcional($set, $unset, key, valor) {
  if (valor === undefined) return;
  if (valor === null || valor === '') {
    $unset[key] = '';
    return;
  }
  $set[key] = String(valor).trim();
}


async function actualizarCliente(idParam, patch) {
  const cliente = await obtenerPorId(idParam);
  if (!cliente) {
    return null;
  }

  const $set = {};
  const $unset = {};

  if (Object.prototype.hasOwnProperty.call(patch, 'email')) {
    const email = String(patch.email || '').trim().toLowerCase();
    if (!email) {
      throw new AppError('email no puede estar vacío', 400);
    }
    const otro = await Cliente.findOne({ email, _id: { $ne: cliente._id } });
    if (otro) {
      throw new AppError('Ya existe un cliente con ese email', 409);
    }
    $set.email = email;
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'nombre')) {
    const nombre = String(patch.nombre || '').trim();
    if (!nombre) {
      throw new AppError('nombre no puede estar vacío', 400);
    }
    $set.nombre = nombre;
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'telefono') || Object.prototype.hasOwnProperty.call(patch, 'phone')) {
    const v = Object.prototype.hasOwnProperty.call(patch, 'telefono') ? patch.telefono : patch.phone;
    aplicarStringOpcional($set, $unset, 'telefono', v);
  }

  if (
    Object.prototype.hasOwnProperty.call(patch, 'tipoDocumento') ||
    Object.prototype.hasOwnProperty.call(patch, 'documentType')
  ) {
    const v = Object.prototype.hasOwnProperty.call(patch, 'tipoDocumento')
      ? patch.tipoDocumento
      : patch.documentType;
    aplicarStringOpcional($set, $unset, 'tipoDocumento', v);
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'numeroDocumento')) {
    aplicarStringOpcional($set, $unset, 'numeroDocumento', patch.numeroDocumento);
  }

  const activo = pickActivoDesdePatch(patch);
  if (activo !== undefined) {
    $set.activo = activo;
  }

  const ops = {};
  if (Object.keys($set).length) ops.$set = $set;
  if (Object.keys($unset).length) ops.$unset = $unset;

  if (!Object.keys(ops).length) {
    return Cliente.findById(cliente._id);
  }

  return Cliente.findByIdAndUpdate(cliente._id, ops, { new: true, runValidators: true });
}

module.exports = {
  crearCliente,
  obtenerPorId,
  obtenerPorEmail,
  listarClientes,
  obtenerClienteSerializado,
  serializarClienteAdmin,
  actualizarCliente,
};
