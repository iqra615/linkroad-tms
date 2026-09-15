const express = require('express');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const controller = require('../controllers/entities.controller');

const router = express.Router();
router.use(requireAuth);

router.get('/', asyncHandler(controller.list));
router.get('/:id', [param('id').isUUID()], validate, asyncHandler(controller.getOne));

// Only admins edit company contact info / logo — the 3 entities themselves are fixed.
router.put(
  '/:id',
  requireRole('Administrator'),
  [
    param('id').isUUID(),
    body('name').trim().notEmpty(),
    body('email').optional({ checkFalsy: true }).isEmail(),
    body('address').optional().isString(),
    body('phone').optional().isString(),
    body('website').optional().isString()
  ],
  validate,
  asyncHandler(controller.update)
);

module.exports = router;
