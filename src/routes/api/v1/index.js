const express = require('express');
const productRoutes = require('./products.routes');
const multimediaRoutes = require('./multimedia.routes');
const adminRoutes = require('./admin.routes');
const authRoutes = require('./auth.routes');
const clientRoutes = require('./client.routes');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    message: 'Orion Marketplace API v1',
    resources: {
      products: '/api/v1/products',
      multimedia: '/api/v1/multimedia',
      auth: '/api/v1/auth',
      admin: '/api/v1/admin (Bearer token admin)',
      client: '/api/v1/client (Bearer token cliente)',
    },
  });
});

router.use('/products', productRoutes);
router.use('/multimedia', multimediaRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/client', clientRoutes);

module.exports = router;
