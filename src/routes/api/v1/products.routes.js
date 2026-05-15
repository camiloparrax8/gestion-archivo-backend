const express = require('express');
const productController = require('../../../controllers/productController');
const asyncHandler = require('../../../utils/asyncHandler');

const router = express.Router();

/**
 * @openapi
 * /v1/products:
 *   get:
 *     tags: [Products]
 *     summary: Listar productos
 *     responses:
 *       200: { description: OK }
 *
 * /v1/products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Obtener producto por id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *       404: { description: No encontrado }
 */
router.get('/', asyncHandler(productController.list));
router.get('/:id', asyncHandler(productController.getById));

module.exports = router;
