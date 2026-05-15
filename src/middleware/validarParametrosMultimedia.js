const multimediaService = require('../services/multimediaService');

function validarParametrosMultimedia(req, res, next) {
  try {
    const { contexto, entidad, id, tipo } = req.params;
    multimediaService.validarContexto(contexto);
    multimediaService.validarEntidadTipo(entidad, tipo);
    multimediaService.validarIdentificadorEntidad(entidad, id);
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = validarParametrosMultimedia;
