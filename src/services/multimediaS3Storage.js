const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  HeadObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const path = require('path');
const config = require('../config');

let client;

function getClient() {
  if (!client) {
    client = new S3Client({
      region: config.s3.region,
    });
  }
  return client;
}

function normalizarPrefijo(prefijo) {
  if (!prefijo) return '';
  return prefijo.replace(/^\/+/, '').replace(/([^/])$/, '$1/');
}

/**
 * Clave completa en el bucket (incluye prefijo opcional).
 */
function claveCompleta(rutaLogicaRelativa) {
  const p = normalizarPrefijo(config.s3.keyPrefix);
  const limpia = rutaLogicaRelativa.replace(/^\/+/, '');
  return p ? `${p}${limpia}` : limpia;
}

function rutaLogicaCarpeta(clienteId, contexto, entidad, id, tipo) {
  const tail = `${contexto}/${entidad}/${id}/${tipo}/`;
  if (!clienteId) {
    return tail;
  }
  return `clients/${clienteId}/${tail}`;
}

/**
 * Prefijo para listar bajo clients/{id}/{contexto}/entidad/id/tipo/ (o legado sin clients/).
 */
function prefijoListado(clienteId, contexto, entidad, id, tipo) {
  return claveCompleta(rutaLogicaCarpeta(clienteId, contexto, entidad, id, tipo));
}

function urlPublicaObjeto(claveCompletaKey) {
  const { bucket, region, publicBaseUrl } = config.s3;
  const segmentos = claveCompletaKey.split('/').map((s) => encodeURIComponent(s)).join('/');
  if (publicBaseUrl) {
    return `${publicBaseUrl}/${segmentos}`;
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${segmentos}`;
}

async function subirObjeto(clave, buffer, contentType) {
  const cmd = new PutObjectCommand({
    Bucket: config.s3.bucket,
    Key: clave,
    Body: buffer,
    ContentType: contentType || 'application/octet-stream',
  });
  await getClient().send(cmd);
}

async function listarPorPrefijo(prefijo) {
  const acumulado = [];
  let continuationToken;
  do {
    const cmd = new ListObjectsV2Command({
      Bucket: config.s3.bucket,
      Prefix: prefijo,
      ContinuationToken: continuationToken,
    });
    const out = await getClient().send(cmd);
    const contents = out.Contents || [];
    for (const obj of contents) {
      acumulado.push({
        key: obj.Key,
        tamaño: obj.Size,
        modificadoEn: obj.LastModified ? obj.LastModified.toISOString() : null,
      });
    }
    continuationToken = out.IsTruncated ? out.NextContinuationToken : undefined;
  } while (continuationToken);
  return acumulado;
}

/** Lista un nivel de “carpeta” en S3 (subcarpetas + archivos inmediatos). */
async function listarNivel(prefijoLogicoRelativo) {
  const base = normalizarPrefijo(claveCompleta(String(prefijoLogicoRelativo || '').replace(/^\/+/, '')));
  const folders = [];
  const files = [];
  let continuationToken;

  do {
    const cmd = new ListObjectsV2Command({
      Bucket: config.s3.bucket,
      Prefix: base,
      Delimiter: '/',
      ContinuationToken: continuationToken,
    });
    const out = await getClient().send(cmd);

    for (const cp of out.CommonPrefixes || []) {
      const key = cp.Prefix || '';
      const rel = key.startsWith(base) ? key.slice(base.length) : key;
      const name = rel.replace(/\/$/, '');
      if (name) {
        folders.push({ name });
      }
    }

    for (const obj of out.Contents || []) {
      const key = obj.Key || '';
      if (key === base || key.endsWith('/')) continue;
      const rel = key.startsWith(base) ? key.slice(base.length) : path.basename(key);
      if (!rel || rel.includes('/')) continue;
      files.push({
        name: rel,
        key,
        tamaño: obj.Size,
        modificadoEn: obj.LastModified ? obj.LastModified.toISOString() : null,
      });
    }

    continuationToken = out.IsTruncated ? out.NextContinuationToken : undefined;
  } while (continuationToken);

  return { folders, files };
}

async function eliminarObjeto(clave) {
  const cmd = new DeleteObjectCommand({
    Bucket: config.s3.bucket,
    Key: clave,
  });
  await getClient().send(cmd);
}

async function urlFirmaLectura(clave, expiresInSeconds) {
  const cmd = new GetObjectCommand({
    Bucket: config.s3.bucket,
    Key: clave,
  });
  const seg = expiresInSeconds || 900;
  return getSignedUrl(getClient(), cmd, { expiresIn: seg });
}

async function existeObjeto(clave) {
  try {
    await getClient().send(
      new HeadObjectCommand({
        Bucket: config.s3.bucket,
        Key: clave,
      }),
    );
    return true;
  } catch (err) {
    const code = err.$metadata?.httpStatusCode;
    if (err.name === 'NotFound' || err.name === 'NoSuchKey' || code === 404) {
      return false;
    }
    throw err;
  }
}

module.exports = {
  claveCompleta,
  prefijoListado,
  rutaLogicaCarpeta,
  urlPublicaObjeto,
  urlFirmaLectura,
  subirObjeto,
  listarPorPrefijo,
  listarNivel,
  eliminarObjeto,
  existeObjeto,
  normalizarPrefijo,
};
