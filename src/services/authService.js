const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const Cliente = require('../models/Cliente');
const AppError = require('../utils/AppError');

function sanitizeCliente(cliente) {
  return {
    id: cliente.publicId,
    legacyId: cliente._id,
    email: cliente.email,
    nombre: cliente.nombre,
    telefono: cliente.telefono || undefined,
    tipoDocumento: cliente.tipoDocumento || undefined,
    numeroDocumento: cliente.numeroDocumento || undefined,
    rol: cliente.rol || 'cliente',
    activo: Boolean(cliente.activo),
  };
}

function firmarToken(cliente) {
  if (!config.jwtAuthSecret) {
    throw new AppError('JWT_AUTH_SECRET no configurado', 503);
  }
  return jwt.sign(
    {
      sub: String(cliente._id),
      email: cliente.email,
      rol: cliente.rol || 'cliente',
      tipo: 'auth',
    },
    config.jwtAuthSecret,
    { expiresIn: config.jwtAuthExpiresIn },
  );
}

async function register({ email, nombre, password, rol }) {
  const safeRol = rol === 'admin' ? 'admin' : 'cliente';
  const rawPassword = String(password || '');
  if (rawPassword.length < 8) {
    throw new AppError('La contraseña debe tener al menos 8 caracteres', 400);
  }
  const exists = await Cliente.findOne({ email: String(email || '').trim().toLowerCase() });
  if (exists) {
    throw new AppError('Ya existe un usuario con ese email', 409);
  }
  const passwordHash = await bcrypt.hash(rawPassword, 12);
  const doc = await Cliente.create({
    email: String(email || '').trim().toLowerCase(),
    nombre: String(nombre || '').trim(),
    passwordHash,
    rol: safeRol,
    activo: true,
  });
  return sanitizeCliente(doc);
}

async function login({ email, password }) {
  const doc = await Cliente.findOne({ email: String(email || '').trim().toLowerCase() }).select(
    '+passwordHash',
  );
  if (!doc || !doc.passwordHash) {
    throw new AppError('Credenciales inválidas', 401);
  }
  if (!doc.activo) {
    throw new AppError('Usuario inactivo', 403);
  }
  const ok = await bcrypt.compare(String(password || ''), doc.passwordHash);
  if (!ok) {
    throw new AppError('Credenciales inválidas', 401);
  }
  doc.ultimoLoginAt = new Date();
  await doc.save();
  const token = firmarToken(doc);
  return {
    token,
    tokenType: 'Bearer',
    expiresIn: config.jwtAuthExpiresIn,
    user: sanitizeCliente(doc),
  };
}

async function getMe(clienteId) {
  const doc = await Cliente.findById(clienteId);
  if (!doc) {
    throw new AppError('Usuario no encontrado', 404);
  }
  return sanitizeCliente(doc);
}

module.exports = { register, login, getMe };
