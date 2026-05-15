const { healthMongo } = require('../db/mongoose');

async function health(req, res) {
  const mongo = healthMongo();
  const ok = mongo.status === 'up' || mongo.status === 'disabled';
  res.status(ok ? 200 : 503).json({
    ok,
    uptime: process.uptime(),
    db: { mongo },
  });
}

module.exports = { health };
