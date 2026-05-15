/**
 * Migración / semilla: usuario administrador en MongoDB (colección Cliente, rol admin).
 *
 * Crear (requiere MONGODB_URI en .env o entorno):
 *   SEED_ADMIN_EMAIL=admin@empresa.com SEED_ADMIN_PASSWORD='ContraseñaSegura' npm run migrate:admin
 *
 * Actualizar contraseña de un admin ya existente (mismo email):
 *   SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD='...' SEED_ADMIN_UPDATE_PASSWORD=true npm run migrate:admin
 */
require('dotenv').config({ override: true });

const bcrypt = require('bcryptjs');
const config = require('../config');
const { conectarMongo } = require('../db/mongoose');
const Cliente = require('../models/Cliente');

async function main() {
  if (!config.mongodbUri) {
    console.error('Error: MONGODB_URI es obligatoria para migrar el usuario admin.');
    process.exit(1);
  }

  const email = String(process.env.SEED_ADMIN_EMAIL || '')
    .trim()
    .toLowerCase();
  const password = String(process.env.SEED_ADMIN_PASSWORD || '');
  const nombre = String(process.env.SEED_ADMIN_NAME || 'Administrador').trim() || 'Administrador';
  const updatePassword =
    String(process.env.SEED_ADMIN_UPDATE_PASSWORD || '').toLowerCase() === 'true';

  if (!email) {
    console.error('Error: defina SEED_ADMIN_EMAIL (correo del administrador).');
    process.exit(1);
  }

  await conectarMongo();

  const existing = await Cliente.findOne({ email }).select('+passwordHash');

  if (existing) {
    const rol = existing.rol || 'cliente';
    if (rol !== 'admin') {
      console.error(
        `Error: el email ${email} ya existe con rol "${rol}". No se modifica. Use otro email o elimine ese registro.`,
      );
      process.exit(1);
    }

    let changed = false;

    if (updatePassword) {
      if (password.length < 8) {
        console.error(
          'Error: SEED_ADMIN_PASSWORD debe tener al menos 8 caracteres cuando SEED_ADMIN_UPDATE_PASSWORD=true.',
        );
        process.exit(1);
      }
      existing.passwordHash = await bcrypt.hash(password, 12);
      changed = true;
    }

    if (nombre && existing.nombre !== nombre) {
      existing.nombre = nombre;
      changed = true;
    }

    if (!existing.activo) {
      existing.activo = true;
      changed = true;
    }

    if (changed) {
      await existing.save();
      console.log(`OK: usuario admin actualizado (${email}).`);
    } else {
      console.log(`OK: usuario admin ya existe sin cambios (${email}).`);
    }
    process.exit(0);
  }

  if (password.length < 8) {
    console.error(
      'Error: SEED_ADMIN_PASSWORD es obligatoria (mínimo 8 caracteres) para crear el admin inicial.',
    );
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const doc = await Cliente.create({
    email,
    nombre,
    passwordHash,
    rol: 'admin',
    activo: true,
  });
  console.log(`OK: usuario admin creado (${email}, publicId: ${doc.publicId}).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
