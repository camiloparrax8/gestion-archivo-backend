const mongoose = require('mongoose');
const { randomUUID } = require('crypto');

const archivoSchema = new mongoose.Schema(
  {
    publicId: {
      type: String,
      unique: true,
      index: true,
      default: randomUUID,
    },
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true, index: true },
    apiKey: { type: mongoose.Schema.Types.ObjectId, ref: 'ApiKey' },
    rutaRelativa: { type: String, required: true },
    nombre: { type: String, required: true },
    nombreOriginal: { type: String },
    mime: { type: String },
    tamaño: { type: Number },
    visibilidad: {
      type: String,
      enum: ['publico', 'privado'],
      default: 'privado',
    },
  },
  { timestamps: true },
);

archivoSchema.index({ cliente: 1, rutaRelativa: 1 }, { unique: true });

module.exports = mongoose.models.Archivo || mongoose.model('Archivo', archivoSchema);
