# Especificación de requerimientos — Sistema de gestión de archivos multi-cliente

**Versión:** 0.1 (borrador a partir de reunión de alineación)  
**Audiencia:** equipo técnico y stakeholders  
**Nota:** este documento **sintetiza** lo acordado en sesión; no es transcripción literal.

---

## 1. Propósito y alcance

Se requiere un **servicio de gestión de archivos** orientado a **integración por código** (otros desarrolladores y backends consumen la API; no es prioritario un panel gráfico para el usuario final del producto).

El sistema debe permitir que un **cliente organizacional** (quien contrata el servicio) disponga de **una o más claves de API** asociadas a **servicios o productos** (ej. Orion Marketplace, Wallet), gestione **árbol de carpetas y archivos** bajo un **espacio lógico propio**, y aplique **permisos por clave**, **visibilidad** (público/privado) y **acceso temporal** mediante **URLs prefirmadas** con vencimiento.

---

## 2. Glosario

> **Convención interna del equipo:** en reuniones y mensajes se usa a veces la sigla **«APK»**; en este proyecto **APK significa API key** (clave de API), **no** el formato de paquete Android. En documentación técnica se prefiere el término **clave API**.

| Término | Significado en este documento |
|--------|-------------------------------|
| **Cliente (organizacional)** | Entidad de negocio registrada (ej. identificada por correo y datos contractuales). No confundir con “cliente HTTP”. |
| **Usuario (del espacio)** | Sujeto dentro del sistema de archivos del cliente (ej. usuario final de Wallet A vs Wallet B). Su espacio se modela bajo un identificador único (ej. documento de identidad o UID interno). |
| **Clave API** | Credencial de integración que autentica llamadas al servicio. Puede existir **varias claves por cliente** y **varias claves asociadas al mismo árbol de carpetas** con distintos permisos. |
| **APK** (jerga interna) | **Sinónimo de clave API** en comunicación del equipo; no usar en contratos técnicos externos sin glosar. |
| **Archivo** | Imagen, documento u otro binario admitido por política del sistema. |
| **URL prefirmada** | Enlace de acceso HTTP con validez limitada en el tiempo (ej. 15 minutos), sin exponer rutas internas del servidor. |
| **Carpeta `storage/` (implementación backend)** | En modo local, los bytes se guardan bajo el directorio configurado (`storage/` por defecto). No debe confundirse con el prefijo HTTP **`/media/...`**, que en modo legado solo **mapea** peticiones a ese directorio. |

---

## 3. Actores

- **Cliente organizacional:** se registra, administra claves API y políticas sobre sus espacios y archivos.
- **Integrador / desarrollador:** consume la API (p. ej. desde backend Python, Node, etc.) para cargar, consultar, actualizar o eliminar archivos según permisos de la clave.
- **Usuario final del producto del cliente:** no interactúa directamente con este servicio salvo vía aplicaciones que el cliente construya; las reglas de **aislamiento** entre usuarios (A no ve B) son **configurables por el cliente** según su producto (ej. Wallet).

---

## 4. Requerimientos funcionales

### 4.1 Gestión de clientes

- **RF-C01:** El sistema debe permitir el **registro y mantenimiento** de clientes organizacionales (datos mínimos acordados en diseño: identificador único, contacto, etc.).
- **RF-C02:** Al registrarse un cliente, el sistema debe **provisionar un espacio de almacenamiento lógico** (raíz asociada al identificador del cliente en base de datos, p. ej. carpeta o prefijo de objeto equivalente al UID del cliente).
- **RF-C03:** Bajo la raíz del cliente deben poder crearse **subestructuras** (carpetas) según necesidad: p. ej. carpetas de “producto” o servicio (Orion, Wallet) y, dentro de ellas, subcarpetas y archivos sin un esquema rígido impuesto por defecto (el cliente u operación define el árbol).

### 4.2 Gestión de claves API

- **RF-K01:** Un cliente puede **crear, listar, revocar y rotar** múltiples claves API.
- **RF-K02:** Cada clave API debe **asociarse al cliente** y quedar **persistida** en base de datos con su metadata (nombre opcional, fechas, estado).
- **RF-K03:** Cada clave debe configurarse con **permisos** acotados al menos a: **solo lectura (consulta)**, **escritura (inserción/modificación)**, **eliminación** (combinaciones explícitas según matriz de diseño).
- **RF-K04:** Debe ser posible **asociar una clave a uno o más directorios principales** (o prefijos) del espacio del cliente, de modo que la clave solo opere dentro de ese alcance (requisito mencionado como evolución inmediata o fase 2: “al crear la clave, elegir directorios principales”).
- **RF-K05:** Debe soportarse el caso de **varias claves distintas sobre el mismo subárbol** con permisos distintos (ej. clave de solo lectura para front / clave de escritura para backend), sin obligar a un único secreto por carpeta.

### 4.3 Gestión de archivos

- **RF-A01:** Operaciones mínimas sobre archivos: **crear (subir)**, **consultar (metadatos y/o descarga controlada)**, **modificar (reemplazar o versionar — definir en diseño detallado)**, **eliminar**.
- **RF-A02:** Al subir un archivo, el cliente debe poder marcarlo como **público** o **privado** (público: acceso por enlace estable según política; privado: acceso solo vía API autorizada o URL prefirmada).
- **RF-A03:** Los metadatos persistidos deben **relacionar** el archivo con el **cliente**, la **clave API o contexto de creación** (según modelo), y la **ruta lógica** (equivalente a clave de objeto en almacenamiento tipo bucket), sin depender solo del sistema de ficheros para la verdad de negocio.
- **RF-A04:** La estructura de rutas debe ser **jerárquica** y alineada al modelo mental tipo **bucket S3**: prefijos por cliente → producto/servicio → usuario o segmento → tipo de contenido (IMG, PDF, etc.), adaptable por convención del integrador.

