const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

/** @type {import('swagger-jsdoc').Options} */
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Guven File API',
      version: '1.0.0',
      description:
        'API de gestión de archivos: integraciones con API Key (X-API-Key) y panel web con JWT (Bearer). Misma estructura de rutas lógicas contexto/entidad/id/tipo.',
      contact: { name: 'Guven File' },
    },
    servers: [{ url: '/api', description: 'Servidor principal' }],
    tags: [
      { name: 'Health', description: 'Endpoints de salud' },
      { name: 'API', description: 'Información de API' },
      { name: 'Auth', description: 'Autenticación de usuarios (JWT)' },
      { name: 'Admin', description: 'Administración (solo admin)' },
      { name: 'Client', description: 'Autoservicio del cliente (rol cliente)' },
      { name: 'Multimedia', description: 'Multimedia con API Key (integraciones)' },
      { name: 'MultimediaPanel', description: 'Multimedia con JWT (panel web, sin API key obligatoria)' },
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
        MultimediaUrlFirmaRequest: {
          type: 'object',
          required: ['rutaInternaCliente'],
          properties: {
            rutaInternaCliente: {
              type: 'string',
              description:
                'Ruta lógica del archivo (5 o 6 segmentos). Ej. orion/productos/42/galeria/jpeg/foto.jpg. No incluye clients/{mongoId}/.',
              example: 'orion/productos/674a1b2c3d4e5f678901234/galeria/jpeg/1678900000-abc.jpg',
            },
            segundos: {
              type: 'integer',
              description: 'TTL del enlace (máx. SIGNED_URL_EXPIRES_SECONDS)',
              example: 900,
            },
          },
        },
        MultimediaUrlFirmaResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                url: { type: 'string', format: 'uri' },
                expiraEnSegundos: { type: 'integer' },
              },
            },
          },
        },
        MultimediaArchivoItem: {
          type: 'object',
          properties: {
            nombre: { type: 'string' },
            nombreOriginal: { type: 'string' },
            rutaRelativa: {
              type: 'string',
              description: 'Ruta física bajo storage/ o S3 (incluye clients/{id}/…)',
            },
            rutaInternaCliente: {
              type: 'string',
              description: 'Ruta lógica estable para url-firma y metadatos',
            },
            subcarpeta: { type: 'string', enum: ['pdf', 'jpeg', 'png', 'gif', 'webp'] },
            mime: { type: 'string' },
            tamaño: { type: 'integer' },
            modificadoEn: { type: 'string', format: 'date-time' },
            visibilidad: { type: 'string', enum: ['publico', 'privado'] },
            publicId: {
              type: 'string',
              format: 'uuid',
              description: 'Identificador estable del archivo público en MongoDB',
            },
            rutaPublica: {
              type: 'string',
              description:
                'Ruta relativa sin host (ej. /api/v1/multimedia/publico/{publicId}) para concatenar con PUBLIC_BASE_URL',
            },
            url: { type: 'string', format: 'uri', nullable: true },
            accesoPrivado: { type: 'boolean' },
          },
        },
        MultimediaUploadResponse: {
          type: 'object',
          properties: {
            data: { $ref: '#/components/schemas/MultimediaArchivoItem' },
          },
        },
        MultimediaListResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/MultimediaArchivoItem' },
            },
          },
        },
        MultimediaExplorerItem: {
          type: 'object',
          properties: {
            kind: { type: 'string', enum: ['folder', 'file'] },
            name: { type: 'string' },
            path: { type: 'string' },
            folder: { type: 'string' },
            rutaInternaCliente: { type: 'string' },
            rutaRelativa: { type: 'string' },
            contexto: { type: 'string' },
            permissions: { type: 'string' },
            url: { type: 'string', format: 'uri', nullable: true },
            nombreOriginal: { type: 'string' },
            mime: { type: 'string' },
            subcarpeta: { type: 'string' },
            tamaño: { type: 'integer' },
            modificadoEn: { type: 'string', format: 'date-time' },
            visibilidad: { type: 'string', enum: ['publico', 'privado'] },
            publicId: { type: 'string', format: 'uuid' },
            rutaPublica: {
              type: 'string',
              description: 'Ruta relativa /api/v1/multimedia/publico/{publicId} (solo si visibilidad=publico)',
            },
            accesoPrivado: { type: 'boolean' },
          },
        },
        MultimediaBrowseResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                prefix: { type: 'string' },
                contexto: { type: 'string', nullable: true },
                items: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/MultimediaExplorerItem' },
                },
                llave: {
                  type: 'object',
                  nullable: true,
                  description: 'Presente solo si se envió X-Llave-Id',
                },
              },
            },
          },
        },
      },
      parameters: {
        MultimediaContexto: {
          in: 'path',
          name: 'contexto',
          required: true,
          schema: { type: 'string' },
          description: 'Slug de aplicación (ej. orion, guven). No es el id del cliente en MongoDB.',
        },
        MultimediaEntidad: {
          in: 'path',
          name: 'entidad',
          required: true,
          schema: { type: 'string' },
          description: 'Segmento de negocio (productos, usuarios, sellers, …).',
        },
        MultimediaResourceId: {
          in: 'path',
          name: 'id',
          required: true,
          schema: { type: 'string' },
          description:
            'ID del recurso en el sistema integrador (productId, sellerId, userId). No es el clienteId de gestión de archivos (ese lo resuelve la API key).',
        },
        MultimediaTipo: {
          in: 'path',
          name: 'tipo',
          required: true,
          schema: {
            type: 'string',
            enum: ['perfil', 'logo', 'galeria', 'documentos', 'marca', 'otros'],
          },
        },
        MultimediaArchivoNombre: {
          in: 'path',
          name: 'archivo',
          required: true,
          schema: { type: 'string' },
          description: 'Nombre de archivo devuelto al subir o listar',
        },
        MultimediaBrowsePrefix: {
          in: 'query',
          name: 'prefix',
          schema: { type: 'string' },
          description: 'Prefijo lógico de carpeta (ej. orion/productos)',
        },
        LlaveIdOpcional: {
          in: 'header',
          name: 'X-Llave-Id',
          schema: { type: 'string' },
          description:
            'Opcional en panel JWT: publicId de una API key para filtrar browse y aplicar prefijos. No obligatorio para subir.',
        },
        AdminClienteId: {
          in: 'path',
          name: 'clienteId',
          required: true,
          schema: { type: 'string' },
          description: 'publicId (UUID) u ObjectId del cliente',
        },
      },
    },
  },
  apis: [
    path.join(__dirname, '../app.js'),
    path.join(__dirname, '../routes/**/*.js'),
    path.join(__dirname, '../controllers/**/*.js'),
    path.join(__dirname, '../docs/openapi-multimedia-panel.js'),
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerSpec };

