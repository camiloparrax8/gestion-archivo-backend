# API — Endpoints, uso y cuándo emplearlos

**Base URL (desarrollo):** `http://localhost:3000`  
**Prefijo API:** `/api/v1/…` (salvo `/health` y `/api` sin versión).

---

## Tipos de autenticación

| Tipo | Cabecera | Cuándo usarlo |
|------|-----------|----------------|
| **Ninguna** | — | Health, info de API, productos stub, y en modo legado (sin `MONGODB_URI`) multimedia puede no exigir clave. |
| **Master key** | `X-Master-Key: <MASTER_API_KEY>` | Solo rutas **`/api/v1/admin/...`**: crear clientes y gestionar API keys (APK). No uses esta clave en el front público. |
| **API key de cliente** | `X-API-Key: <clave>` o `Authorization: Bearer <clave>` | Rutas **`/api/v1/multimedia/...`**: integraciones (Orion backend, scripts). La clave identifica al tenant; no envíe `clienteId`. |
| **JWT (panel)** | `Authorization: Bearer <token>` | Rutas **`/api/v1/client/me/multimedia/...`** (rol cliente) y **`/api/v1/admin/clientes/:clienteId/multimedia/...`** (rol admin). **No** requiere API key para subir/explorar. |

Variables de entorno: ver `.env.example` (`MASTER_API_KEY`, `MONGODB_URI`, `JWT_AUTH_SECRET`, `JWT_MEDIA_SECRET` con disco local, etc.).

**Importante — segmento `{id}` en la URL:** es el **ID del recurso en la aplicación integradora** (productId, sellerId, userId de Orion), **no** el `_id` / `publicId` del documento Cliente en MongoDB de gestión de archivos (ese lo resuelve la API key o el JWT del panel).

---

## 1. Salud del servicio

### `GET /health`

- **Cuándo:** comprobar que el proceso Node responde (balanceadores, monitoreo, Postman rápido).
- **Auth:** no.
- **Respuesta ejemplo:** `{ "ok": true, "uptime": 123.45 }`

---

## 2. Información de la API

### `GET /api`

- **Cuándo:** conocer nombre y versión declarada del servicio.
- **Auth:** no.
- **Respuesta:** `{ "name": "Orion Marketplace API", "version": "1.0.0" }`

### `GET /api/v1`

- **Cuándo:** descubrir recursos disponibles (`products`, `multimedia`, `admin`).
- **Auth:** no.
- **Respuesta:** mensaje + enlaces relativos a recursos.

---

## 3. Productos (stub)

> Hoy no hay persistencia real: la lista viene vacía y el detalle suele ser 404.

### `GET /api/v1/products`

- **Cuándo:** integrar o probar el contrato hasta que exista catálogo real.
- **Auth:** no.
- **Respuesta:** `{ "data": [] }`

### `GET /api/v1/products/:id`

- **Cuándo:** obtener un producto por id numérico (cuando exista implementación).
- **Auth:** no.
- **Errores:** `404` si no hay producto.

---

## 4. Administración (`/api/v1/admin`)

**Todas** estas rutas exigen **`X-Master-Key`** igual a `MASTER_API_KEY` del servidor.

**Cuándo usar este bloque:** bootstrap y operación interna (crear organizaciones cliente, emitir APK para integradores). No exponer la master key a aplicaciones finales.

### `POST /api/v1/admin/clientes`

- **Cuándo:** registrar un **cliente organizacional** (correo único en BD).
- **Body (JSON):**
  ```json
  { "email": "contacto@empresa.com", "nombre": "Nombre visible" }
  ```
- **Respuesta:** `201`, `data` con el documento cliente (incluye `publicId` recomendado y `_id` legado). Usa preferentemente `publicId` para crear llaves.

### `POST /api/v1/admin/clientes/:clienteId/llaves`

- **Cuándo:** crear una **nueva API key** para ese cliente (lectura/escritura/borrado y alcance por prefijos).
- **Nota:** `:clienteId` acepta tanto `publicId` (UUID) como `_id` (compatibilidad legado).
- **Body (JSON):**
  ```json
  {
    "nombre": "integracion-backend",
    "prefijos": ["app_a"],
    "permisos": { "read": true, "write": true, "delete": true }
  }
  ```
  - `prefijos`: array de strings. Vacío `[]` = la clave puede operar en cualquier **contexto** permitido por el servidor. Si incluyes `["app_a"]`, la clave solo puede usar rutas cuyo primer segmento sea `app_a`.
  - `permisos`: qué operaciones HTTP de multimedia permite la clave.
- **Respuesta:** `201`, incluye **`apiKey`** en claro **una sola vez**; guárdala de forma segura.

### `GET /api/v1/admin/clientes/:clienteId/llaves`

- **Cuándo:** listar metadata de las llaves (nombres, prefijos, permisos, fechas); **no** devuelve el secreto de la clave.
- **Nota:** `:clienteId` acepta tanto `publicId` (UUID) como `_id` (compatibilidad legado).
- **Respuesta:** `200`, lista en `data`.

