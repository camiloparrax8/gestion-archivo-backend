const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');

const config = require('./config');
const { buildCorsOptions } = require('./config/cors');
const { swaggerSpec } = require('./config/swagger');
const routes = require('./routes');
const healthController = require('./controllers/healthController');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const ensureServerReadyMiddleware = require('./middleware/ensureServerReady');

const app = express();

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Health check
 *     responses:
 *       200: { description: OK }
 */
app.use(helmet());
app.use(cors(buildCorsOptions()));
app.use(morgan(config.isProduction ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(ensureServerReadyMiddleware);

app.get('/health', healthController.health);

app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Orion API - Documentación',
    customCss: '.swagger-ui .topbar { display: none }',
  }),
);

app.get('/api/docs.json', (_req, res) => {
  res.json(swaggerSpec);
});

const carpetaPublicaMedia =
  config.storageDriver !== 's3' && !config.mongodbUri;

if (carpetaPublicaMedia) {
  app.use('/media', express.static(config.storageDir));
}

app.use(routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
