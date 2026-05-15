const mongoose = require('mongoose');

const auditoriaSchema = new mongoose.Schema(
  {
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', index: true },
    apiKey: { type: mongoose.Schema.Types.ObjectId, ref: 'ApiKey' },
    /** Quién originó el evento: clave de cliente, master key o enlace JWT temporal. */
    origen: { type: String, index: true },
    accion: { type: String, required: true },
    metodo: { type: String },
    ruta: { type: String },
    statusCode: { type: Number },
    detalle: { type: mongoose.Schema.Types.Mixed },
    /** El índice TTL usa este campo */
    expiraEn: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditoriaSchema.index({ expiraEn: 1 }, { expireAfterSeconds: 0 });
auditoriaSchema.index({ accion: 1, createdAt: -1 });

module.exports =
  mongoose.models.AuditoriaEvento || mongoose.model('AuditoriaEvento', auditoriaSchema);
