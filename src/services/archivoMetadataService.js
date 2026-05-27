const Archivo = require('../models/Archivo');

async function upsertTrasSubida({
  clienteId,
  apiKeyId,
  rutaRelativaCliente,
  nombre,
  nombreOriginal,
  mime,
  tamaño,
  visibilidad,
}) {
  const doc = await Archivo.findOneAndUpdate(
    { cliente: clienteId, rutaRelativa: rutaRelativaCliente },
    {
      $set: {
        nombre,
        nombreOriginal,
        mime,
        tamaño,
        visibilidad,
        apiKey: apiKeyId || undefined,
      },
    },
    { upsert: true, new: true },
  );
  return doc;
}

async function eliminarPorRuta(clienteId, rutaRelativaCliente) {
  await Archivo.findOneAndDelete({ cliente: clienteId, rutaRelativa: rutaRelativaCliente });
}

/** Elimina metadatos bajo un prefijo lógico (carpeta y todo su contenido). */
async function eliminarPorPrefijo(clienteId, prefijoLogico) {
  const limpio = normalizarPrefijoLogico(prefijoLogico);
  if (!limpio) {
    return { eliminados: 0 };
  }
  const escaped = limpio.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const result = await Archivo.deleteMany({
    cliente: clienteId,
    $or: [{ rutaRelativa: limpio }, { rutaRelativa: new RegExp(`^${escaped}/`) }],
  });
  return { eliminados: result.deletedCount || 0 };
}

async function mapaVisibilidad(clienteId, rutasCliente) {
  if (!clienteId || !rutasCliente.length) {
    return new Map();
  }
  const docs = await Archivo.find({
    cliente: clienteId,
    rutaRelativa: { $in: rutasCliente },
  })
    .select('rutaRelativa visibilidad')
    .lean();
  return new Map(docs.map((d) => [d.rutaRelativa, d.visibilidad]));
}

async function mapaMetadata(clienteId, rutasCliente) {
  if (!clienteId || !rutasCliente.length) {
    return new Map();
  }
  const docs = await Archivo.find({
    cliente: clienteId,
    rutaRelativa: { $in: rutasCliente },
  })
    .select('rutaRelativa visibilidad nombreOriginal mime tamaño apiKey publicId')
    .lean();
  return new Map(
    docs.map((d) => [
      d.rutaRelativa,
      {
        visibilidad: d.visibilidad,
        nombreOriginal: d.nombreOriginal,
        mime: d.mime,
        tamaño: d.tamaño,
        apiKeyId: d.apiKey ? String(d.apiKey) : null,
        publicId: d.publicId || null,
      },
    ]),
  );
}

/** Archivo marcado como público, resoluble por publicId (sin API key). */
async function obtenerPublicoPorPublicId(publicId) {
  const id = String(publicId || '').trim();
  if (!id) {
    return null;
  }
  return Archivo.findOne({ publicId: id, visibilidad: 'publico' })
    .select('cliente rutaRelativa nombre nombreOriginal mime')
    .lean();
}

const SUBCARPETAS_ARCHIVO = new Set(['pdf', 'jpeg', 'png', 'gif', 'webp']);

/**
 * Archivos bajo una carpeta lógica exacta (…/contexto/entidad/id/tipo), incluyendo subcarpetas MIME.
 */
async function listarArchivosEnCarpeta(clienteId, contexto, entidad, id, tipo) {
  const prefijo = normalizarPrefijoLogico(`${contexto}/${entidad}/${id}/${tipo}`);
  if (!clienteId || !prefijo) {
    return [];
  }
  const escaped = prefijo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const docs = await Archivo.find({
    cliente: clienteId,
    rutaRelativa: new RegExp(`^${escaped}/`),
  })
    .select('rutaRelativa nombre nombreOriginal mime tamaño updatedAt createdAt')
    .lean();

  const archivos = [];
  for (const doc of docs) {
    const rel = normalizarPrefijoLogico(doc.rutaRelativa);
    const rest = rel.slice(prefijo.length + 1);
    const partes = rest.split('/').filter(Boolean);
    if (partes.length !== 1 && partes.length !== 2) {
      continue;
    }
    if (partes.length === 2 && !SUBCARPETAS_ARCHIVO.has(partes[0])) {
      continue;
    }
    archivos.push({
      nombre: doc.nombre || partes[partes.length - 1],
      nombreOriginal: doc.nombreOriginal,
      rutaInternaCliente: rel,
      subcarpeta: partes.length === 2 ? partes[0] : undefined,
      tamaño: doc.tamaño,
      modificadoEn: (doc.updatedAt || doc.createdAt)?.toISOString?.() || null,
      mime: doc.mime,
    });
  }
  return archivos;
}

async function obtenerPorRuta(clienteId, rutaRelativaCliente) {
  return Archivo.findOne({ cliente: clienteId, rutaRelativa: rutaRelativaCliente }).lean();
}

