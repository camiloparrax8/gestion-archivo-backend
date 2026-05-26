/**
 * OpenAPI: rutas multimedia del panel (JWT). Incluido en swagger-jsdoc vía src/config/swagger.js
 */

/**
 * @openapi
 * /v1/client/me/multimedia/url-firma:
 *   post:
 *     tags: [MultimediaPanel, Client]
 *     summary: Solicitar URL de lectura (panel JWT)
 *     description: |
 *       Igual que POST /v1/multimedia/url-firma pero con sesión del gestor.
 *       No requiere API key; el tenant se deduce del JWT.
 *       Opcional X-Llave-Id para validar alcance si se envía una llave.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/LlaveIdOpcional'
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
 *       401: { description: JWT inválido }
 *       404: { description: Archivo no encontrado }
 *
 * /v1/client/me/multimedia/browse:
 *   get:
 *     tags: [MultimediaPanel, Client]
 *     summary: Explorar carpetas y archivos (panel JWT)
 *     description: |
 *       Explorador tipo storage browser. No requiere API key.
 *       Query opcional prefix y llaveId (header X-Llave-Id o query llaveId) para filtrar por prefijos de una llave.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/MultimediaBrowsePrefix'
 *       - $ref: '#/components/parameters/LlaveIdOpcional'
 *       - in: query
 *         name: llaveId
 *         schema: { type: string }
 *         description: Alias de X-Llave-Id (publicId de la llave)
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MultimediaBrowseResponse'
 *       401: { description: JWT inválido }
 *
 * /v1/client/me/multimedia/{contexto}/{entidad}/{id}/{tipo}:
 *   get:
 *     tags: [MultimediaPanel, Client]
 *     summary: Listar archivos en carpeta (panel JWT)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/MultimediaContexto'
 *       - $ref: '#/components/parameters/MultimediaEntidad'
 *       - $ref: '#/components/parameters/MultimediaResourceId'
 *       - $ref: '#/components/parameters/MultimediaTipo'
 *       - $ref: '#/components/parameters/LlaveIdOpcional'
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MultimediaListResponse'
 *   post:
 *     tags: [MultimediaPanel, Client]
 *     summary: Subir archivo (panel JWT, sin API key obligatoria)
 *     description: |
 *       El cliente del JWT queda implícito; no envíe clienteId en la URL.
 *       El segmento {id} es el ID del recurso en su aplicación (producto, usuario, etc.).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/MultimediaContexto'
 *       - $ref: '#/components/parameters/MultimediaEntidad'
 *       - $ref: '#/components/parameters/MultimediaResourceId'
 *       - $ref: '#/components/parameters/MultimediaTipo'
 *       - $ref: '#/components/parameters/LlaveIdOpcional'
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
 *       400: { description: Validación o multipart inválido }
 *       401: { description: JWT inválido }
 *
 * /v1/client/me/multimedia/{contexto}/{entidad}/{id}/{tipo}/{archivo}:
 *   delete:
 *     tags: [MultimediaPanel, Client]
 *     summary: Eliminar archivo (panel JWT)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/MultimediaContexto'
 *       - $ref: '#/components/parameters/MultimediaEntidad'
 *       - $ref: '#/components/parameters/MultimediaResourceId'
 *       - $ref: '#/components/parameters/MultimediaTipo'
 *       - $ref: '#/components/parameters/MultimediaArchivoNombre'
 *       - $ref: '#/components/parameters/LlaveIdOpcional'
 *     responses:
 *       200: { description: OK }
 *       401: { description: JWT inválido }
 *       404: { description: No encontrado }
 *
 * /v1/admin/clientes/{clienteId}/multimedia/url-firma:
 *   post:
 *     tags: [MultimediaPanel, Admin]
 *     summary: URL de lectura para un cliente (admin JWT)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/AdminClienteId'
 *       - $ref: '#/components/parameters/LlaveIdOpcional'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MultimediaUrlFirmaRequest'
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MultimediaUrlFirmaResponse'
 *
 * /v1/admin/clientes/{clienteId}/multimedia/browse:
 *   get:
 *     tags: [MultimediaPanel, Admin]
 *     summary: Explorar almacenamiento de un cliente (admin JWT)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/AdminClienteId'
 *       - $ref: '#/components/parameters/MultimediaBrowsePrefix'
 *       - $ref: '#/components/parameters/LlaveIdOpcional'
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MultimediaBrowseResponse'
 *
 * /v1/admin/clientes/{clienteId}/multimedia/{contexto}/{entidad}/{id}/{tipo}:
 *   get:
 *     tags: [MultimediaPanel, Admin]
 *     summary: Listar carpeta de un cliente (admin JWT)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/AdminClienteId'
 *       - $ref: '#/components/parameters/MultimediaContexto'
 *       - $ref: '#/components/parameters/MultimediaEntidad'
 *       - $ref: '#/components/parameters/MultimediaResourceId'
 *       - $ref: '#/components/parameters/MultimediaTipo'
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MultimediaListResponse'
 *   post:
 *     tags: [MultimediaPanel, Admin]
 *     summary: Subir archivo en nombre de un cliente (admin JWT)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/AdminClienteId'
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
 *     responses:
 *       201:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MultimediaUploadResponse'
 *
 * /v1/admin/clientes/{clienteId}/multimedia/{contexto}/{entidad}/{id}/{tipo}/{archivo}:
 *   delete:
 *     tags: [MultimediaPanel, Admin]
 *     summary: Eliminar archivo de un cliente (admin JWT)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/AdminClienteId'
 *       - $ref: '#/components/parameters/MultimediaContexto'
 *       - $ref: '#/components/parameters/MultimediaEntidad'
 *       - $ref: '#/components/parameters/MultimediaResourceId'
 *       - $ref: '#/components/parameters/MultimediaTipo'
 *       - $ref: '#/components/parameters/MultimediaArchivoNombre'
 *     responses:
 *       200: { description: OK }
 */

module.exports = {};
