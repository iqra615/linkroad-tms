const express = require('express');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { requireAuth } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const controller = require('../controllers/customers.controller');

const router = express.Router();
router.use(requireAuth);

const bodyRules = [
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('contact_name').optional({ checkFalsy: true }).isString(),
  body('phone').optional({ checkFalsy: true }).isString(),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Must be a valid email.'),
  body('address').optional({ checkFalsy: true }).isString(),
  body('terms').optional({ checkFalsy: true }).isIn(['Net 15', 'Net 30', 'Net 45', 'Due on Receipt'])
];

router.get('/', asyncHandler(controller.list));
router.get('/:id', [param('id').isUUID()], validate, asyncHandler(controller.getOne));
router.post('/', bodyRules, validate, asyncHandler(controller.create));
router.put('/:id', [param('id').isUUID(), ...bodyRules], validate, asyncHandler(controller.update));
router.delete('/:id', [param('id').isUUID()], validate, asyncHandler(controller.remove));

module.exports = router;
