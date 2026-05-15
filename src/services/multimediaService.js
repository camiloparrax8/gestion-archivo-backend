const fs = require('fs/promises');
const path = require('path');
const config = require('../config');
const {
  ENTIDADES_PERMITIDAS,
  TIPOS_CARPETA_PERMITIDOS,
  SUBCARPETAS_TIPO_ARCHIVO,
  subcarpetaPorMime,
} = require('../config/multimedia');
const AppError = require('../utils/AppError');
const s3 = require('./multimediaS3Storage');
const archivoMetadataService = require('./archivoMetadataService');
const { generarNombreArchivoMultimedia } = require('../utils/generarNombreArchivoMultimedia');

const storageRaiz = () => path.resolve(config.storageDir);

function esAlmacenamientoS3() {
  return config.storageDriver === 's3';
}

function usaMongoAuth() {
  return Boolean(config.mongodbUri);
}

const CONTEXTO_SLUG_RE = /^[a-z][a-z0-9_-]{0,62}$/;

function validarContexto(contexto) {
  const c = String(contexto || '').trim().toLowerCase();
  if (!CONTEXTO_SLUG_RE.test(c)) {
    throw new AppError(
      'Contexto no válido: use minúsculas, empiece con letra; solo letras, números, guión y guión bajo (máx. 63 caracteres).',
      400,
    );
  }
  // Con MongoDB el aislamiento por contexto se controla de forma dinamica
  // con prefijos por API key. La lista fija global queda para modo legado.
  if (usaMongoAuth()) {
    return;
  }
  const permitidos = config.multimediaContextosPermitidos || [];
  if (permitidos.length > 0 && !permitidos.includes(c)) {
    throw new AppError(
      `Contexto no permitido en este servidor. Valores: ${permitidos.join(', ')}`,
      400,
    );
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validarIdentificadorEntidad(entidad, id) {
  const valor = String(id || '').trim();
  if (!valor) {
    throw new AppError('El identificador es obligatorio', 400);
  }
  if (entidad === 'usuarios' || entidad === 'sellers' || entidad === 'productos') {
    if (!UUID_RE.test(valor)) {
      const msg =
        entidad === 'usuarios'
          ? 'Para usuarios, el identificador debe ser un UUID (publicId)'
          : entidad === 'sellers'
            ? 'Para sellers, el identificador debe ser un UUID'
            : 'Para productos, el identificador debe ser un UUID';
      throw new AppError(msg, 400);
    }
    return;
  }
  if (!/^\d+$/.test(valor)) {
    throw new AppError('El identificador debe ser numérico', 400);
  }
}

function validarEntidadTipo(entidad, tipo) {
  if (!ENTIDADES_PERMITIDAS.has(entidad)) {
    throw new AppError(
      `Entidad no válida. Use: ${[...ENTIDADES_PERMITIDAS].join(', ')}`,
      400,
    );
  }
  if (!TIPOS_CARPETA_PERMITIDOS.has(tipo)) {
    throw new AppError(
      `Tipo de carpeta no válido. Use: ${[...TIPOS_CARPETA_PERMITIDOS].join(', ')}`,
      400,
    );
  }
}

function conPrefijoCliente(clienteId, rutaRelativaInterna) {
  const limpia = rutaRelativaInterna.replace(/^\/+/, '');
  if (!clienteId) {
    return limpia;
  }
  return `clients/${clienteId}/${limpia}`;
}

/**
 * Ruta absoluta local: storage/[clients/{id}/]{contexto}/{entidad}/{id}/{tipo}[/subcarpeta]
 * `subcarpeta`: pdf | jpeg | png | gif | webp (según MIME). Si se omite, directorio `tipo` (listados / legado).
 */
function obtenerDirectorioAbsoluto(clienteId, contexto, entidad, id, tipo, subcarpeta) {
  validarContexto(contexto);
  validarEntidadTipo(entidad, tipo);
  validarIdentificadorEntidad(entidad, id);
  const base = storageRaiz();
  const tipoDir = !clienteId
    ? path.join(base, contexto, entidad, String(id), tipo)
    : path.join(base, 'clients', String(clienteId), contexto, entidad, String(id), tipo);
  if (subcarpeta) {
    if (!SUBCARPETAS_TIPO_ARCHIVO.has(subcarpeta)) {
      throw new AppError(`Subcarpeta no válida: ${subcarpeta}`, 400);
    }
    return path.join(tipoDir, subcarpeta);
  }
  return tipoDir;
}

function asegurarDentroDeUploads(rutaAbsoluta) {
  const base = storageRaiz();
  const resolved = path.resolve(rutaAbsoluta);
  const rel = path.relative(base, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new AppError('Ruta de archivo no permitida', 400);
  }
}

function rutaRelativaDesdeUploads(rutaAbsolutaArchivo) {
  return path.relative(storageRaiz(), rutaAbsolutaArchivo).split(path.sep).join('/');
}

/**
 * Ruta lógica bajo cliente (sin `clients/{id}/`).
 * Con `subcarpeta`: …/tipo/pdf/archivo.ext. Sin subcarpeta y con nombre: legado …/tipo/archivo.ext
 */
function rutaInternaCliente(contexto, entidad, id, tipo, nombreArchivo, subcarpeta) {
  const ctx = String(contexto || '').trim().toLowerCase();
  const base = `${ctx}/${entidad}/${String(id)}/${tipo}`;
  if (!nombreArchivo) {
    return base;
  }
  if (subcarpeta) {
    return `${base}/${subcarpeta}/${nombreArchivo}`;
  }
  return `${base}/${nombreArchivo}`;
}

function keyALogicaRelativa(keyCompleta) {
  const p = s3.normalizarPrefijo(config.s3.keyPrefix);
  if (p && keyCompleta.startsWith(p)) {
    return keyCompleta.slice(p.length);
  }
  return keyCompleta;
}

function rutaInternaDesdeAlmacenamiento(clienteId, rutaCompletaDesdeRaizUploads) {
  if (!clienteId) {
    return rutaCompletaDesdeRaizUploads;
  }
  const pref = `clients/${clienteId}/`;
  if (rutaCompletaDesdeRaizUploads.startsWith(pref)) {
    return rutaCompletaDesdeRaizUploads.slice(pref.length);
  }
  return rutaCompletaDesdeRaizUploads;
}

function construirUrlPublicaMedia(req, rutaRelativaAlmacenamiento) {
  const limpia = rutaRelativaAlmacenamiento.replace(/^\/+/, '');
  if (esAlmacenamientoS3()) {
    return s3.urlPublicaObjeto(s3.claveCompleta(limpia));
  }
  if (usaMongoAuth()) {
    return null;
  }
  if (config.publicBaseUrl) {
    return `${config.publicBaseUrl}/media/${limpia}`;
  }
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}/media/${limpia}`;
}

async function listarArchivosLocal(clienteId, contexto, entidad, id, tipo) {
  const dirTipo = obtenerDirectorioAbsoluto(clienteId, contexto, entidad, id, tipo);
  asegurarDentroDeUploads(dirTipo);

  const resultado = [];

  async function agregarArchivo(rutaCompleta, nombreMostrar, subcarpeta) {
    const stat = await fs.stat(rutaCompleta);
    if (!stat.isFile()) return;
    const rel = rutaRelativaDesdeUploads(rutaCompleta);
    const interna = subcarpeta
      ? rutaInternaCliente(contexto, entidad, id, tipo, nombreMostrar, subcarpeta)
      : rutaInternaCliente(contexto, entidad, id, tipo, nombreMostrar);
    resultado.push({
      nombre: nombreMostrar,
      rutaRelativa: rel,
      rutaInternaCliente: interna,
      subcarpeta: subcarpeta || undefined,
      tamaño: stat.size,
      modificadoEn: stat.mtime.toISOString(),
    });
  }

  let entradas = [];
  try {
    entradas = await fs.readdir(dirTipo);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }

  for (const nombre of entradas) {
    const rutaCompleta = path.join(dirTipo, nombre);
    let stat;
    try {
      stat = await fs.stat(rutaCompleta);
    } catch {
      continue;
    }
    if (stat.isFile()) {
      await agregarArchivo(rutaCompleta, nombre, null);
    } else if (stat.isDirectory() && SUBCARPETAS_TIPO_ARCHIVO.has(nombre)) {
      let subNombres = [];
      try {
        subNombres = await fs.readdir(rutaCompleta);
      } catch {
        continue;
      }
      for (const nombreArchivo of subNombres) {
        const rutaArchivo = path.join(rutaCompleta, nombreArchivo);
        await agregarArchivo(rutaArchivo, nombreArchivo, nombre);
      }
    }
  }

  return resultado;
}

async function listarArchivosS3(clienteId, contexto, entidad, id, tipo) {
  validarContexto(contexto);
  validarEntidadTipo(entidad, tipo);
  validarIdentificadorEntidad(entidad, id);
  const prefijo = s3.prefijoListado(clienteId, contexto, entidad, id, tipo);
  const items = await s3.listarPorPrefijo(prefijo);
  const resultado = [];

  for (const obj of items) {
    if (!obj.key || obj.key.endsWith('/')) continue;
    const nombre = path.basename(obj.key);
    const logica = keyALogicaRelativa(obj.key);
    const partes = logica.split('/').filter(Boolean);
    let subcarpeta;
    if (partes.length >= 6) {
      const posible = partes[partes.length - 2];
      if (SUBCARPETAS_TIPO_ARCHIVO.has(posible)) {
        subcarpeta = posible;
      }
    }
    resultado.push({
      nombre,
      rutaRelativa: logica,
      rutaInternaCliente: rutaInternaDesdeAlmacenamiento(clienteId, logica),
      subcarpeta: subcarpeta || undefined,
      tamaño: obj.tamaño,
      modificadoEn: obj.modificadoEn || new Date(0).toISOString(),
    });
  }

  return resultado;
}

async function listarArchivos(clienteId, contexto, entidad, id, tipo) {
  if (esAlmacenamientoS3()) {
    return listarArchivosS3(clienteId, contexto, entidad, id, tipo);
  }
  return listarArchivosLocal(clienteId, contexto, entidad, id, tipo);
}

function validarNombreArchivoSeguro(nombreArchivo) {
  const nombreSeguro = path.basename(nombreArchivo || '');
  if (!nombreSeguro || !/^[a-zA-Z0-9._-]+$/.test(nombreSeguro)) {
    throw new AppError('Nombre de archivo no válido', 400);
  }
  return nombreSeguro;
}

async function eliminarArchivoLocal(clienteId, contexto, entidad, id, tipo, nombreArchivo) {
  const nombreSeguro = validarNombreArchivoSeguro(nombreArchivo);
  const dirTipo = obtenerDirectorioAbsoluto(clienteId, contexto, entidad, id, tipo);

  const intentos = [];
  for (const sub of SUBCARPETAS_TIPO_ARCHIVO) {
    intentos.push({ abs: path.join(dirTipo, sub, nombreSeguro), sub });
  }
  intentos.push({ abs: path.join(dirTipo, nombreSeguro), sub: null });

  for (const { abs, sub } of intentos) {
    asegurarDentroDeUploads(abs);
    let st;
    try {
      st = await fs.stat(abs);
    } catch {
      continue;
    }
    if (!st.isFile()) continue;
    try {
      await fs.unlink(abs);
    } catch (err) {
      if (err.code === 'ENOENT') continue;
      throw err;
    }
    const interna = sub
      ? rutaInternaCliente(contexto, entidad, id, tipo, nombreSeguro, sub)
      : rutaInternaCliente(contexto, entidad, id, tipo, nombreSeguro);
    return { eliminado: true, nombre: nombreSeguro, rutaInternaCliente: interna };
  }

  throw new AppError('Archivo no encontrado', 404);
}

async function eliminarArchivoS3(clienteId, contexto, entidad, id, tipo, nombreArchivo) {
  const nombreSeguro = validarNombreArchivoSeguro(nombreArchivo);
  validarContexto(contexto);
  validarEntidadTipo(entidad, tipo);
  validarIdentificadorEntidad(entidad, id);

  const rutasRelativas = [];
  for (const sub of SUBCARPETAS_TIPO_ARCHIVO) {
    rutasRelativas.push(
      conPrefijoCliente(clienteId, `${contexto}/${entidad}/${id}/${tipo}/${sub}/${nombreSeguro}`),
    );
  }
  rutasRelativas.push(
    conPrefijoCliente(clienteId, `${contexto}/${entidad}/${id}/${tipo}/${nombreSeguro}`),
  );

  for (const rutaRelativa of rutasRelativas) {
    const clave = s3.claveCompleta(rutaRelativa);
    const existe = await s3.existeObjeto(clave);
    if (!existe) continue;
    await s3.eliminarObjeto(clave);
    const interna = rutaInternaDesdeAlmacenamiento(clienteId, rutaRelativa);
    return { eliminado: true, nombre: nombreSeguro, rutaInternaCliente: interna };
  }

  throw new AppError('Archivo no encontrado', 404);
}

async function eliminarArchivo(clienteId, contexto, entidad, id, tipo, nombreArchivo) {
  if (esAlmacenamientoS3()) {
    return eliminarArchivoS3(clienteId, contexto, entidad, id, tipo, nombreArchivo);
  }
  return eliminarArchivoLocal(clienteId, contexto, entidad, id, tipo, nombreArchivo);
}

async function subirArchivoS3(req, file, clienteId) {
  const { contexto, entidad, id, tipo } = req.params;
  validarContexto(contexto);
  validarEntidadTipo(entidad, tipo);
  validarIdentificadorEntidad(entidad, id);
  const nombre = generarNombreArchivoMultimedia(file.originalname, file.mimetype);
  const sub = subcarpetaPorMime(file.mimetype);
  const rutaRelativa = conPrefijoCliente(
    clienteId,
    `${contexto}/${entidad}/${id}/${tipo}/${sub}/${nombre}`,
  );
  const clave = s3.claveCompleta(rutaRelativa);
  await s3.subirObjeto(clave, file.buffer, file.mimetype);
  const url = construirUrlPublicaMedia(req, rutaRelativa);
  const rutaInterna = rutaInternaCliente(contexto, entidad, id, tipo, nombre, sub);
  return {
    nombre,
    nombreOriginal: file.originalname,
    rutaRelativa,
    rutaInternaCliente: rutaInterna,
    tamaño: file.size,
    mime: file.mimetype,
    url,
  };
}

async function procesarSubida(req) {
  const file = req.file;
  const clienteId = usaMongoAuth() && !req.auth?.legacy ? String(req.auth.cliente._id) : null;

  if (esAlmacenamientoS3()) {
    const data = await subirArchivoS3(req, file, clienteId);
    if (usaMongoAuth() && !req.auth?.legacy) {
      const vis =
        req.body?.visibilidad === 'publico' || req.body?.visibilidad === 'public'
          ? 'publico'
          : 'privado';
      await archivoMetadataService.upsertTrasSubida({
        clienteId: req.auth.cliente._id,
        apiKeyId: req.auth.apiKeyDoc?._id,
        rutaRelativaCliente: data.rutaInternaCliente,
        nombre: data.nombre,
        nombreOriginal: data.nombreOriginal,
        mime: data.mime,
        tamaño: data.tamaño,
        visibilidad: vis,
      });
    }
    return data;
  }

  const rel = rutaRelativaDesdeUploads(file.path);
  const url = construirUrlPublicaMedia(req, rel);
  const { contexto, entidad, id, tipo } = req.params;
  const nombre = file.filename;
  const sub = subcarpetaPorMime(file.mimetype);
  const rutaInterna = rutaInternaCliente(contexto, entidad, id, tipo, nombre, sub);
  const data = {
    nombre,
    nombreOriginal: file.originalname,
    rutaRelativa: rel,
    rutaInternaCliente: rutaInterna,
    tamaño: file.size,
    mime: file.mimetype,
    url,
  };
  if (usaMongoAuth() && !req.auth?.legacy) {
    const vis =
      req.body?.visibilidad === 'publico' || req.body?.visibilidad === 'public'
        ? 'publico'
        : 'privado';
    await archivoMetadataService.upsertTrasSubida({
      clienteId: req.auth.cliente._id,
      apiKeyId: req.auth.apiKeyDoc?._id,
      rutaRelativaCliente: rutaInterna,
      nombre,
      nombreOriginal: file.originalname,
      mime: file.mimetype,
      tamaño: file.size,
      visibilidad: vis,
    });
    const accesoUrl = urlAccesoLocalTrasSubidaMongo(req, req.auth.cliente._id, rutaInterna, vis);
    if (accesoUrl) {
      data.url = accesoUrl;
    }
  }
  return data;
}

async function existeArchivoEnAlmacenamiento(clienteId, rutaInternaCliente) {
  const rel = resolverRutaAlmacenamientoDesdeInterna(clienteId, rutaInternaCliente);
  if (esAlmacenamientoS3()) {
    return s3.existeObjeto(s3.claveCompleta(rel));
  }
  const abs = path.join(storageRaiz(), ...rel.split('/'));
  asegurarDentroDeUploads(abs);
  try {
    const st = await fs.stat(abs);
    return st.isFile();
  } catch {
    return false;
  }
}

function baseUrlPeticion(req) {
  if (config.publicBaseUrl) {
    return config.publicBaseUrl;
  }
  return `${req.protocol}://${req.get('host')}`;
}

/**
 * URL de lectura para un archivo recién subido (Mongo + disco local): token /acceso/
 * (misma idea que enriquecerListadoConUrls para items sin URL pública).
 */
function urlAccesoLocalTrasSubidaMongo(req, clienteId, rutaInternaCliente, visibilidad) {
  if (!usaMongoAuth() || !clienteId || esAlmacenamientoS3()) {
    return null;
  }
  const multimediaAccesoLocal = require('./multimediaAccesoLocal');
  const vis = visibilidad === 'publico' || visibilidad === 'public' ? 'publico' : 'privado';
  const token = multimediaAccesoLocal.firmarToken(
    { clienteId: String(clienteId), rutaRelativaCliente: rutaInternaCliente },
    vis === 'privado' ? config.signedUrlExpiresSeconds : config.signedUrlExpiresSeconds * 4,
  );
  return `${baseUrlPeticion(req)}/api/v1/multimedia/acceso/${token}`;
}

async function enriquecerListadoConUrls(req, items, clienteId) {
  const multimediaAccesoLocal = require('./multimediaAccesoLocal');
  const rutas = items.map((i) => i.rutaInternaCliente).filter(Boolean);
  const metaMap = usaMongoAuth() && clienteId
    ? await archivoMetadataService.mapaMetadata(clienteId, rutas)
    : new Map();

  const base = baseUrlPeticion(req);
  const out = [];
  for (const item of items) {
    const meta = metaMap.get(item.rutaInternaCliente) || null;
    const vis = meta?.visibilidad || 'publico';
    const nombreOriginal = meta?.nombreOriginal || item.nombre;
    let urlFinal = null;
    let accesoPrivado = false;

    if (usaMongoAuth() && clienteId) {
      accesoPrivado = vis === 'privado';
      if (!esAlmacenamientoS3()) {
        const token = multimediaAccesoLocal.firmarToken(
          { clienteId, rutaRelativaCliente: item.rutaInternaCliente },
          vis === 'privado' ? config.signedUrlExpiresSeconds : config.signedUrlExpiresSeconds * 4,
        );
        urlFinal = `${base}/api/v1/multimedia/acceso/${token}`;
      } else if (vis === 'privado') {
        urlFinal = await s3.urlFirmaLectura(
          s3.claveCompleta(item.rutaRelativa),
          config.signedUrlExpiresSeconds,
        );
      } else {
        urlFinal = construirUrlPublicaMedia(req, item.rutaRelativa);
      }
    } else {
      urlFinal = construirUrlPublicaMedia(req, item.rutaRelativa);
    }

    out.push({
      nombre: item.nombre,
      nombreOriginal,
      rutaRelativa: item.rutaRelativa,
      rutaInternaCliente: item.rutaInternaCliente,
      ...(item.subcarpeta ? { subcarpeta: item.subcarpeta } : {}),
      tamaño: item.tamaño,
      modificadoEn: item.modificadoEn,
      visibilidad: usaMongoAuth() && clienteId ? vis : undefined,
      url: urlFinal,
      accesoPrivado,
    });
  }
  return out;
}

function resolverRutaAlmacenamientoDesdeInterna(clienteId, rutaInternaCliente) {
  return conPrefijoCliente(clienteId, rutaInternaCliente.replace(/^\/+/, ''));
}

module.exports = {
  obtenerDirectorioAbsoluto,
  asegurarDentroDeUploads,
  rutaRelativaDesdeUploads,
  construirUrlPublicaMedia,
  listarArchivos,
  eliminarArchivo,
  procesarSubida,
  enriquecerListadoConUrls,
  validarContexto,
  validarEntidadTipo,
  validarIdentificadorEntidad,
  validarNombreArchivoSeguro,
  esAlmacenamientoS3,
  usaMongoAuth,
  rutaInternaCliente,
  resolverRutaAlmacenamientoDesdeInterna,
  conPrefijoCliente,
  existeArchivoEnAlmacenamiento,
  baseUrlPeticion,
};
