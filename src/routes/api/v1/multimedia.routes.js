const express = require('express');
const multimediaController = require('../../../controllers/multimediaController');
const asyncHandler = require('../../../utils/asyncHandler');
const autenticarApiKey = require('../../../middleware/autenticarApiKey');
const requerirPermiso = require('../../../middleware/requerirPermiso');
const { validarAlcanceMultimedia } = require('../../../middleware/validarAlcanceMultimedia');
const validarParametrosMultimedia = require('../../../middleware/validarParametrosMultimedia');
const { subirUnArchivo } = require('../../../middleware/multerMultimedia');

const router = express.Router();

/**
 * @openapi
 * /v1/multimedia/acceso/{token}:
 *   get:
 *     tags: [Multimedia]
 *     summary: Acceso local por token (solo almacenamiento local con MongoDB)
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       302: { description: Redirección/stream del archivo }
 *       401: { description: Token inválido/expirado }
 *
 * /v1/multimedia/url-firma:
 *   post:
 *     tags: [Multimedia]
 *     summary: Solicitar URL firmada (S3) o token de acceso (local)
 *     security:
 *       - apiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contexto: { type: string }
 *               entidad: { type: string }
 *               id: { type: string }
 *               tipo: { type: string }
 *               archivo: { type: string, description: "Nombre del archivo (cuando aplique)" }
 *     responses:
 *       200: { description: OK }
 *       401: { description: API key requerida/no válida }
 *
 * /v1/multimedia/{contexto}/{entidad}/{id}/{tipo}:
 *   get:
 *     tags: [Multimedia]
 *     summary: Listar multimedia por contexto
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: contexto
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: entidad
 *         required: true
 *         schema:
 *           type: string
 *           enum: [usuarios, productos, pedidos, sellers]
 *         description: "usuarios y sellers usan id UUID; productos y pedidos id numérico"
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: "UUID si entidad es usuarios o sellers; numérico si productos o pedidos"
 *       - in: path
 *         name: tipo
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *
 *   post:
 *     tags: [Multimedia]
 *     summary: Subir archivo multimedia (multipart)
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: contexto
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: entidad
 *         required: true
 *         schema:
 *           type: string
 *           enum: [usuarios, productos, pedidos, sellers]
 *         description: "usuarios y sellers usan id UUID; productos y pedidos id numérico"
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: "UUID si entidad es usuarios o sellers; numérico si productos o pedidos"
 *       - in: path
 *         name: tipo
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200: { description: OK }
 *
 * /v1/multimedia/{contexto}/{entidad}/{id}/{tipo}/{archivo}:
 *   delete:
 *     tags: [Multimedia]
 *     summary: Eliminar archivo multimedia
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: contexto
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: entidad
 *         required: true
 *         schema:
 *           type: string
 *           enum: [usuarios, productos, pedidos, sellers]
 *         description: "usuarios y sellers usan id UUID; productos y pedidos id numérico"
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: "UUID si entidad es usuarios o sellers; numérico si productos o pedidos"
 *       - in: path
 *         name: tipo
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: archivo
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */
router.get(
  '/acceso/:token',
  asyncHandler(multimediaController.accesoLocalPorToken),
);

router.post(
  '/url-firma',
  autenticarApiKey,
  requerirPermiso('read'),
  express.json(),
  asyncHandler(multimediaController.solicitarUrlFirma),
);

router.get(
  '/:contexto/:entidad/:id/:tipo',
  autenticarApiKey,
  requerirPermiso('read'),
  validarAlcanceMultimedia,
  validarParametrosMultimedia,
  asyncHandler(multimediaController.listar),
);

router.post(
  '/:contexto/:entidad/:id/:tipo',
  autenticarApiKey,
  requerirPermiso('write'),
  validarAlcanceMultimedia,
  validarParametrosMultimedia,
  subirUnArchivo,
  asyncHandler(multimediaController.subir),
);

router.delete(
  '/:contexto/:entidad/:id/:tipo/:archivo',
  autenticarApiKey,
  requerirPermiso('delete'),
  validarAlcanceMultimedia,
  validarParametrosMultimedia,
  asyncHandler(multimediaController.eliminar),
);

module.exports = router;
