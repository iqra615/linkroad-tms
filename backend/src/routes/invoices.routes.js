const express = require('express');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { requireAuth } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const controller = require('../controllers/invoices.controller');

const router = express.Router();
router.use(requireAuth);

router.get('/', asyncHandler(controller.list));
router.get('/:id', [param('id').isUUID()], validate, asyncHandler(controller.getOne));

router.post(
  '/',
  [
    body('load_id').isUUID().withMessage('A valid load_id is required.'),
    body('amount').optional({ checkFalsy: true }).isFloat({ min: 0 }),
    body('due_date').optional({ checkFalsy: true }).isDate()
  ],
  validate,
  asyncHandler(controller.create)
);

router.put(
  '/:id',
  [
    param('id').isUUID(),
    body('amount').optional({ checkFalsy: true }).isFloat({ min: 0 }),
    body('due_date').optional({ checkFalsy: true }).isDate()
  ],
  validate,
  asyncHandler(controller.update)
);

router.patch(
  '/:id/status',
  [param('id').isUUID(), body('status').isIn(['Not Sent', 'Sent', 'Paid', 'Overdue', 'Void'])],
  validate,
  asyncHandler(controller.setStatus)
);

router.delete('/:id', [param('id').isUUID()], validate, asyncHandler(controller.remove));

module.exports = router;
