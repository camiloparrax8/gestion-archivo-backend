const mongoose = require('mongoose');
const { randomUUID } = require('crypto');

const clienteSchema = new mongoose.Schema(
  {
    publicId: {
      type: String,
      unique: true,
      index: true,
      default: randomUUID,
    },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    nombre: { type: String, required: true, trim: true },
    telefono: { type: String, trim: true },
    tipoDocumento: { type: String, trim: true },
    numeroDocumento: { type: String, trim: true },
    passwordHash: { type: String, select: false },
    rol: { type: String, enum: ['admin', 'cliente'], default: 'cliente', index: true },
    activo: { type: Boolean, default: true },
    ultimoLoginAt: { type: Date },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Cliente || mongoose.model('Cliente', clienteSchema);
