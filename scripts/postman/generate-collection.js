/**
 * Genera una Postman Collection v2.1 a partir del OpenAPI (swagger-jsdoc).
 * Uso: npm run postman
 */

const fs = require('fs');
const path = require('path');

const { swaggerSpec } = require('../../src/config/swagger');

const BASE_URL_VAR = '{{base_url}}';
const SUPPORTED_METHODS = ['get', 'post', 'put', 'patch', 'delete'];

/** Campo multipart real del middleware (spec puede decir "file"). */
const MULTIPART_FILE_FIELD = 'archivo';

/**
 * @param {string} openapiPath p. ej. "/v1/auth/login", "/health", "/"
 * @returns {{ raw: string, host: string[], path: string[] }}
 */
function buildPostmanUrl(openapiPath) {
  const toSegment = (s) => (s.startsWith('{') ? `:${s.slice(1, -1)}` : s);
  const segments = openapiPath.split('/').filter(Boolean).map(toSegment);

  if (openapiPath === '/health') {
    return {
      raw: `${BASE_URL_VAR}/health`,
      host: [BASE_URL_VAR],
      path: ['health'],
    };
  }

  if (openapiPath === '/') {
    return {
      raw: `${BASE_URL_VAR}/api`,
      host: [BASE_URL_VAR],
      path: ['api'],
    };
  }

  if (openapiPath.startsWith('/v1/')) {
    const rest = segments; // ['v1', ...]
    const pathArr = ['api', ...rest];
    return {
      raw: `${BASE_URL_VAR}/api/${rest.join('/')}`,
      host: [BASE_URL_VAR],
      path: pathArr,
    };
  }

  // Fallback: tratar como bajo /api
  return {
    raw: `${BASE_URL_VAR}/api/${segments.join('/')}`,
    host: [BASE_URL_VAR],
    path: ['api', ...segments],
  };
}

/**
 * @param {Record<string, string[]>[]|undefined} security
 * @returns {{ bearer: boolean, apiKey: boolean, masterKey: boolean }}
 */
function parseSecurity(security) {
  const out = { bearer: false, apiKey: false, masterKey: false };
  if (!security || !Array.isArray(security) || security.length === 0) {
    return out;
  }
  const firstAlt = security[0];
  if (!firstAlt || typeof firstAlt !== 'object') {
    return out;
  }
  for (const key of Object.keys(firstAlt)) {
    if (key === 'bearerAuth') out.bearer = true;
    if (key === 'apiKeyAuth') out.apiKey = true;
    if (key === 'masterKeyAuth') out.masterKey = true;
  }
  return out;
}

function resolveRef(spec, ref) {
  if (!ref || typeof ref !== 'string' || !ref.startsWith('#/')) {
    return null;
  }
  const parts = ref.slice(2).split('/');
  let cur = spec;
  for (const part of parts) {
    cur = cur?.[part];
  }
  return cur ?? null;
}

function resolveSchema(spec, schema) {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }
  if (schema.$ref) {
    return resolveSchema(spec, resolveRef(spec, schema.$ref));
  }
  return schema;
}

function normalizeParameters(spec, parameters) {
  if (!Array.isArray(parameters)) {
    return [];
  }
  return parameters
    .map((param) => (param?.$ref ? resolveRef(spec, param.$ref) : param))
    .filter(Boolean);
}

function generateExampleFromSchema(spec, schema) {
  const resolved = resolveSchema(spec, schema);
  if (!resolved || typeof resolved !== 'object') {
    return null;
  }
  if (resolved.example !== undefined) {
    return resolved.example;
  }

  if (resolved.type === 'object' && resolved.properties) {
    const obj = {};
    for (const [key, prop] of Object.entries(resolved.properties)) {
      obj[key] = generateExampleFromSchema(spec, prop);
    }
    return obj;
  }

  if (resolved.type === 'array' && resolved.items) {
    return [generateExampleFromSchema(spec, resolved.items)];
  }

  const defaultExamples = {
    string: 'example',
    integer: 0,
    number: 0,
    boolean: true,
  };

  return resolved.example ?? defaultExamples[resolved.type] ?? null;
}

