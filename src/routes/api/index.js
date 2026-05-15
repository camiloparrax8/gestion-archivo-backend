const express = require('express');
const v1 = require('./v1');
const apiInfoController = require('../../controllers/apiInfoController');

const router = express.Router();

router.get('/', apiInfoController.getRoot);
router.use('/v1', v1);

module.exports = router;
