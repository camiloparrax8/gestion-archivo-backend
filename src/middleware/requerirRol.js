const AppError = require('../utils/AppError');

function requerirRol(...roles) {
  const permitidos = roles.filter(Boolean);
  return (req, res, next) => {
    const rol = req.user?.rol;
    if (!rol) {
      return next(new AppError('Usuario no autenticado', 401));
    }
    if (!permitidos.includes(rol)) {
      return next(new AppError('No autorizado para esta acción', 403));
    }
    return next();
  };
}

module.exports = requerirRol;
