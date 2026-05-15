const authService = require('../services/authService');
const AppError = require('../utils/AppError');

async function register(req, res) {
  const { email, nombre, password, rol } = req.body || {};
  if (!email || !nombre || !password) {
    throw new AppError('email, nombre y password son obligatorios', 400);
  }
  const data = await authService.register({ email, nombre, password, rol });
  res.status(201).json({ data });
}

async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    throw new AppError('email y password son obligatorios', 400);
  }
  const data = await authService.login({ email, password });
  res.json({ data });
}

async function me(req, res) {
  const data = await authService.getMe(req.user._id);
  res.json({ data });
}

module.exports = { register, login, me };
