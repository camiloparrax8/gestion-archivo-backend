const productService = require('../services/productService');
const AppError = require('../utils/AppError');

async function list(req, res) {
  const data = await productService.listProducts();
  res.json({ data });
}

async function getById(req, res) {
  const product = await productService.getProductById(req.params.id);
  if (!product) {
    throw new AppError('Producto no encontrado', 404);
  }
  res.json({ data: product });
}

module.exports = { list, getById };
