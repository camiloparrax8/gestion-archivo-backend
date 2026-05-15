const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

/** @type {import('swagger-jsdoc').Options} */
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Orion Marketplace File Management API',
      version: '1.0.0',
      description: 'API de gestión de archivos/multimedia, clientes y llaves API.',
      contact: { name: 'Equipo Orion' },
    },
    servers: [{ url: '/api', description: 'Servidor principal' }],
    tags: [
      { name: 'Health', description: 'Endpoints de salud' },
      { name: 'API', description: 'Información de API' },
      { name: 'Auth', description: 'Autenticación de usuarios (JWT)' },
      { name: 'Admin', description: 'Administración (solo admin)' },
      { name: 'Client', description: 'Autoservicio del cliente (rol cliente)' },
      { name: 'Multimedia', description: 'Gestión de multimedia' },
      { name: 'Products', description: 'Productos (stub)' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
        masterKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Master-Key',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            statusCode: { type: 'integer' },
            details: { type: 'object', additionalProperties: true },
          },
        },
        ClienteAdmin: {
          type: 'object',
          description:
            'Cliente en admin: siempre incluye telefono, tipoDocumento, numeroDocumento y activo (null en registros antiguos sin dato).',
          properties: {
            _id: { type: 'string' },
            publicId: { type: 'string' },
            email: { type: 'string' },
            nombre: { type: 'string' },
            telefono: { type: 'string', nullable: true },
            tipoDocumento: { type: 'string', nullable: true },
            numeroDocumento: { type: 'string', nullable: true },
            activo: { type: 'boolean', nullable: true },
            rol: { type: 'string', enum: ['admin', 'cliente'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        ClienteAdminListResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/ClienteAdmin' },
            },
          },
        },
        ClienteAdminOneResponse: {
          type: 'object',
          properties: {
            data: { $ref: '#/components/schemas/ClienteAdmin' },
          },
        },
      },
    },
  },
  apis: [
    path.join(__dirname, '../app.js'),
    path.join(__dirname, '../routes/**/*.js'),
    path.join(__dirname, '../controllers/**/*.js'),
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerSpec };

