# Orion Marketplace — File Management

Servicio **Express** del ecosistema **Orion Marketplace** para **gestión de archivos multimedia** (imágenes, PDF, Office, OpenDocument), **autenticación de usuarios (JWT)**, **administración de clientes y API keys** (MongoDB) y catálogo de productos en modo **stub**.

Arquitectura **organizada por capas** (`routes` → `controllers` → `services` → `models` / almacenamiento). Los **nombres** de carpetas y código van en **inglés**; la **documentación** de este README y los comentarios orientativos al equipo van en **español**.

**Referencia detallada de endpoints:** [docs/API-ENDPOINTS.md](docs/API-ENDPOINTS.md).

## Requisitos previos

- **Node.js** >= 18.x  
- **npm** >= 9.x  
- **MongoDB** >= 6.x (recomendado para multi-cliente, API keys y metadatos de archivos)  
- **Amazon S3** (opcional, si `STORAGE_DRIVER=s3`)

## Instalación

```bash
git clone <url-del-repositorio>
cd orion-marketplace-file-management
npm install
cp .env.example .env
# Editar .env con valores reales
```

## Variables de entorno

Copia `.env.example` a `.env` y completa los valores. Nombres en **inglés** (convención del proyecto):

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `PORT` | Puerto HTTP del servidor | `3001` |
| `NODE_ENV` | Entorno de ejecución | `development` / `production` |
| `MONGODB_URI` | URI de MongoDB (multi-cliente, API keys, auditoría) | `mongodb://127.0.0.1:27017/orion_marketplace` |
| `MASTER_API_KEY` | Cabecera `X-Master-Key` para bootstrap (`POST /api/v1/auth/register`) | *(cadena larga)* |
| `JWT_AUTH_SECRET` | Secreto JWT de login de usuarios | *(cadena segura)* |
| `JWT_AUTH_EXPIRES_IN` | TTL del token de login | `1h` |
| `JWT_MEDIA_SECRET` | Secreto para enlaces firmados (local + MongoDB) | *(cadena segura)* |
| `STORAGE_DRIVER` | Almacenamiento: `local` (disco) o `s3` | `local` |
| `STORAGE_DIR` | Carpeta física de binarios (solo `local`; por defecto `storage`) | `storage` |
| `UPLOAD_MAX_MB` | Tamaño máximo por archivo (MB) | `5` |
| `PUBLIC_BASE_URL` | URL base pública para `url` en JSON (solo local) | `http://localhost:3001` |
| `API_KEY` | API key global (solo **sin** `MONGODB_URI`, modo legado) | *(opcional)* |
| `MULTIMEDIA_CONTEXTOS_PERMITIDOS` | Slugs de contexto permitidos (solo legado, sin Mongo) | `orion_marketplace,wallet_app` |
| `SIGNED_URL_EXPIRES_SECONDS` | TTL de URLs firmadas (60–86400) | `900` |
| `AUDITORIA_TTL_DIAS` | Retención de auditoría en MongoDB (días) | `30` |
| `S3_BUCKET` | Bucket S3 (**obligatorio** si `STORAGE_DRIVER=s3`) | `mi-bucket` |
| `S3_REGION` | Región del bucket | `us-east-1` |
| `S3_KEY_PREFIX` | Prefijo opcional dentro del bucket | `orion/` |
| `S3_PUBLIC_BASE_URL` | Base pública (CloudFront u otro dominio) | `https://cdn.ejemplo.com` |
| `SEED_ADMIN_EMAIL` | Email del admin para `npm run migrate:admin` | `admin@empresa.com` |
| `SEED_ADMIN_PASSWORD` | Contraseña inicial del admin (mín. 8 caracteres) | *(secreto)* |
| `SEED_ADMIN_NAME` | Nombre visible del admin | `Administrador` |
| `SEED_ADMIN_UPDATE_PASSWORD` | Si es `true`, actualiza contraseña del admin existente | `false` |

**Credenciales AWS** (modo S3): `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, perfil en `~/.aws/credentials` o rol IAM en entornos AWS.

**Almacenamiento local:** los binarios viven en **`storage/`** (o `STORAGE_DIR`). La ruta HTTP **`/media/...`** solo se monta en **modo legado** (local **sin** `MONGODB_URI`); no existe una carpeta `media` en el repositorio.

## Scripts disponibles

| Script | Comando | Descripción |
|--------|---------|-------------|
| Build | `npm run build` | Verifica sintaxis y carga de módulos (CI / Vercel) |
| Desarrollo | `npm run dev` | Servidor con recarga (`nodemon`) |
| Producción | `npm start` | Ejecuta `node src/server.js` |
| Admin seed | `npm run migrate:admin` | Crea o actualiza usuario admin en MongoDB |
| Postman | `npm run postman` | Genera la collection desde OpenAPI |
| Tests | `npm test` | *(sin suite configurada aún)* |

## Desarrollo

```bash
npm run dev
```

Recomendado con MongoDB:

1. Configura `MONGODB_URI`, `JWT_AUTH_SECRET`, `JWT_MEDIA_SECRET` (si usas disco local) y `MASTER_API_KEY`.
2. Crea el usuario admin:  
   `SEED_ADMIN_EMAIL=admin@tuempresa.com SEED_ADMIN_PASSWORD='TuClaveSegura' npm run migrate:admin`
3. Verifica salud: `GET /health` → `db.mongo.status` debe ser `up`.

### URLs útiles

| URL | Descripción |
|-----|-------------|
| `http://localhost:<PORT>/health` | Health check (ajusta `PORT`) |
| `http://localhost:<PORT>/api` | Metadatos globales de la API |
| `http://localhost:<PORT>/api/v1` | Índice de recursos v1 |
| `http://localhost:<PORT>/api/docs` | Swagger UI |
| `http://localhost:<PORT>/api/docs.json` | Spec OpenAPI en JSON |
| `http://localhost:<PORT>/media/...` | Archivos estáticos (solo local **sin** MongoDB) |

## Despliegue en Vercel

El repo incluye **`vercel.json`** y **`api/index.js`** (entrada serverless que exporta la app Express).

### Sin S3 (por ahora, solo pruebas)

Puedes desplegar con **`STORAGE_DRIVER=local`** (o sin definirla; por defecto es `local`):

| Variable | Valor en Vercel |
|----------|-----------------|
| `STORAGE_DRIVER` | `local` o omitir |
| `MONGODB_URI` | URI de MongoDB Atlas |
| `JWT_AUTH_SECRET` | Secreto de login |
| `JWT_MEDIA_SECRET` | **Obligatorio** con Mongo + local (enlaces `/api/v1/multimedia/acceso/:token`) |
| `PUBLIC_BASE_URL` | `https://tu-proyecto.vercel.app` |
| `NODE_ENV` | `production` |

No hace falta `S3_*` ni credenciales AWS.

**Qué funciona bien:** auth (`/api/v1/auth/*`), admin de clientes y API keys, health, Swagger.

**Limitación importante del multimedia:** en Vercel los binarios se escriben en **`/tmp/orion-storage`** (no en la carpeta `storage/` del repo). Ese disco es **efímero**: otro cold start, otro despliegue u otra instancia serverless puede **no tener** el archivo. Sirve para probar subidas puntuales, **no** como almacenamiento fiable en producción.

Con `MONGODB_URI` **no** se monta `GET /media/...`; la descarga va por **token firmado** (`JWT_MEDIA_SECRET`).

### Con S3 (recomendado en producción)

| Variable | Notas |
|----------|--------|
| `STORAGE_DRIVER` | `s3` |
| `S3_BUCKET`, `S3_REGION` | Bucket y región |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Credenciales S3 |
| `MONGODB_URI` | MongoDB Atlas |
| `JWT_AUTH_SECRET` | Login de usuarios |
| `PUBLIC_BASE_URL` | URL del proyecto en Vercel |
| `NODE_ENV` | `production` |

Opcional: `S3_PUBLIC_BASE_URL`, `S3_KEY_PREFIX`, `JWT_AUTH_EXPIRES_IN`, `SIGNED_URL_EXPIRES_SECONDS`, `MASTER_API_KEY`.

### Pasos

1. Sube el repo a GitHub/GitLab y conéctalo en [vercel.com](https://vercel.com).
2. Framework preset: **Other**.
3. **Build Command:** `npm run build` (ya definido en `vercel.json`).
4. Añade las variables de entorno en **Settings → Environment Variables**.
5. Deploy.

CLI:

```bash
npm i -g vercel
vercel login
vercel
vercel --prod
```

### Comprobar

- `GET https://<tu-dominio>/health`
- `GET https://<tu-dominio>/api/v1`
- `https://<tu-dominio>/api/docs`

### Admin en producción

Crea el usuario admin con Atlas (no hace falta SSH al servidor):

```bash
SEED_ADMIN_EMAIL=admin@tuempresa.com SEED_ADMIN_PASSWORD='TuClave' npm run migrate:admin
```

(Ejecuta en local apuntando `MONGODB_URI` al cluster de producción.)

### Notas

- **`maxDuration`** de la función: 30 s en `vercel.json` (planes Pro; en Hobby el límite puede ser menor).
- Subidas muy grandes pueden chocar con el límite de body de serverless; valora `UPLOAD_MAX_MB`.
- En local sigue siendo válido `npm start` / `npm run dev` con `STORAGE_DRIVER=local`.

## Stack tecnológico

| Tecnología | Uso |
|------------|-----|
| Express 5 | Framework HTTP |
| JavaScript (CommonJS) | Runtime del servicio |
| MongoDB / Mongoose | Clientes, API keys, metadatos, auditoría |
| Multer | Subida multipart (`archivo`) |
| AWS SDK S3 | Almacenamiento y URLs firmadas en S3 |
| JWT / bcryptjs | Login de usuarios y hash de contraseñas |
| Helmet / CORS / Morgan | Seguridad, CORS y logging HTTP |
| swagger-jsdoc / swagger-ui-express | Documentación OpenAPI |
| dotenv | Variables de entorno |

## Estructura del proyecto

```txt
orion-marketplace-file-management/
├── api/
│   └── index.js               # Entrada serverless (Vercel)
├── vercel.json                # Rewrites y build en Vercel
├── src/
│   ├── server.js              # Arranque local: dotenv, ensureServerReady, listen
│   ├── ensureServerReady.js   # Validación env + Mongo (local y Vercel)
│   ├── app.js                 # Express, middlewares, /health, Swagger, /media
│   ├── config/
│   │   ├── index.js           # Configuración central
│   │   ├── multimedia.js      # MIME, entidades, tipos de carpeta
│   │   └── swagger.js
│   ├── db/
│   │   └── mongoose.js
│   ├── routes/
│   │   ├── index.js           # Prefijo /api
│   │   └── api/
│   │       ├── index.js
│   │       └── v1/
│   │           ├── index.js
│   │           ├── products.routes.js
│   │           ├── multimedia.routes.js
│   │           ├── auth.routes.js
│   │           ├── admin.routes.js
│   │           └── client.routes.js
│   ├── controllers/
│   ├── services/
│   │   ├── clientes/          # clienteService, apiKeyService
│   │   ├── auditoria/
│   │   ├── seguridad/
│   │   ├── multimediaService.js
│   │   ├── multimediaS3Storage.js
│   │   ├── multimediaAccesoLocal.js
│   │   └── archivoMetadataService.js
│   ├── middleware/
│   │   ├── ensureServerReady.js            # auth, permisos, multer, errores
│   ├── models/                # Cliente, ApiKey, Archivo, AuditoriaEvento
│   ├── utils/
│   └── scripts/
│       └── migrateSeedAdminUser.js
├── scripts/
│   └── postman/generate-collection.js
├── docs/
│   ├── API-ENDPOINTS.md
│   ├── ESPECIFICACION-REQUERIMIENTOS.md
│   └── orion-file-management-api.postman_collection.json
├── storage/                   # Binarios en disco (local; no versionar contenido)
├── .env.example
├── package.json
└── README.md
```

## Estructura interna de un recurso API

Cada dominio sigue esta plantilla (nombres en inglés en código):

```txt
src/
├── routes/api/v1/<resource>.routes.js    # Rutas + anotaciones @openapi
├── controllers/<resource>Controller.js   # Orquestación HTTP
├── services/<resource>Service.js         # Reglas de negocio
├── middleware/                           # Validación, auth, multer (cuando aplique)
└── models/                               # Esquemas Mongoose (si aplica)
```

Flujo típico **multimedia**:

```txt
Petición
  → autenticarApiKey (MongoDB: clave de cliente; sin Mongo: API_KEY opcional)
  → requerirPermiso + validar alcance por prefijos (con MongoDB)
  → validarParametrosMultimedia
  → (POST) multerMultimedia
  → multimediaController → multimediaService (+ multimediaS3Storage si S3)
  → JSON o fichero
```

## Módulos y rutas base

Los prefijos HTTP se montan en `src/routes/` y `src/app.js`. Tabla orientativa (el código es la fuente de verdad):

| Recurso | Prefijo | Descripción |
|---------|---------|-------------|
| health | `/health` | Salud del servicio y estado de MongoDB |
| api | `/api` | Metadatos globales |
| v1 índice | `/api/v1` | Enlaces a recursos |
| products | `/api/v1/products` | Catálogo (**stub**: lista vacía, detalle 404) |
| multimedia | `/api/v1/multimedia` | Listar, subir, borrar, URL firmada, acceso por token |
| auth | `/api/v1/auth` | Registro bootstrap, login, perfil (`Bearer`) |
| admin | `/api/v1/admin` | Clientes y API keys (**JWT rol `admin`**) |
| client | `/api/v1/client` | Autoservicio del rol cliente (`Bearer`) |

### Multimedia — contrato resumido

**Ruta lógica** (local y S3):

`{contexto}/{entidad}/{id}/{tipo}/{subcarpeta}/nombre-único.ext`

| Parámetro | Valores |
|-----------|---------|
| `contexto` | Slug: minúsculas, `[a-z0-9_-]`, máx. 63. Con MongoDB, alcance por **prefijos** de la API key |
| `entidad` | `usuarios`, `productos`, `pedidos`, `sellers` |
| `id` | UUID si `usuarios` o `sellers`; numérico si `productos` o `pedidos` |
| `tipo` | `perfil`, `logo`, `galeria`, `documentos`, `marca`, `otros` |

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/v1/multimedia/:contexto/:entidad/:id/:tipo` | Lista archivos |
| `POST` | `/api/v1/multimedia/:contexto/:entidad/:id/:tipo` | Sube un archivo (campo multipart **`archivo`**) |
| `DELETE` | `/api/v1/multimedia/:contexto/:entidad/:id/:tipo/:archivo` | Elimina por nombre |
| `POST` | `/api/v1/multimedia/url-firma` | URL firmada (S3) o token (local + MongoDB) |
| `GET` | `/api/v1/multimedia/acceso/:token` | Acceso local firmado (solo local + MongoDB) |

**Cabecera API key** (multimedia): `X-API-Key: ...` o `Authorization: Bearer ...`.

Tipos MIME y reglas: `src/config/multimedia.js`.

### Admin — rutas principales

Todas exigen `Authorization: Bearer <token>` de usuario con **rol `admin`**.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/v1/admin/clientes` | Listar (`q`, `activo` opcionales) |
| `POST` | `/api/v1/admin/clientes` | Crear cliente |
| `GET` | `/api/v1/admin/clientes/:clienteId` | Detalle (`ObjectId` o `publicId`) |
| `PUT` | `/api/v1/admin/clientes/:clienteId` | Actualizar (parcial) |
| `POST` | `/api/v1/admin/clientes/:clienteId/llaves` | Crear API key |
| `GET` | `/api/v1/admin/clientes/:clienteId/llaves` | Listar API keys |
| `DELETE` | `/api/v1/admin/clientes/:clienteId/llaves/:llaveId` | Eliminar API key |
| `PATCH` | `/api/v1/admin/clientes/:clienteId/llaves/:llaveId/estado` | Activar / desactivar |
| `POST` | `/api/v1/admin/clientes/:clienteId/llaves/:llaveId/rotar` | Rotar (devuelve clave en claro) |

### Auth — rutas principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/v1/auth/register` | Bootstrap (cabecera `X-Master-Key`) |
| `POST` | `/api/v1/auth/login` | Login email / contraseña |
| `GET` | `/api/v1/auth/me` | Usuario autenticado |

## Arranque y almacenamiento

Al iniciar (`src/server.js`):

1. Carga `.env` con **dotenv**.
2. Si `STORAGE_DRIVER=s3`, exige `S3_BUCKET`; si no, crea la carpeta `storage/` (o `STORAGE_DIR`).
3. Si hay `MONGODB_URI`, conecta MongoDB y exige `JWT_AUTH_SECRET`; con disco local también `JWT_MEDIA_SECRET`.
4. Abre el puerto HTTP configurado.

| Modo | Binarios | Lectura pública |
|------|----------|-----------------|
| **local** sin Mongo | `storage/{contexto}/...` | `GET /media/...` |
| **local** con Mongo | `storage/clients/{clienteId}/{contexto}/...` | Token: `/api/v1/multimedia/acceso/:token` |
| **s3** | Objetos en bucket | URL del JSON (bucket, CloudFront o prefirmada) |

## Usuario administrador (seed)

Para el primer admin en MongoDB **sin** usar solo el registro HTTP:

```bash
SEED_ADMIN_EMAIL=admin@tuempresa.com SEED_ADMIN_PASSWORD='TuClaveSegura' npm run migrate:admin
```

Si el admin ya existe y quieres cambiar la contraseña: `SEED_ADMIN_UPDATE_PASSWORD=true`.

Implementación: `src/scripts/migrateSeedAdminUser.js`.

## Documentación de API

- **Swagger UI:** `/api/docs` con el servidor en marcha.  
- **OpenAPI JSON:** `/api/docs.json`.  
- Cada módulo documenta sus endpoints con `@openapi` en `src/routes/api/v1/*.routes.js`.  
- Tras cambiar rutas o contratos, ejecutar:

```bash
npm run postman
```

para regenerar `docs/orion-file-management-api.postman_collection.json`.

Variables típicas en Postman: `{{base_url}}`, `{{token}}`, `{{api_key}}`.

## Despliegue en producción

```bash
npm start
```

Asegura en el entorno: `NODE_ENV=production`, secretos JWT, `MONGODB_URI` (si aplica), y credenciales S3 o disco persistente para `storage/`.

## Documentación adicional (`docs/`)

Orden de lectura recomendado:

1. [docs/API-ENDPOINTS.md](docs/API-ENDPOINTS.md) — Cuándo y cómo usar cada endpoint  
2. [docs/ESPECIFICACION-REQUERIMIENTOS.md](docs/ESPECIFICACION-REQUERIMIENTOS.md) — Requerimientos multi-cliente, API keys y archivos  
3. [docs/orion-file-management-api.postman_collection.json](docs/orion-file-management-api.postman_collection.json) — Colección Postman (regenerable con `npm run postman`)

## Errores

Las respuestas de error suelen seguir:

```json
{ "error": { "message": "..." } }
```

En desarrollo (`NODE_ENV` distinto de `production`) puede incluirse `stack`. Errores frecuentes: API key inválida o inactiva (`401`), fuera de prefijos permitidos (`403`), MIME o tamaño no permitido (`400`), parámetros de ruta inválidos (`400`).

---

**Convención resumida:** código y nombres de archivo en **inglés**; comentarios, commits y PRs en **español**; documentación del proyecto en **español** con términos técnicos en inglés alineados al repo.

**Licencia:** ISC (según `package.json`).
