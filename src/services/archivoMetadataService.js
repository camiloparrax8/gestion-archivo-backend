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
    .select('rutaRelativa visibilidad nombreOriginal mime tamaño')
    .lean();
  return new Map(
    docs.map((d) => [
      d.rutaRelativa,
      {
        visibilidad: d.visibilidad,
        nombreOriginal: d.nombreOriginal,
        mime: d.mime,
        tamaño: d.tamaño,
      },
    ]),
  );
}

async function obtenerPorRuta(clienteId, rutaRelativaCliente) {
  return Archivo.findOne({ cliente: clienteId, rutaRelativa: rutaRelativaCliente }).lean();
}

function normalizarPrefijoLogico(prefijoLogico) {
  return String(prefijoLogico || '').replace(/^\/+|\/+$/g, '');
}

/**
 * Hijos inmediatos (carpetas y archivos) inferidos de metadatos MongoDB.
 * Cubre rutas 5 o 6 segmentos (…/tipo/archivo o …/tipo/pdf/archivo).
 */
async function listarHijosDesdeMetadata(clienteId, prefijoLogico) {
  const limpio = normalizarPrefijoLogico(prefijoLogico);
  const filtro = { cliente: clienteId };
  if (limpio) {
    filtro.rutaRelativa = new RegExp(`^${limpio.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`);
  }

  const docs = await Archivo.find(filtro)
    .select('rutaRelativa nombre nombreOriginal mime tamaño visibilidad updatedAt createdAt')
    .lean();

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
  mapaVisibilidad,
  mapaMetadata,
  obtenerPorRuta,
  listarHijosDesdeMetadata,
};
