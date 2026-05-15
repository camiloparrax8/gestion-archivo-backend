const mongoose = require('mongoose');
const config = require('../config');

let conectado = false;

async function conectarMongo() {
  if (!config.mongodbUri) {
    return null;
  }
  if (conectado) {
    return mongoose.connection;
  }
  mongoose.set('strictQuery', true);
  await mongoose.connect(config.mongodbUri);
  conectado = true;
  return mongoose.connection;
}

function healthMongo() {
  if (!config.mongodbUri) {
    return { enabled: false, status: 'disabled' };
  }
  return { enabled: true, status: mongoose.connection.readyState === 1 ? 'up' : 'down' };
}

module.exports = { conectarMongo, healthMongo, mongoose };
