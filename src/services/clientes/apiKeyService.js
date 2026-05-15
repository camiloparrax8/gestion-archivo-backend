const ApiKey = require('../../models/ApiKey');
const mongoose = require('mongoose');
const { hashApiKey, generarApiKeyPlano } = require('../seguridad/hashApiKey');

async function crearLlave(clienteId, { nombre, prefijos = [], permisos = {}, activo = true }) {
  const plain = generarApiKeyPlano();
  const hash = hashApiKey(plain);
  const doc = await ApiKey.create({
    cliente: clienteId,
    hash,
    nombre,
    prefijos: Array.isArray(prefijos) ? prefijos : [],
    permisos: {
      read: permisos.read !== false,
      write: Boolean(permisos.write),
      delete: Boolean(permisos.delete),
    },
    activo: activo !== false,
  });
  return { plain, doc };
}

async function buscarPorClavePlana(plain) {
  if (!plain) return null;
  const hash = hashApiKey(plain);
  return ApiKey.findOne({ hash, activo: true }).populate('cliente');
}

async function listarPorCliente(clienteId) {
  const docs = await ApiKey.find({ cliente: clienteId })
    .select('_id publicId nombre prefijos permisos activo ultimoUsoAt createdAt')
    .lean();
  return docs.map((d) => ({
    id: d.publicId,
    legacyId: String(d._id),
    publicId: d.publicId,
    nombre: d.nombre,
    prefijos: d.prefijos,
    permisos: d.permisos,
    activo: d.activo,
    ultimoUsoAt: d.ultimoUsoAt,
    createdAt: d.createdAt,
  }));
}

async function marcarUso(apiKeyId) {
  await ApiKey.findOneAndUpdate(
    { _id: apiKeyId },
    { $set: { ultimoUsoAt: new Date() } },
    { returnDocument: 'after' },
  );
}

async function actualizarEstado(clienteId, llaveId, activo) {
  return ApiKey.findOneAndUpdate(
    { cliente: clienteId, publicId: llaveId },
    { $set: { activo: Boolean(activo) } },
    { returnDocument: 'after' },
  ).select('publicId nombre prefijos permisos activo ultimoUsoAt createdAt');
}

async function rotarLlave(clienteId, llaveId, { nombre, desactivarAnterior = true } = {}) {
  const anterior = await ApiKey.findOne({ cliente: clienteId, publicId: llaveId });
  if (!anterior) {
    return null;
  }

  const plain = generarApiKeyPlano();
  const hash = hashApiKey(plain);
  const nueva = await ApiKey.create({
    cliente: clienteId,
    hash,
    nombre: String(nombre || '').trim() || anterior.nombre,
    prefijos: anterior.prefijos || [],
    permisos: anterior.permisos || {},
    activo: true,
  });

  let anteriorActualizada = anterior;
  if (desactivarAnterior) {
    anterior.activo = false;
    await anterior.save();
    anteriorActualizada = anterior;
  }

  return { plain, nueva, anterior: anteriorActualizada };
}

/**
 * Elimina la API key del cliente. `llaveParam` puede ser `publicId` (UUID) o `_id` (ObjectId).
 * @returns {import('mongoose').Document | null} documento borrado o null
 */
async function eliminarLlave(clienteId, llaveParam) {
  const valor = String(llaveParam || '').trim();
  if (!valor) {
    return null;
  }
  const filtroBase = { cliente: clienteId };
  if (mongoose.Types.ObjectId.isValid(valor)) {
    const porId = await ApiKey.findOneAndDelete({ ...filtroBase, _id: valor });
    if (porId) {
      return porId;
    }
  }
  return ApiKey.findOneAndDelete({ ...filtroBase, publicId: valor });
}

module.exports = {
  crearLlave,
  buscarPorClavePlana,
  listarPorCliente,
  marcarUso,
  actualizarEstado,
  rotarLlave,
  eliminarLlave,
};
