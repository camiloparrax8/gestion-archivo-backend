const jwt = require('jsonwebtoken');
const config = require('../config');
const Cliente = require('../models/Cliente');
const AppError = require('../utils/AppError');

async function autenticarJwt(req, res, next) {
  const auth = req.get('authorization') || req.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return next(new AppError('Token requerido (Authorization: Bearer ...)', 401));
  }
  if (!config.jwtAuthSecret) {
    return next(new AppError('JWT_AUTH_SECRET no configurado', 503));
  }
  const token = auth.slice(7).trim();
  if (!token) {
    return next(new AppError('Token requerido (Authorization: Bearer ...)', 401));
  }
  try {
    const payload = jwt.verify(token, config.jwtAuthSecret);
    if (payload.tipo !== 'auth' || !payload.sub) {
      return next(new AppError('Token inválido', 401));
    }
    const user = await Cliente.findById(payload.sub);
    if (!user || !user.activo) {
      return next(new AppError('Usuario no autorizado', 401));
    }
    req.user = user;
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
      return next(new AppError('Token inválido o expirado', 401));
    }
    return next(err);
  }
}

module.exports = autenticarJwt;
