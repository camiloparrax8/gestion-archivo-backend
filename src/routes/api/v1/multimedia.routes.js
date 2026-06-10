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
 * /v1/multimedia/publico/{publicId}:
 *   get:
 *     tags: [Multimedia]
 *     summary: Lectura pública estable por publicId (visibilidad publico)
 *     description: Sin API key. Solo archivos marcados como publico en MongoDB.
 *     parameters:
 *       - in: path
 *         name: publicId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: size
 *         required: false
 *         schema:
 *           type: string
 *           enum: [thumb, medium]
 *         description: Variante optimizada WebP (fallback al original si no existe)
 *     responses:
 *       200: { description: Stream del archivo }
 *       302: { description: Redirección a URL pública S3 }
 *       404: { description: No encontrado o no público }
 *
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
 *     description: |
 *       Integraciones con API Key. Body con rutaInternaCliente (5 o 6 segmentos).
 *       El cliente en MongoDB se resuelve desde la API key; no envíe clienteId.
 *     security:
 *       - apiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MultimediaUrlFirmaRequest'
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MultimediaUrlFirmaResponse'
 *       401: { description: API key requerida/no válida }
 *       403: { description: Sin permiso read o fuera de prefijos }
 *
 * /v1/multimedia/{contexto}/{entidad}/{id}/{tipo}:
 *   get:
 *     tags: [Multimedia]
 *     summary: Listar multimedia por contexto
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/MultimediaContexto'
 *       - $ref: '#/components/parameters/MultimediaEntidad'
 *       - $ref: '#/components/parameters/MultimediaResourceId'
 *       - $ref: '#/components/parameters/MultimediaTipo'
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MultimediaListResponse'
 *
 *   post:
 *     tags: [Multimedia]
 *     summary: Subir archivo multimedia (multipart)
 *     description: |
 *       Campo multipart obligatorio **archivo**. El segmento {id} es el ID del recurso
 *       en el sistema que integra (productId, userId, etc.), no el id del cliente en MongoDB.
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/MultimediaContexto'
 *       - $ref: '#/components/parameters/MultimediaEntidad'
 *       - $ref: '#/components/parameters/MultimediaResourceId'
 *       - $ref: '#/components/parameters/MultimediaTipo'
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [archivo]
 *             properties:
 *               archivo:
 *                 type: string
 *                 format: binary
 *               visibilidad:
 *                 type: string
 *                 enum: [publico, privado, public]
 *     responses:
 *       201:
 *         description: Creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MultimediaUploadResponse'
 *       403: { description: Sin permiso write o fuera de prefijos }
 *
 * /v1/multimedia/{contexto}/{entidad}/{id}/{tipo}/{archivo}:
 *   delete:
 *     tags: [Multimedia]
 *     summary: Eliminar archivo multimedia
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/MultimediaContexto'
 *       - $ref: '#/components/parameters/MultimediaEntidad'
 *       - $ref: '#/components/parameters/MultimediaResourceId'
 *       - $ref: '#/components/parameters/MultimediaTipo'
 *       - $ref: '#/components/parameters/MultimediaArchivoNombre'
 *     responses:
 *       200: { description: OK }
 *       403: { description: Sin permiso delete o fuera de prefijos }
 */
router.get(
  '/publico/:publicId',
  asyncHandler(multimediaController.accesoPublicoPorPublicId),
);

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
