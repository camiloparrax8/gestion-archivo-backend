/**
 * Backfill de variantes thumb/medium para imágenes ya subidas.
 * Uso: node scripts/generate-image-variants.js --limit=100
 */
require('dotenv').config();
const config = require('../src/config');
const { conectarMongo, mongoose } = require('../src/db/mongoose');
const Archivo = require('../src/models/Archivo');
const imageVariantsService = require('../src/services/imageVariantsService');
const imageProcessingService = require('../src/services/imageProcessingService');

function parseLimit(argv) {
  const raw = argv.find((arg) => arg.startsWith('--limit='));
  const parsed = Number(raw ? raw.split('=')[1] : 100);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 100;
  }
  return Math.min(parsed, 5000);
}

async function main() {
  const limit = parseLimit(process.argv.slice(2));
  if (!config.mongodbUri) {
    console.error('MONGODB_URI es obligatorio para el backfill de variantes.');
    process.exit(1);
  }

  await conectarMongo();
  console.log(`Procesando hasta ${limit} imágenes…`);

  const docs = await Archivo.find({
    mime: { $in: [...imageProcessingService.IMAGE_MIMES] },
  })
    .select('cliente rutaRelativa mime nombre')
    .limit(limit)
    .lean();

  let generadas = 0;
  let omitidas = 0;
  let errores = 0;

  for (const doc of docs) {
    try {
      const resultado = await imageVariantsService.generarYPersistirSiFaltan(
        doc.cliente,
        doc.rutaRelativa,
        doc.mime,
      );
      if (resultado.generadas) {
        generadas += 1;
        console.log(`OK ${doc.rutaRelativa}`);
      } else {
        omitidas += 1;
      }
    } catch (err) {
      errores += 1;
      console.error(`ERR ${doc.rutaRelativa}: ${err.message}`);
    }
  }

  console.log(
    `Listo. generadas=${generadas} omitidas=${omitidas} errores=${errores} total=${docs.length}`,
  );
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
