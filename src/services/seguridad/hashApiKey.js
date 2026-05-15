const crypto = require('crypto');

function hashApiKey(plain) {
  return crypto.createHash('sha256').update(String(plain), 'utf8').digest('hex');
}

function generarApiKeyPlano() {
  return `orion_${crypto.randomBytes(32).toString('hex')}`;
}

module.exports = { hashApiKey, generarApiKeyPlano };