---

## 5. Multimedia (`/api/v1/multimedia`)

### Convención de URL

Todas las rutas de carpeta/archivo siguen:

```text
/api/v1/multimedia/:contexto/:entidad/:id/:tipo[/:archivo]
```

| Segmento | Descripción |
|----------|-------------|
| `contexto` | Espacio lógico por aplicación o producto (slug). Con MongoDB, el alcance se controla por prefijos de API key. En modo legado (sin MongoDB), puede restringirse con `MULTIMEDIA_CONTEXTOS_PERMITIDOS` en `.env`. |
| `entidad` | `usuarios` \| `productos` \| `pedidos` \| `sellers` |
| `id` | UUID si `entidad` es `usuarios` o `sellers` (ej. logo de vendedor en marketplace); numérico si `productos` o `pedidos`. |
| `tipo` | `perfil` \| `logo` \| `galeria` \| `documentos` \| `marca` \| `otros` |

Si la API key tiene `prefijos` no vacíos, la ruta `contexto/entidad/id/tipo` debe empezar por uno de esos prefijos (p. ej. para subidas Orion a `guven/sellers/.../logo`, incluir `guven` o un prefijo que cubra `guven/sellers`).
| `archivo` | Solo en `DELETE`: nombre de fichero devuelto al subir o listar. |

**Auth:** con `MONGODB_URI`, usar **API key de cliente** (`X-API-Key` o `Bearer`). Sin MongoDB (legado), puede aplicarse `API_KEY` global opcional o acceso abierto según configuración.

**Almacenamiento:** con MongoDB, los ficheros quedan bajo `clients/{idClienteMongo}/{contexto}/…`.

---

### `GET /api/v1/multimedia/acceso/:token`

- **Cuándo:** **abrir o descargar** un archivo en **disco local + MongoDB** usando el **token** que devuelve el listado o la URL firmada (JWT en la ruta).
- **Auth:** no en la petición: el `token` sustituye la API key para esa descarga temporal.
- **Uso típico:** pegar la URL en el navegador o que el front use el enlace recibido tras `POST /url-firma` o en cada ítem del listado.

---

### `POST /api/v1/multimedia/url-firma`

- **Cuándo:** obtener un **enlace temporal** para un archivo concreto (privado o para compartir unos minutos) sin pasar la API key en cada GET del navegador.
- **Auth:** API key con permiso **`read`** y alcance que cubra la ruta.
- **Headers:** `Content-Type: application/json`, `X-API-Key` (o Bearer).
- **Body (JSON):**
  ```json
  {
    "rutaInternaCliente": "app_a/usuarios/1/perfil/pdf/nombre-archivo.pdf",
    "segundos": 900
  }
  ```
  - `rutaInternaCliente`: **6 segmentos** (recomendado) `contexto/entidad/id/tipo/{pdf|jpeg|png|gif|webp}/nombreArchivo`, o **5 segmentos** si el archivo es legado (subido antes de usar subcarpetas por MIME).
  - `segundos`: opcional; máximo acotado por `SIGNED_URL_EXPIRES_SECONDS`.
- **Respuesta:** `data.url` (y TTL). En **S3** será URL prefirmada de Amazon; en **local** será ruta con `/acceso/:token`.

---

### `GET /api/v1/multimedia/:contexto/:entidad/:id/:tipo`

- **Cuándo:** **listar** archivos en esa carpeta (metadatos + URLs de acceso según visibilidad y modo de almacenamiento).
- **Auth:** API key con **`read`**.
- **Respuesta:** `{ "data": [ { "nombre", "rutaRelativa", "rutaInternaCliente", "subcarpeta"?, "url", ... } ] }` (`subcarpeta` cuando el fichero está bajo `tipo/pdf`, etc.).

---

### `POST /api/v1/multimedia/:contexto/:entidad/:id/:tipo`

- **Cuándo:** **subir un archivo** (multipart).
- **Auth:** API key con **`write`**.
- **Body:** `multipart/form-data`
  - Campo archivo: **`archivo`** (nombre fijo en el código).
  - Opcional: **`visibilidad`** = `publico` (si no, suele tratarse como privado en metadata).
- **Tipos MIME permitidos:** jpeg, png, gif, webp, pdf (ver `src/config/multimedia.js`).
- **Respuesta:** `201`, datos del fichero incluyendo `rutaInternaCliente` para usar en `url-firma`.

---

### `DELETE /api/v1/multimedia/:contexto/:entidad/:id/:tipo/:archivo`

- **Cuándo:** **eliminar** un fichero por su nombre exacto.
- **Auth:** API key con **`delete`**.
- **Respuesta:** confirmación de borrado.

---

## 6. Panel web — multimedia con JWT

**Cuándo usar:** gestor de archivos (`gestion-archivo-front`), usuarios con login. No exponer API keys en el navegador.

