const apiInfoService = require('../services/apiInfoService');

/**
 * @openapi
 * /:
 *   get:
 *     tags: [API]
 *     summary: Metadata de la API
 *     responses:
 *       200: { description: OK }
 */
function getRoot(req, res) {
  res.json(apiInfoService.getApiMetadata());
}

module.exports = { getRoot };
