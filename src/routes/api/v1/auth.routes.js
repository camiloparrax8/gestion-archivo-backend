const express = require('express');
const asyncHandler = require('../../../utils/asyncHandler');
const requerirMasterKey = require('../../../middleware/requerirMasterKey');
const autenticarJwt = require('../../../middleware/autenticarJwt');
const authController = require('../../../controllers/authController');

const router = express.Router();

/**
 * @openapi
 * /v1/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Registrar usuario (bootstrap)
 *     description: Requiere `X-Master-Key` para evitar registro público.
 *     security:
 *       - masterKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, rol]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *               rol: { type: string, enum: [admin, cliente] }
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *         description: Master key no válida
 *       503:
 *         description: MASTER_API_KEY no configurada
 *
 * /v1/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login (JWT)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *         description: Credenciales inválidas
 *
 * /v1/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Perfil del usuario autenticado
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *         description: Token inválido o expirado
 */
router.post('/register', requerirMasterKey, express.json(), asyncHandler(authController.register));
router.post('/register-client', express.json(), asyncHandler(authController.registerClient));
router.post('/login', express.json(), asyncHandler(authController.login));
router.get('/me', autenticarJwt, asyncHandler(authController.me));

module.exports = router;
