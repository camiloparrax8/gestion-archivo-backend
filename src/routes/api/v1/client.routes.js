const express = require('express');
const asyncHandler = require('../../../utils/asyncHandler');
const autenticarJwt = require('../../../middleware/autenticarJwt');
const requerirRol = require('../../../middleware/requerirRol');
const clienteSelfServiceController = require('../../../controllers/clienteSelfServiceController');
const multimediaController = require('../../../controllers/multimediaController');
const validarParametrosMultimedia = require('../../../middleware/validarParametrosMultimedia');
const { subirUnArchivo } = require('../../../middleware/multerMultimedia');
const requerirPermiso = require('../../../middleware/requerirPermiso');
const {
  validarAlcanceMultimedia,
  validarAlcanceBrowse,
} = require('../../../middleware/validarAlcanceMultimedia');
const {
  validarAlcanceMultimediaPanel,
  validarAlcanceBrowsePanel,
  validarAlcanceUrlFirmaPanel,
} = require('../../../middleware/validarAlcancePanelJwt');
const {
  prepararAuthMultimediaCliente,
  adjuntarLlavePanelOpcional,
} = require('../../../middleware/prepararAuthMultimediaPanel');

const router = express.Router();

router.use(autenticarJwt, requerirRol('cliente'));

/**
 * @openapi
 * /v1/client/me/apikeys:
 *   get:
 *     tags: [Client]
 *     summary: Listar mis llaves API
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: OK }
 *   post:
 *     tags: [Client]
 *     summary: Crear una llave API para mi cliente
 *     security:
 *       - bearerAuth: []
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
 * /v1/client/me/apikeys/{llaveId}:
 *   delete:
 *     tags: [Client]
 *     summary: Eliminar una de mis llaves API
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: llaveId
 *         required: true
 *         schema: { type: string }
 *         description: publicId (UUID) o ObjectId de la llave
 *     responses:
 *       200: { description: OK }
 *       404: { description: API key no encontrada }
 *
 * /v1/client/me/apikeys/{llaveId}/estado:
 *   patch:
 *     tags: [Client]
 *     summary: Activar/desactivar una de mis llaves
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 * /v1/client/me/apikeys/{llaveId}/rotar:
 *   post:
 *     tags: [Client]
 *     summary: Rotar una de mis llaves
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: llaveId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */
router.get('/me/apikeys', asyncHandler(clienteSelfServiceController.listarMisLlaves));
router.post('/me/apikeys', express.json(), asyncHandler(clienteSelfServiceController.crearMiLlave));
router.delete('/me/apikeys/:llaveId', asyncHandler(clienteSelfServiceController.eliminarMiLlave));
router.patch(
  '/me/apikeys/:llaveId/estado',
  express.json(),
  asyncHandler(clienteSelfServiceController.actualizarEstadoMiLlave),
);
router.post(
  '/me/apikeys/:llaveId/rotar',
  express.json(),
  asyncHandler(clienteSelfServiceController.rotarMiLlave),
);

router.post(
  '/me/multimedia/url-firma',
  prepararAuthMultimediaCliente,
  adjuntarLlavePanelOpcional,
  validarAlcanceUrlFirmaPanel,
  requerirPermiso('read'),
  express.json(),
  asyncHandler(multimediaController.solicitarUrlFirma),
);

router.get(
  '/me/multimedia/browse',
  prepararAuthMultimediaCliente,
  adjuntarLlavePanelOpcional,
  validarAlcanceBrowse,
  validarAlcanceBrowsePanel,
  asyncHandler(multimediaController.explorar),
);

router.delete(
  '/me/multimedia/browse',
  prepararAuthMultimediaCliente,
  requerirPermiso('delete'),
  validarAlcanceBrowsePanel,
  asyncHandler(multimediaController.eliminarCarpeta),
);

router.get(
  '/me/multimedia/:contexto/:entidad/:id/:tipo',
  prepararAuthMultimediaCliente,
  adjuntarLlavePanelOpcional,
  validarParametrosMultimedia,
  asyncHandler(multimediaController.listar),
);

router.post(
  '/me/multimedia/:contexto/:entidad/:id/:tipo',
  prepararAuthMultimediaCliente,
  adjuntarLlavePanelOpcional,
  requerirPermiso('write'),
  validarAlcanceMultimedia,
  validarAlcanceMultimediaPanel,
  validarParametrosMultimedia,
  subirUnArchivo,
  asyncHandler(multimediaController.subir),
);

router.delete(
  '/me/multimedia/:contexto/:entidad/:id/:tipo/:archivo',
  prepararAuthMultimediaCliente,
  adjuntarLlavePanelOpcional,
  requerirPermiso('delete'),
  validarAlcanceMultimedia,
  validarAlcanceMultimediaPanel,
  validarParametrosMultimedia,
  asyncHandler(multimediaController.eliminar),
);

module.exports = router;