function generateCollection() {
  const spec = swaggerSpec;
  const folders = {};

  const paths = spec.paths || {};

  for (const [route, methods] of Object.entries(paths)) {
    for (const [method, detail] of Object.entries(methods)) {
      if (!SUPPORTED_METHODS.includes(method)) {
        continue;
      }

      const tag = detail.tags?.[0] || 'General';
      if (!folders[tag]) {
        folders[tag] = [];
      }

      const { raw: urlRawBase, host, path: pathSegments } = buildPostmanUrl(route);

      const queryParams = [];
      const headerParams = [];
      for (const param of normalizeParameters(spec, detail.parameters)) {
        if (param.in === 'query') {
          const defaultVal =
            param.name === 'prefix'
              ? 'orion/productos'
              : param.name === 'llaveId'
                ? '{{llave_id}}'
                : '';
          queryParams.push({
            key: param.name,
            value:
              param.schema?.example !== undefined && param.schema?.example !== null
                ? String(param.schema.example)
                : defaultVal,
            description: param.description,
          });
        }
        if (param.in === 'header') {
          headerParams.push({
            key: param.name,
            value: param.name === 'X-Llave-Id' ? '{{llave_id}}' : '',
            description: param.description,
          });
        }
      }

      const queryString =
        queryParams.length > 0 ? `?${queryParams.map((q) => `${q.key}=${q.value}`).join('&')}` : '';

      const urlRaw = urlRawBase + queryString;

      /** @type {{ key: string; value: string }[]} */
      const headers = [];

      const sec = parseSecurity(detail.security);

      const jsonBodyContent = detail.requestBody?.content?.['application/json'];
      const multipartBody = detail.requestBody?.content?.['multipart/form-data'];

      if (jsonBodyContent?.schema) {
        headers.push({ key: 'Content-Type', value: 'application/json' });
      }

      if (sec.apiKey) {
        headers.push({ key: 'X-API-Key', value: '{{api_key}}' });
      }
      if (sec.masterKey) {
        headers.push({ key: 'X-Master-Key', value: '{{master_api_key}}' });
      }
      for (const hp of headerParams) {
        if (!headers.some((h) => h.key === hp.key)) {
          headers.push(hp);
        }
      }

      /** @type {Record<string, unknown>} */
      const item = {
        name: detail.summary || `${method.toUpperCase()} ${route}`,
        request: {
          method: method.toUpperCase(),
          header: headers,
          url: {
            raw: urlRaw,
            host,
            path: pathSegments,
            ...(queryParams.length > 0 && { query: queryParams }),
          },
          ...(detail.description && { description: detail.description }),
        },
      };

      if (jsonBodyContent?.schema) {
        const exampleBody = generateExampleFromSchema(spec, jsonBodyContent.schema);
        item.request.body = {
          mode: 'raw',
          raw: JSON.stringify(exampleBody, null, 2),
          options: { raw: { language: 'json' } },
        };
      } else if (multipartBody && method === 'post') {
        item.request.body = {
          mode: 'formdata',
          formdata: [
            {
              key: MULTIPART_FILE_FIELD,
              description: 'Selecciona un archivo en Postman (campo esperado por el servidor).',
              type: 'file',
              src: '',
            },
          ],
        };
      }

      if (sec.bearer) {
        item.request.auth = {
          type: 'bearer',
          bearer: [{ key: 'token', value: '{{access_token}}', type: 'string' }],
        };
      }

      const isLoginEndpoint = method === 'post' && route.includes('/auth/login');
      if (isLoginEndpoint) {
        item.event = [
          {
            listen: 'test',
            script: {
              type: 'text/javascript',
              exec: [
                'var json = pm.response.json();',
                'var token = json && json.data && json.data.token;',
                "if (token) {",
                "  pm.collectionVariables.set('access_token', token);",
                "  pm.collectionVariables.set('bearer_token', 'Bearer ' + token);",
                "  pm.collectionVariables.set('ID_TOKEN', token);",
                '}',
              ],
            },
          },
        ];
      }

      folders[tag].push(item);
    }
  }

  const collection = {
    info: {
      name: spec.info?.title || 'Orion Marketplace File Management API',
      description: spec.info?.description || '',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    variable: [
      { key: 'base_url', value: 'http://localhost:3000', type: 'string' },
      { key: 'access_token', value: '', type: 'string' },
      { key: 'bearer_token', value: '', type: 'string' },
      { key: 'refresh_token', value: '', type: 'string' },
      { key: 'ID_TOKEN', value: '', type: 'string' },
      { key: 'api_key', value: '', type: 'string' },
      { key: 'master_api_key', value: '', type: 'string' },
      { key: 'llave_id', value: '', type: 'string', description: 'publicId de API key (opcional, panel JWT)' },
    ],
    item: Object.entries(folders)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, items]) => ({ name, item: items })),
  };

  const outputPath = path.resolve(__dirname, '../../docs/orion-file-management-api.postman_collection.json');
  const outputDir = path.dirname(outputPath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2), 'utf-8');

  const totalEndpoints = Object.values(folders).reduce((sum, items) => sum + items.length, 0);
  const totalFolders = Object.keys(folders).length;

  console.log('=== Postman Collection generada ===');
  console.log(`Archivo: ${outputPath}`);
  console.log(`Carpetas (tags): ${totalFolders}`);
  console.log(`Endpoints: ${totalEndpoints}`);
  console.log('\nImporta este archivo en Postman o usa "Import > File".');
}

generateCollection();
