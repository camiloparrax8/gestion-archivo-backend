const sharp = require('sharp');

const VARIANT_PRESETS = {
  thumb: { maxWidth: 400, quality: 80 },
  medium: { maxWidth: 1200, quality: 85 },
};

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

/**
 * @param {string | null | undefined} mime
 */
function esMimeImagenOptimizable(mime) {
  return IMAGE_MIMES.has(String(mime || '').toLowerCase());
}

/**
 * Genera buffers WebP para thumb y medium desde un buffer de imagen.
 * @param {Buffer} inputBuffer
 * @returns {Promise<{ thumb: Buffer, medium: Buffer }>}
 */
async function generarBuffersVariantes(inputBuffer) {
  const base = sharp(inputBuffer, { failOn: 'none' }).rotate();
  const [thumb, medium] = await Promise.all(
    Object.entries(VARIANT_PRESETS).map(async ([, preset]) =>
      base
        .clone()
        .resize({ width: preset.maxWidth, withoutEnlargement: true })
        .webp({ quality: preset.quality })
        .toBuffer(),
    ),
  );
  return { thumb, medium };
}

module.exports = {
  VARIANT_PRESETS,
  IMAGE_MIMES,
  esMimeImagenOptimizable,
  generarBuffersVariantes,
};
