/** override: true evita que variables vacías del entorno (p. ej. IDE) impidan leer el .env. */
require('dotenv').config({ override: true });

const config = require('./config');
const { ensureServerReady } = require('./ensureServerReady');

(async function iniciar() {
  try {
    await ensureServerReady();
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }

  const app = require('./app');
  app.listen(config.port, () => {
    const modo = config.storageDriver === 's3' ? 'S3' : 'disco local';
    const auth = config.mongodbUri ? 'API keys (MongoDB)' : 'API_KEY global opcional';
    console.log(
      `Servidor Orion Marketplace en http://localhost:${config.port} (multimedia: ${modo}, auth: ${auth})`,
    );
  });
})();