### Cliente (`rol: cliente`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/v1/client/me/multimedia/browse?prefix=` | Explorar carpetas/archivos |
| `GET` | `/api/v1/client/me/multimedia/:contexto/:entidad/:id/:tipo` | Listar carpeta |
| `POST` | `/api/v1/client/me/multimedia/:contexto/:entidad/:id/:tipo` | Subir (`multipart`, campo **`archivo`**) |
| `DELETE` | `/api/v1/client/me/multimedia/.../:archivo` | Eliminar |
| `POST` | `/api/v1/client/me/multimedia/url-firma` | URL temporal por `rutaInternaCliente` |

### Admin (`rol: admin`)

Mismas operaciones bajo `/api/v1/admin/clientes/:clienteId/multimedia/...` (incluye `browse`, `url-firma`, subir y borrar).

### Diferencias respecto a API key

| | API key (`/multimedia/...`) | Panel JWT (`/me/multimedia/...`) |
|--|---------------------------|----------------------------------|
| Auth | `X-API-Key` | `Bearer` JWT |
| Tenant | De la API key | Del usuario logueado (o `:clienteId` si admin) |
| Prefijos de llave | Obligatorios si la llave los define | **No** obligatorios al subir (panel libre) |
| Header opcional | — | `X-Llave-Id` solo para filtrar browse con una llave concreta |

### Respuesta explore / listado (archivos)

Items `kind: file` incluyen: `rutaInternaCliente`, `rutaRelativa`, `nombreOriginal`, `mime`, `tamaño`, `url`, `visibilidad`, `accesoPrivado`.

---

## 7. Archivos estáticos `GET /media/...` (solo modo legado)

**Importante:** en disco los binarios están bajo la carpeta física **`storage/`** (por defecto) o la ruta de `STORAGE_DIR`. El prefijo HTTP **`/media`** no es una carpeta del proyecto: es la ruta con la que Express sirve el contenido de `storageDir`.

### `GET /media/...`

- **Cuándo:** solo si **no** hay `MONGODB_URI` y el almacenamiento es **local**: `express.static` sirve ficheros desde **`storage/`** (o `STORAGE_DIR`) mapeados bajo la URL `/media/...`, sin pasar por la API de multimedia.
- **Con MongoDB** esta ruta **no** se monta por defecto (evita exponer el árbol completo sin control).

---

## 8. Resumen: qué endpoint usar en cada momento

| Objetivo | Endpoint |
|----------|----------|
| Ver si el servidor vive | `GET /health` |
| Crear cuenta cliente en el servicio de archivos | `POST /api/v1/admin/clientes` + Master key |
| Generar una APK para integradores | `POST /api/v1/admin/clientes/:id/llaves` + Master key |
| Ver llaves existentes (sin ver el secreto) | `GET /api/v1/admin/clientes/:id/llaves` + Master key |
| Listar archivos (integración) | `GET /api/v1/multimedia/...` + API key |
| Subir (integración) | `POST /api/v1/multimedia/...` + API key + `archivo` |
| Explorar / subir desde el gestor web | JWT → `/api/v1/client/me/multimedia/...` (sin API key) |
| Admin explora un cliente | JWT admin → `/api/v1/admin/clientes/:id/multimedia/browse` |
| Borrar un archivo | `DELETE` en la ruta correspondiente (API key o JWT) |
| Enlace temporal | `POST .../url-firma` (API key o JWT panel) |
| Abrir archivo con token (local + Mongo) | `GET /api/v1/multimedia/acceso/:token` (sin auth) |

---

## 9. Auditoría en MongoDB (con `MONGODB_URI`)

Los eventos se persisten en la colección **`auditoriaeventos`** con caducidad automática (TTL según `AUDITORIA_TTL_DIAS`).

| Campo `origen` | Acciones (`accion`) |
|-----------------|---------------------|
| `master` | `admin.cliente_crear`, `admin.api_key_crear`, `admin.api_key_listar` |
| `api_key` | `multimedia.listar`, `multimedia.subir`, `multimedia.eliminar`, `multimedia.url_firma`, `multimedia.explorar` |
| `panel_jwt` | Mismas acciones multimedia desde el panel (sin `apiKeyId` obligatorio) |
| `acceso_token` | `multimedia.acceso_archivo` (descarga vía `GET .../multimedia/acceso/:token`) |

Los registros antiguos pueden no incluir `origen`. No se guardan secretos (ni master key ni API key en claro).

---

## 10. Códigos de error frecuentes

| Código | Situación típica |
|--------|------------------|
| `400` | Parámetros de ruta inválidos, `rutaInternaCliente` mal formada, MIME no permitido. |
| `401` | Falta API key, master key incorrecta, token JWT expirado o inválido. |
| `403` | La API key no tiene el permiso (read/write/delete) o la ruta está fuera de `prefijos`. |
| `404` | Archivo o producto no encontrado. |
| `503` | `MASTER_API_KEY` no definida en servidor (revisar `.env` y `dotenv` con `override: true` en `server.js`). |

---

*Documento alineado con el código en `src/routes`. Si cambian las rutas, actualizar este archivo.*
