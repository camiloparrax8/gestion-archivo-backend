const AppError = require('../utils/AppError');

/**
 * Lógica de negocio de productos (sustituir por repositorio/ORM cuando exista persistencia).
 */
async function listProducts() {
  return [];
}

async function getProductById(id) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId < 1) {
    throw new AppError('Identificador de producto inválido', 400);
  }
  return null;
}

module.exports = { listProducts, getProductById };
