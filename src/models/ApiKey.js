const mongoose = require('mongoose');
const { randomUUID } = require('crypto');

const permisosSchema = new mongoose.Schema(
  {
    read: { type: Boolean, default: true },
    write: { type: Boolean, default: false },
    delete: { type: Boolean, default: false },
  },
  { _id: false },
);

const apiKeySchema = new mongoose.Schema(
  {
    publicId: {
      type: String,
      unique: true,
      index: true,
      default: randomUUID,
    },
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true, index: true },
    hash: { type: String, required: true, unique: true, index: true },
    nombre: { type: String, required: true, trim: true },
    prefijos: { type: [String], default: [] },
    permisos: { type: permisosSchema, default: () => ({}) },
    activo: { type: Boolean, default: true },
    ultimoUsoAt: { type: Date },
  },
  { timestamps: true },
);

module.exports = mongoose.models.ApiKey || mongoose.model('ApiKey', apiKeySchema);
