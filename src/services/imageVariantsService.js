const fs = require('fs/promises');
const path = require('path');
const multimediaService = require('./multimediaService');
const imageProcessingService = require('./imageProcessingService');
const s3 = require('./multimediaS3Storage');

const VALID_SIZES = new Set(['thumb', 'medium']);
const VARIANT_MIME = 'image/webp';

/**
 * Ruta lógica interna de variante: …/tipo/_variants/{size}/{stem}.webp
 * @param {string} rutaInternaOriginal
 * @param {"thumb" | "medium"} size
 * @returns {string | null}
 */
function rutaVarianteInterna(rutaInternaOriginal, size) {
  const limpia = String(rutaInternaOriginal || '').replace(/^\/+/, '');
  const partes = limpia.split('/').filter(Boolean);
  if (partes.length !== 6) {
    return null;
  }
  const [contexto, entidad, id, tipo, subcarpeta, nombreArchivo] = partes;
  if (subcarpeta === '_variants' || !nombreArchivo) {
    return null;
  }
  const stem = path.parse(nombreArchivo).name;
  if (!stem) {
    return null;
  }
  return `${contexto}/${entidad}/${id}/${tipo}/_variants/${size}/${stem}.webp`;
}

/**
 * @param {string | null | undefined} sizeQuery
 * @returns {"thumb" | "medium" | null}
 */
function normalizarSizeQuery(sizeQuery) {
  const size = String(sizeQuery || '').trim().toLowerCase();
  return VALID_SIZES.has(size) ? size : null;
}

/**
 * Resuelve ruta interna a servir: variante si existe, si no el original.
 * @param {string | null} clienteId
 * @param {string} rutaInternaOriginal
 * @param {string | null | undefined} sizeQuery
 */
async function resolverRutaEntrega(clienteId, rutaInternaOriginal, sizeQuery) {
  const size = normalizarSizeQuery(sizeQuery);
  if (!size) {
    return rutaInternaOriginal;
  }
  const rutaVariante = rutaVarianteInterna(rutaInternaOriginal, size);
  if (!rutaVariante) {
    return rutaInternaOriginal;
  }
  const existe = await multimediaService.existeArchivoEnAlmacenamiento(clienteId, rutaVariante);
  return existe ? rutaVariante : rutaInternaOriginal;
}

function absDesdeRutaInterna(clienteId, rutaInterna) {
  const rel = multimediaService.resolverRutaAlmacenamientoDesdeInterna(clienteId, rutaInterna);
  const base = path.resolve(require('../config').storageDir);
  return path.join(base, ...rel.split('/'));
}

async function leerOriginalComoBuffer(opciones) {
  const { clienteId, rutaInternaCliente, buffer, localPath } = opciones;
  if (buffer && Buffer.isBuffer(buffer)) {
    return buffer;
  }
  if (localPath) {
    return fs.readFile(localPath);
  }
  if (multimediaService.esAlmacenamientoS3()) {
    return s3.leerObjetoBuffer(
      s3.claveCompleta(
        multimediaService.resolverRutaAlmacenamientoDesdeInterna(clienteId, rutaInternaCliente),
      ),
    );
  }
  const abs = absDesdeRutaInterna(clienteId, rutaInternaCliente);
  multimediaService.asegurarDentroDeUploads(abs);
  return fs.readFile(abs);
}

async function persistirVariante(clienteId, rutaInternaVariante, webpBuffer) {
  if (multimediaService.esAlmacenamientoS3()) {
    const clave = s3.claveCompleta(
      multimediaService.resolverRutaAlmacenamientoDesdeInterna(clienteId, rutaInternaVariante),
    );
    await s3.subirObjeto(clave, webpBuffer, VARIANT_MIME);
    return;
  }
  const abs = absDesdeRutaInterna(clienteId, rutaInternaVariante);
  multimediaService.asegurarDentroDeUploads(abs);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, webpBuffer);
}

/**
 * Genera y guarda variantes thumb/medium tras una subida de imagen.
 */
async function generarYPersistirDesdeSubida(opciones) {
  const { clienteId, rutaInternaCliente, mime, buffer, localPath } = opciones;
  if (!imageProcessingService.esMimeImagenOptimizable(mime)) {
    return { generadas: false };
  }
  const inputBuffer = await leerOriginalComoBuffer({
    clienteId,
    rutaInternaCliente,
    buffer,
    localPath,
  });
  const variantes = await imageProcessingService.generarBuffersVariantes(inputBuffer);
  const resultados = {};
  for (const size of VALID_SIZES) {
    const rutaVariante = rutaVarianteInterna(rutaInternaCliente, size);
    if (!rutaVariante) {
      continue;
    }
    await persistirVariante(clienteId, rutaVariante, variantes[size]);
    resultados[size] = rutaVariante;
  }
  return { generadas: true, rutas: resultados };
}

/**
 * Backfill: genera variantes solo si faltan en almacenamiento.
 */
async function generarYPersistirSiFaltan(clienteId, rutaInternaCliente, mime) {
  if (!imageProcessingService.esMimeImagenOptimizable(mime)) {
    return { omitido: true, motivo: 'no_imagen' };
  }
  const faltantes = [];
  for (const size of VALID_SIZES) {
    const rutaVariante = rutaVarianteInterna(rutaInternaCliente, size);
    if (!rutaVariante) {
      return { omitido: true, motivo: 'ruta_invalida' };
    }
    const existe = await multimediaService.existeArchivoEnAlmacenamiento(clienteId, rutaVariante);
    if (!existe) {
      faltantes.push(size);
    }
  }
  if (!faltantes.length) {
    return { omitido: true, motivo: 'ya_existen' };
  }
  await generarYPersistirDesdeSubida({
    clienteId: String(clienteId),
    rutaInternaCliente,
    mime,
    buffer: null,
    localPath: null,
  });
  return { generadas: true, rutas: faltantes };
}

/**
 * Elimina variantes asociadas a un archivo original.
 */
async function eliminarVariantes(clienteId, rutaInternaOriginal) {
  const eliminadas = [];
  for (const size of VALID_SIZES) {
    const rutaVariante = rutaVarianteInterna(rutaInternaOriginal, size);
    if (!rutaVariante) {
      continue;
    }
    const existe = await multimediaService.existeArchivoEnAlmacenamiento(clienteId, rutaVariante);
    if (!existe) {
      continue;
    }
    if (multimediaService.esAlmacenamientoS3()) {
      const clave = s3.claveCompleta(
        multimediaService.resolverRutaAlmacenamientoDesdeInterna(clienteId, rutaVariante),
      );
      await s3.eliminarObjeto(clave);
    } else {
      const abs = absDesdeRutaInterna(clienteId, rutaVariante);
      multimediaService.asegurarDentroDeUploads(abs);
      try {
        await fs.unlink(abs);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          throw err;
        }
      }
    }
    eliminadas.push(rutaVariante);
  }
  return eliminadas;
}

/**
 * @param {string} rutaInterna
 */
function esRutaVariante(rutaInterna) {
  return String(rutaInterna || '').includes('/_variants/');
}

module.exports = {
  VALID_SIZES,
  VARIANT_MIME,
  rutaVarianteInterna,
  normalizarSizeQuery,
  resolverRutaEntrega,
  generarYPersistirDesdeSubida,
  generarYPersistirSiFaltan,
  eliminarVariantes,
  esRutaVariante,
};
