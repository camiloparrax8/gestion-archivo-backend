const jwt = require('jsonwebtoken');
const config = require('../config');
const AppError = require('../utils/AppError');

function firmarToken({ clienteId, rutaRelativaCliente }, expiresSec) {
  if (!config.jwtMediaSecret) {
    throw new AppError('JWT_MEDIA_SECRET no configurado', 500);
  }
  const seg = Math.min(
    expiresSec || config.signedUrlExpiresSeconds,
    config.signedUrlExpiresSeconds,
  );
  return jwt.sign(
    { cid: String(clienteId), rel: rutaRelativaCliente },
    config.jwtMediaSecret,
    { expiresIn: seg, subject: 'media' },
  );
}

function verificarToken(token) {
  if (!config.jwtMediaSecret) {
    throw new AppError('JWT_MEDIA_SECRET no configurado', 500);
  }
  return jwt.verify(token, config.jwtMediaSecret, { subject: 'media' });
}

module.exports = { firmarToken, verificarToken };
