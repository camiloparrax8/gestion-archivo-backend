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
    .select('rutaRelativa visibilidad nombreOriginal')
    .lean();
  return new Map(
    docs.map((d) => [d.rutaRelativa, { visibilidad: d.visibilidad, nombreOriginal: d.nombreOriginal }]),
  );
}

async function obtenerPorRuta(clienteId, rutaRelativaCliente) {
  return Archivo.findOne({ cliente: clienteId, rutaRelativa: rutaRelativaCliente }).lean();
}

module.exports = {
  upsertTrasSubida,
  eliminarPorRuta,
  mapaVisibilidad,
  mapaMetadata,
  obtenerPorRuta,
};
