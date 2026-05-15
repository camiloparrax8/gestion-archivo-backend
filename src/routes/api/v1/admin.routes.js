const express = require('express');
const asyncHandler = require('../../../utils/asyncHandler');
const autenticarJwt = require('../../../middleware/autenticarJwt');
const requerirRol = require('../../../middleware/requerirRol');
const clienteAdminController = require('../../../controllers/clienteAdminController');

const router = express.Router();

router.use(autenticarJwt, requerirRol('admin'));

/**
 * @openapi
 * /v1/admin/clientes:
 *   get:
 *     tags: [Admin]
 *     summary: Listar clientes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Búsqueda por email, nombre, teléfono, tipo o número de documento
 *       - in: query
 *         name: activo
 *         schema: { type: boolean }
 *         description: Filtrar por activo (true/false)
 *     responses:
 *       200:
 *         description: OK — cada elemento incluye telefono, tipoDocumento, numeroDocumento y activo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClienteAdminListResponse'
 *       401: { description: No autorizado }
 *       403: { description: Requiere rol admin }
 *   post:
 *     tags: [Admin]
 *     summary: Crear cliente
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       description: 'Obligatorio también enviar activo o estado (booleano, true=activo).'
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, nombre, telefono, tipoDocumento, numeroDocumento]
 *             properties:
 *               email: { type: string, format: email }
 *               nombre: { type: string }
 *               telefono: { type: string, description: 'Teléfono de contacto' }
 *               phone: { type: string, description: 'Alias de telefono' }
 *               estado: { type: boolean, description: 'Activo (true) o inactivo (false); obligatorio si no envía activo' }
 *               activo: { type: boolean, description: 'Obligatorio si no envía estado' }
 *               tipoDocumento: { type: string, description: 'Ej. CC, CE, NIT, PAS' }
 *               documentType: { type: string, description: 'Alias de tipoDocumento' }
 *               numeroDocumento: { type: string, description: 'Número de documento de identidad' }
 *     responses:
 *       201:
 *         description: Creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClienteAdminOneResponse'
 *       400: { description: Faltan campos obligatorios o datos inválidos }
 *       409: { description: Ya existe un cliente con ese email }
 *
 * /v1/admin/clientes/{clienteId}:
 *   get:
 *     tags: [Admin]
 *     summary: Obtener un cliente por ObjectId o publicId
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clienteId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK — incluye telefono, tipoDocumento, numeroDocumento y activo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClienteAdminOneResponse'
 *       401: { description: No autorizado }
 *       403: { description: Requiere rol admin }
 *       404: { description: Cliente no encontrado }
 *   put:
 *     tags: [Admin]
 *     summary: Actualizar cliente (parcial)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clienteId
 *         required: true
 *         schema: { type: string }
 *         description: ObjectId o publicId (UUID)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string, format: email }
 *               nombre: { type: string }
 *               telefono: { type: string }
 *               phone: { type: string, description: 'Alias de telefono' }
 *               tipoDocumento: { type: string }
 *               documentType: { type: string }
 *               numeroDocumento: { type: string }
 *               estado: { type: boolean }
 *               activo: { type: boolean }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClienteAdminOneResponse'
 *       400: { description: Datos inválidos }
 *       404: { description: Cliente no encontrado }
 *       409: { description: Email duplicado }
 *
 * /v1/admin/clientes/{clienteId}/llaves:
 *   get:
 *     tags: [Admin]
 *     summary: Listar llaves API de un cliente
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clienteId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *   post:
 *     tags: [Admin]
 *     summary: Crear llave API para un cliente
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clienteId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre: { type: string }
 *               prefijos:
 *                 type: array
 *                 items: { type: string }
 *               permisos:
 *                 type: array
 *                 items: { type: string, enum: [read, write, delete] }
 *     responses:
 *       200: { description: OK }
 *
 * /v1/admin/clientes/{clienteId}/llaves/{llaveId}:
 *   delete:
 *     tags: [Admin]
 *     summary: Eliminar una API key del cliente
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clienteId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: llaveId
 *         required: true
 *         schema: { type: string }
 *         description: publicId (UUID) o ObjectId de la llave
 *     responses:
 *       200: { description: OK }
 *       401: { description: No autorizado }
 *       403: { description: Requiere rol admin }
 *       404: { description: Cliente o API key no encontrada }
 *
 * /v1/admin/clientes/{clienteId}/llaves/{llaveId}/estado:
 *   patch:
 *     tags: [Admin]
 *     summary: Activar/desactivar una llave
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clienteId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: llaveId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [activo]
 *             properties:
 *               activo: { type: boolean }
 *     responses:
 *       200: { description: OK }
 *
 * /v1/admin/clientes/{clienteId}/llaves/{llaveId}/rotar:
 *   post:
 *     tags: [Admin]
 *     summary: Rotar una llave (genera nueva clave)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clienteId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: llaveId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */
router.get('/clientes', asyncHandler(clienteAdminController.listarClientes));
router.post('/clientes', asyncHandler(clienteAdminController.crearCliente));
router.get('/clientes/:clienteId', asyncHandler(clienteAdminController.obtenerCliente));
router.put('/clientes/:clienteId', asyncHandler(clienteAdminController.actualizarCliente));
router.post('/clientes/:clienteId/llaves', asyncHandler(clienteAdminController.crearLlave));
router.get('/clientes/:clienteId/llaves', asyncHandler(clienteAdminController.listarLlaves));
router.delete(
  '/clientes/:clienteId/llaves/:llaveId',
  asyncHandler(clienteAdminController.eliminarLlave),
);
router.patch(
  '/clientes/:clienteId/llaves/:llaveId/estado',
  express.json(),
  asyncHandler(clienteAdminController.actualizarEstadoLlave),
);
router.post(
  '/clientes/:clienteId/llaves/:llaveId/rotar',
  express.json(),
  asyncHandler(clienteAdminController.rotarLlave),
);

module.exports = router;
