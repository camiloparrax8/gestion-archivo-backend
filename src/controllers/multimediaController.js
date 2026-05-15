const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const multimediaService = require('../services/multimediaService');
const archivoMetadataService = require('../services/archivoMetadataService');
const auditoriaService = require('../services/auditoria/auditoriaService');
const AppError = require('../utils/AppError');
const config = require('../config');
const { nombreCampoArchivo } = require('../middleware/multerMultimedia');
const { SUBCARPETAS_TIPO_ARCHIVO } = require('../config/multimedia');
const { alcanzaPrefijos } = require('../middleware/validarAlcanceMultimedia');
const s3 = require('../services/multimediaS3Storage');
const multimediaAccesoLocal = require('../services/multimediaAccesoLocal');

function clienteIdParaRutas(req) {
  if (!config.mongodbUri || req.auth?.legacy || !req.auth?.cliente?._id) {
    return null;
  }
  return String(req.auth.cliente._id);
}

async function listar(req, res) {
  const { contexto, entidad, id, tipo } = req.params;
  const cid = clienteIdParaRutas(req);
  const items = await multimediaService.listarArchivos(cid, contexto, entidad, id, tipo);
  const data = await multimediaService.enriquecerListadoConUrls(req, items, cid);
  await auditoriaService.registrar({
    clienteId: req.auth?.cliente?._id,
    apiKeyId: req.auth?.apiKeyDoc?._id,
    origen: 'api_key',
    accion: 'multimedia.listar',
    metodo: req.method,
    ruta: req.originalUrl,
    statusCode: 200,
    detalle: { contexto, entidad, id, tipo },
  });
  res.json({ data });
}

async function subir(req, res) {
  if (!req.file) {
    throw new AppError(
      `Debe enviar un archivo en el campo multipart "${nombreCampoArchivo}"`,
      400,
    );
  }
  const data = await multimediaService.procesarSubida(req);
  await auditoriaService.registrar({
    clienteId: req.auth?.cliente?._id,
    apiKeyId: req.auth?.apiKeyDoc?._id,
    origen: 'api_key',
    accion: 'multimedia.subir',
    metodo: req.method,
    ruta: req.originalUrl,
    statusCode: 201,
    detalle: { rutaInterna: data.rutaInternaCliente },
  });
  res.status(201).json({ data });
}

async function eliminar(req, res) {
  const { contexto, entidad, id, tipo, archivo } = req.params;
  const cid = clienteIdParaRutas(req);
  const resultado = await multimediaService.eliminarArchivo(
    cid,
    contexto,
    entidad,
    id,
    tipo,
    archivo,
  );
  if (config.mongodbUri && !req.auth?.legacy) {
    await archivoMetadataService.eliminarPorRuta(req.auth.cliente._id, resultado.rutaInternaCliente);
  }
  await auditoriaService.registrar({
    clienteId: req.auth?.cliente?._id,
    apiKeyId: req.auth?.apiKeyDoc?._id,
    origen: 'api_key',
    accion: 'multimedia.eliminar',
    metodo: req.method,
    ruta: req.originalUrl,
    statusCode: 200,
    detalle: { contexto, entidad, id, tipo, archivo },
  });
  res.json({ data: resultado });
}

