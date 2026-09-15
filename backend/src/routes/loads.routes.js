const express = require('express');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { requireAuth } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const controller = require('../controllers/loads.controller');

const router = express.Router();
router.use(requireAuth);

const STATUSES = [
  'New Load', 'Available for Pickup', 'Pickup Scheduled', 'At Port', 'Gate Out', 'Picked Up', 'In Transit',
  'Delivery Scheduled', 'At Delivery', 'Delivered', 'POD Pending', 'Empty Pending', 'Empty / POD Pending',
  'Empty Return Scheduled', 'Empty Returned', 'Completed', 'Find Carrier', 'Carrier Assigned', 'Customs Hold',
  'Freight Hold', 'Exam Site', 'Driver Delayed', 'Port Congestion', 'Cancelled'
];
const LOAD_TYPES = ['Import', 'Export', 'Import / Rail', 'Export / Rail'];
const CONTAINER_TYPES = [
  '20 Standard (20ST)', '40 Standard (40ST)', '40 High Cube (40HC)', '45 High Cube (45HC)',
  '20 Reefer (20RF)', '40 Reefer (40RF)', 'Open Top (OT)', 'Flat Rack (FR)'
];

const bodyRules = [
  body('entity_id').isUUID().withMessage('entity_id is required.'),
  body('load_number').optional({ checkFalsy: true }).isString(),
  body('dispatcher_user_id').optional({ checkFalsy: true }).isUUID(),
  body('customer_id').optional({ checkFalsy: true }).isUUID(),
  body('carrier_id').optional({ checkFalsy: true }).isUUID(),
  body('consignee_id').optional({ checkFalsy: true }).isUUID(),
  body('load_type').optional({ checkFalsy: true }).isIn(LOAD_TYPES),
  body('origin').optional({ checkFalsy: true }).isString(),
  body('deliver_to_address').optional({ checkFalsy: true }).isString(),
  body('empty_return_location').optional({ checkFalsy: true }).isString(),
  body('container_number').optional({ checkFalsy: true }).isString(),
  body('container_type').optional({ checkFalsy: true }).isIn(CONTAINER_TYPES),
  body('bol_number').optional({ checkFalsy: true }).isString(),
  body('seal_number').optional({ checkFalsy: true }).isString(),
  body('reference_number').optional({ checkFalsy: true }).isString(),
  body('pickup_number').optional({ checkFalsy: true }).isString(),
  body('weight').optional({ checkFalsy: true }).isString(),
  body('commodity_desc').optional({ checkFalsy: true }).isString(),
  body('packages_qty').optional({ checkFalsy: true }).isString(),
  body('packages_desc').optional({ checkFalsy: true }).isString(),
  body('eta_date').optional({ checkFalsy: true }).isDate(),
  body('lfd_date').optional({ checkFalsy: true }).isDate(),
  body('pickup_date').optional({ checkFalsy: true }).isDate(),
  body('delivery_date').optional({ checkFalsy: true }).isDate(),
  body('empty_return_date').optional({ checkFalsy: true }).isDate(),
  body('completed_date').optional({ checkFalsy: true }).isDate(),
  body('carrier_rate').optional({ checkFalsy: true }).isFloat({ min: 0 }),
  body('customer_charge').optional({ checkFalsy: true }).isFloat({ min: 0 }),
  body('status').optional({ checkFalsy: true }).isIn(STATUSES),
  body('notes').optional({ checkFalsy: true }).isString()
];

router.get('/', asyncHandler(controller.list));
router.get('/:id', [param('id').isUUID()], validate, asyncHandler(controller.getOne));
router.post('/', bodyRules, validate, asyncHandler(controller.create));
router.put('/:id', [param('id').isUUID(), ...bodyRules], validate, asyncHandler(controller.update));
router.delete('/:id', [param('id').isUUID()], validate, asyncHandler(controller.remove));

router.patch(
  '/:id/carrier-payment',
  [param('id').isUUID(), body('status').isIn(['Invoice Received', 'Pending', 'Done'])],
  validate,
  asyncHandler(controller.setCarrierPayment)
);

module.exports = router;
