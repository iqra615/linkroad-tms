const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const controller = require('../controllers/reports.controller');

const router = express.Router();
router.use(requireAuth);

router.get('/dashboard/summary', asyncHandler(controller.operationalSummary));
router.get('/reports/summary', asyncHandler(controller.financialSummary));
router.get('/reports/user-wise', asyncHandler(controller.userWiseReport));
router.get('/reports/export', asyncHandler(controller.exportLoads));

module.exports = router;
