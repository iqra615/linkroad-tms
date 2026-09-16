const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const controller = require('../controllers/reports.controller');

const router = express.Router();
router.use(requireAuth);

// Everyone sees the operational dashboard — it strips profit/revenue fields
// itself for non-admins (see operationalSummary). The dedicated Reports &
// Analytics page (financial summary, user-wise reports, export), though, is
// Administrator-only per company policy.
router.get('/dashboard/summary', asyncHandler(controller.operationalSummary));
router.get('/reports/summary', requireRole('Administrator'), asyncHandler(controller.financialSummary));
router.get('/reports/user-wise', requireRole('Administrator'), asyncHandler(controller.userWiseReport));
router.get('/reports/export', requireRole('Administrator'), asyncHandler(controller.exportLoads));

module.exports = router;
