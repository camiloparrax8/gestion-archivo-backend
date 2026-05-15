const config = require('../../config');
const AuditoriaEvento = require('../../models/AuditoriaEvento');

function fechaExpiracionAuditoria() {
  const d = new Date();
  d.setDate(d.getDate() + (config.auditoriaTtlDias || 30));
  return d;
}

async function registrar(payload) {
  if (!config.mongodbUri) return;
  try {
    await AuditoriaEvento.create({
      cliente: payload.clienteId || undefined,
      apiKey: payload.apiKeyId || undefined,
      origen: payload.origen || undefined,
      accion: payload.accion,
      metodo: payload.metodo,
      ruta: payload.ruta,
      statusCode: payload.statusCode,
      detalle: payload.detalle,
      expiraEn: fechaExpiracionAuditoria(),
    });
  } catch (err) {
    console.error('[auditoria]', err.message);
  }
}

module.exports = { registrar, fechaExpiracionAuditoria };
