const { ensureServerReady } = require('../ensureServerReady');

async function ensureServerReadyMiddleware(req, res, next) {
  try {
    await ensureServerReady();
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = ensureServerReadyMiddleware;