### 4.4 URLs prefirmadas y acceso temporal

- **RF-P01:** El sistema debe **generar URLs prefirmadas** (o equivalente con CDN) con **tiempo de expiración configurable** (ej. 15 minutos).
- **RF-P02:** Tras el vencimiento, el mismo enlace **no** debe permitir acceso al recurso.
- **RF-P03:** Este mecanismo se usa para **exhibición temporal** (galerías, vistas previas) sin dejar enlaces permanentes abiertos.

### 4.5 Privacidad entre usuarios (configurable)

- **RF-V01:** El producto debe permitir que el **cliente organizacional** defina políticas de **aislamiento** entre usuarios finales (ej. usuario A no accede a datos de B) o **visibilidad cruzada** si el negocio lo requiere.
- **RF-V02:** La implementación debe **inspirarse en modelos de permisos por prefijo/alcance** (similar a políticas sobre objetos en almacenamiento cloud), sin asumir un único comportamiento fijo para todos los clientes.

### 4.6 Auditoría (logs)

- **RF-L01:** Registrar eventos **relevantes** sobre archivos: **inserción**, **eliminación**, **consulta/acceso** (y los críticos acordados).
- **RF-L02:** Los logs deben **vencer por TTL** o política de retención para no saturar almacenamiento ni rendimiento.
- **RF-L03:** Evitar ruido excesivo (p. ej. no generar volúmenes desproporcionados en una sola operación masiva sin diseño explícito).

---

## 5. Requerimientos no funcionales

- **RNF-01 Seguridad — URLs:** Las respuestas al cliente **no** deben exponer rutas físicas del servidor ni identificadores internos que faciliten reconnaissance; el acceso a binarios debe mediar por **API** o **URLs prefirmadas/cdn**, no por paths crudos del host.
- **RNF-02 Base de datos:** Se recomienda **MongoDB** (u otra BD documental) para metadatos, relaciones cliente–clave–archivo y consultas rápidas por ruta/UID; la decisión final debe validarse con carga y consultas esperadas.
- **RNF-03 Almacenamiento de objetos:** Compatibilidad con modelo tipo **objeto + prefijo** (local en desarrollo, S3 u homólogo en producción).
- **RNF-04 Entornos:** Desarrollo y pruebas **locales** primero; posterior despliegue con **Mongo** (tier gratuito inicialmente si aplica) y escalado de coste por lectura/escritura según uso.
- **RNF-05 Consumo:** La API está pensada para **programadores**; la documentación OpenAPI/contratos debe ser primera clase.

---

## 6. Modelo conceptual de datos (borrador)

Relaciones mínimas a cubrir en diseño lógico:

1. **Cliente** (1) — (N) **Clave API**  
2. **Cliente** (1) — (N) **Archivo** (metadatos)  
3. **Clave API** — **Alcance** (directorios/prefijos permitidos) — relación **N:M** si varias claves aplican al mismo subárbol  
4. **Archivo** — **Ruta lógica / clave de objeto**, **visibilidad**, **referencia a cliente**, **timestamps**, **opcional: usuario lógico del espacio**

*(Los nombres de colecciones/tablas y normalización exacta son trabajo de diseño detallado.)*

---

## 7. Fases sugeridas

| Fase | Contenido |
|------|-----------|
| **1** | Cliente + claves API + CRUD archivos + metadatos en BD + almacenamiento local/S3 + permisos básicos por clave. |
| **2** | Asociación clave ↔ directorios principales; URLs prefirmadas con TTL; flags público/privado en subida. |
| **3** | Políticas de visibilidad entre usuarios finales por cliente; auditoría con TTL. |
| **4** | Endurecimiento, límites, rate limiting, observabilidad. |

---

## 8. Relación con el código actual del repositorio

El backend presente implementa una **primera iteración** centrada en **gestión de archivos** con rutas por entidad/tipo, almacenamiento local o S3 y API key **global opcional**. **No** cubre aún: registro de cliente organizacional, múltiples claves con permisos y alcance, metadatos en Mongo, URLs prefirmadas como requisito central, ni auditoría con TTL. Este documento define el **objetivo** hacia el cual debe evolucionar el servicio.

---

## 9. Criterios de aceptación globales (resumen)

- Un cliente registrado tiene **espacio raíz** identifiable y puede **crear estructura de carpetas** bajo reglas de negocio definidas.
- Puede existir **más de una clave API** por cliente, con **permisos distintos** y, en fase acordada, **restricción a prefijos** concretos.
- Las operaciones sobre archivos cumplen **crear / consultar / modificar / eliminar** según permisos de la clave.
- Los **enlaces de acceso temporal** expiran correctamente.
- **No** se filtran rutas físicas del servidor en las respuestas estándar de consumo.
- Existe **trazabilidad** de eventos críticos con **retención acotada**.

---

*Documento elaborado por síntesis de requerimientos discutidos en reunión; sujeto a validación formal con stakeholders antes de congelar alcance.*
