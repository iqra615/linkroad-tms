const express = require('express');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { requireAuth } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const controller = require('../controllers/loads.controller');

const router = express.Router();
router.use(requireAuth);

const STATUSES = ['Dispatched', 'In Transit', 'At Delivery', 'Delivered', 'On Hold', 'Cancelled'];

const bodyRules = [
  body('load_number').optional().isString(),
  body('customer_id').optional({ checkFalsy: true }).isUUID(),
  body('carrier_id').optional({ checkFalsy: true }).isUUID(),
  body('consignee_id').optional({ checkFalsy: true }).isUUID(),
  body('origin').optional().isString(),
  body('container_number').optional().isString(),
  body('bol_number').optional().isString(),
  body('weight').optional().isString(),
  body('equipment_type').optional().isString(),
  body('commodity_desc').optional().isString(),
  body('carrier_rate').optional({ checkFalsy: true }).isFloat({ min: 0 }),
  body('customer_rate').optional({ checkFalsy: true }).isFloat({ min: 0 }),
  body('status').optional().isIn(STATUSES),
  body('pickup_date').optional({ checkFalsy: true }).isDate(),
  body('delivery_date').optional({ checkFalsy: true }).isDate(),
  body('notes').optional().isString()
];

router.get('/', asyncHandler(controller.list));
router.get('/:id', [param('id').isUUID()], validate, asyncHandler(controller.getOne));
router.post('/', bodyRules, validate, asyncHandler(controller.create));
router.put('/:id', [param('id').isUUID(), ...bodyRules], validate, asyncHandler(controller.update));
router.delete('/:id', [param('id').isUUID()], validate, asyncHandler(controller.remove));

router.patch(
  '/:id/carrier-payment',
  [param('id').isUUID(), body('status').isIn(['Paid', 'Unpaid'])],
  validate,
  asyncHandler(controller.setCarrierPayment)
);

module.exports = router;
