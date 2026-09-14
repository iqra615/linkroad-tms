const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const controller = require('../controllers/dashboard.controller');

const router = express.Router();
router.use(requireAuth);

router.get('/summary', asyncHandler(controller.summary));

module.exports = router;