async function solicitarUrlFirma(req, res) {
  const { rutaInternaCliente, segundos } = req.body || {};
  const ruta = String(rutaInternaCliente || '').trim();
  if (!ruta || ruta.includes('..')) {
    throw new AppError('rutaInternaCliente inválida', 400);
  }
  if (!config.mongodbUri || req.auth?.legacy) {
    throw new AppError('Disponible solo con MONGODB_URI y API key de cliente', 400);
  }

  const segmentos = ruta.split('/').filter(Boolean);
  if (segmentos.length !== 5 && segmentos.length !== 6) {
    throw new AppError(
      'La ruta debe ser contexto/entidad/identificador/tipo/nombreArchivo (5 segmentos, legado) o contexto/entidad/identificador/tipo/subcarpeta/nombreArchivo (6 segmentos; subcarpeta: pdf, jpeg, png, gif, webp)',
      400,
    );
  }
  let contexto;
  let entidad;
  let id;
  let tipo;
  let nombreArchivo;
  if (segmentos.length === 5) {
    [contexto, entidad, id, tipo, nombreArchivo] = segmentos;
  } else {
    const subcarpeta = segmentos[4];
    if (!SUBCARPETAS_TIPO_ARCHIVO.has(subcarpeta)) {
      throw new AppError(
        'En rutas de 6 segmentos, el quinto debe ser la subcarpeta por tipo de archivo (pdf, jpeg, png, gif, webp)',
        400,
      );
    }
    nombreArchivo = segmentos[5];
    [contexto, entidad, id, tipo] = segmentos;
  }
  multimediaService.validarContexto(contexto);
  multimediaService.validarEntidadTipo(entidad, tipo);
  multimediaService.validarIdentificadorEntidad(entidad, id);
  multimediaService.validarNombreArchivoSeguro(nombreArchivo);

  const carpeta = `${contexto}/${entidad}/${id}/${tipo}`;
  const prefs = req.auth.apiKeyDoc.prefijos || [];
  if (!alcanzaPrefijos(carpeta, prefs)) {
    throw new AppError('La ruta está fuera del alcance de esta API key', 403);
  }

  const clienteId = String(req.auth.cliente._id);
  const existe = await multimediaService.existeArchivoEnAlmacenamiento(clienteId, ruta);
  if (!existe) {
    throw new AppError('Archivo no encontrado', 404);
  }

  let url;
  const expira = Math.min(
    Number(segundos) || config.signedUrlExpiresSeconds,
    config.signedUrlExpiresSeconds,
  );

  if (multimediaService.esAlmacenamientoS3()) {
    const rel = multimediaService.resolverRutaAlmacenamientoDesdeInterna(clienteId, ruta);
    url = await s3.urlFirmaLectura(s3.claveCompleta(rel), expira);
  } else {
    const token = multimediaAccesoLocal.firmarToken(
      { clienteId, rutaRelativaCliente: ruta },
      expira,
    );
    const base = multimediaService.baseUrlPeticion(req);
    url = `${base}/api/v1/multimedia/acceso/${token}`;
  }

  await auditoriaService.registrar({
    clienteId: req.auth.cliente._id,
    apiKeyId: req.auth.apiKeyDoc?._id,
    origen: 'api_key',
    accion: 'multimedia.url_firma',
    metodo: req.method,
    ruta: req.originalUrl,
    statusCode: 200,
    detalle: { rutaInternaCliente: ruta },
  });

  res.json({
    data: {
      url,
      expiraEnSegundos: expira,
    },
  });
}

async function accesoLocalPorToken(req, res, next) {
  try {
    const payload = multimediaAccesoLocal.verificarToken(req.params.token);
    if (!payload.rel || String(payload.rel).includes('..')) {
      throw new AppError('Enlace inválido', 401);
    }
    const rel = multimediaService.conPrefijoCliente(payload.cid, payload.rel);
    const abs = path.join(path.resolve(config.storageDir), ...rel.split('/'));
    multimediaService.asegurarDentroDeUploads(abs);
    if (!fs.existsSync(abs)) {
      throw new AppError('Archivo no encontrado', 404);
    }
    const clienteOid = mongoose.Types.ObjectId.isValid(payload.cid)
      ? new mongoose.Types.ObjectId(payload.cid)
      : undefined;
    res.sendFile(path.resolve(abs), (err) => {
      if (err) return next(err);
      void auditoriaService.registrar({
        clienteId: clienteOid,
        accion: 'multimedia.acceso_archivo',
        metodo: req.method,
        ruta: req.originalUrl,
        statusCode: 200,
        origen: 'acceso_token',
        detalle: { rutaInternaCliente: payload.rel },
      });
    });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(new AppError('Enlace inválido o expirado', 401));
    }
    next(err);
  }
}

module.exports = {
  listar,
  subir,
  eliminar,
  solicitarUrlFirma,
  accesoLocalPorToken,
};