function normalizarPrefijoLogico(prefijoLogico) {
  return String(prefijoLogico || '').replace(/^\/+|\/+$/g, '');
}

function alcanzaPrefijosRuta(rutaLogica, prefijos) {
  const prefs = (prefijos || [])
    .map((p) => String(p || '').replace(/^\/+|\/+$/g, '').toLowerCase())
    .filter(Boolean);
  if (!prefs.length) {
    return false;
  }
  const ruta = String(rutaLogica || '').replace(/^\/+|\/+$/g, '').toLowerCase();
  return prefs.some(
    (pref) => ruta === pref || ruta.startsWith(`${pref}/`) || pref.startsWith(`${ruta}/`),
  );
}

/** Archivo pertenece a la llave: subida con esa apiKey o legado sin apiKey bajo sus prefijos. */
function perteneceALlave(doc, apiKeyId, prefijosLlave) {
  if (doc.apiKey) {
    return String(doc.apiKey) === String(apiKeyId);
  }
  return alcanzaPrefijosRuta(doc.rutaRelativa, prefijosLlave);
}

/** Todas las rutas del cliente visibles para una llave (apiKey + legado por prefijos). */
async function rutasRelativasParaLlave(clienteId, apiKeyId, prefijosLlave = []) {
  const docs = await Archivo.find({ cliente: clienteId })
    .select('rutaRelativa apiKey')
    .lean();
  return docs
    .filter((doc) => perteneceALlave(doc, apiKeyId, prefijosLlave))
    .map((doc) => normalizarPrefijoLogico(doc.rutaRelativa))
    .filter(Boolean);
}

/**
 * Hijos inmediatos (carpetas y archivos) inferidos de metadatos MongoDB.
 * Cubre rutas 5 o 6 segmentos (…/tipo/archivo o …/tipo/pdf/archivo).
 */
async function listarHijosDesdeMetadata(clienteId, prefijoLogico, opciones = {}) {
  const limpio = normalizarPrefijoLogico(prefijoLogico);
  const apiKeyId = opciones.apiKeyId;
  const prefijosLlave = opciones.prefijosLlave || [];

  let docs;
  if (apiKeyId) {
    docs = await Archivo.find({ cliente: clienteId })
      .select(
        'rutaRelativa nombre nombreOriginal mime tamaño visibilidad apiKey updatedAt createdAt',
      )
      .lean();
    docs = docs.filter((doc) => perteneceALlave(doc, apiKeyId, prefijosLlave));
    if (limpio) {
      const base = `${limpio}/`;
      docs = docs.filter(
        (doc) =>
          normalizarPrefijoLogico(doc.rutaRelativa) === limpio ||
          normalizarPrefijoLogico(doc.rutaRelativa).startsWith(base),
      );
    }
  } else {
    const filtro = { cliente: clienteId };
    if (limpio) {
      filtro.rutaRelativa = new RegExp(
        `^${limpio.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`,
      );
    }
    docs = await Archivo.find(filtro)
      .select(
        'rutaRelativa nombre nombreOriginal mime tamaño visibilidad apiKey updatedAt createdAt',
      )
      .lean();
  }

  const carpetas = new Map();
  const archivos = new Map();

  for (const doc of docs) {
    const full = normalizarPrefijoLogico(doc.rutaRelativa);
    if (!full) continue;
    const rest = limpio ? full.slice(limpio.length + 1) : full;
    if (!rest) continue;
    const partes = rest.split('/').filter(Boolean);
    if (partes.length === 0) continue;

    if (partes.length === 1) {
      archivos.set(full, {
        kind: 'file',
        name: doc.nombre || partes[0],
        path: full,
        rutaInternaCliente: full,
        rutaRelativa: full,
        tamaño: doc.tamaño,
        modificadoEn: (doc.updatedAt || doc.createdAt)?.toISOString?.() || null,
        mime: doc.mime,
        nombreOriginal: doc.nombreOriginal,
        apiKeyId: doc.apiKey ? String(doc.apiKey) : null,
      });
      continue;
    }

    const nombreCarpeta = partes[0];
    const childPath = limpio ? `${limpio}/${nombreCarpeta}` : nombreCarpeta;
    carpetas.set(childPath, {
      kind: 'folder',
      name: nombreCarpeta,
      path: childPath,
      contexto: childPath.split('/').filter(Boolean)[0] || null,
    });
  }

  return {
    folders: [...carpetas.values()],
    files: [...archivos.values()],
  };
}

module.exports = {
  upsertTrasSubida,
  eliminarPorRuta,
  eliminarPorPrefijo,
  mapaVisibilidad,
  mapaMetadata,
  obtenerPublicoPorPublicId,
  listarArchivosEnCarpeta,
  obtenerPorRuta,
  listarHijosDesdeMetadata,
  rutasRelativasParaLlave,
  perteneceALlave,
};
