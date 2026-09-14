const express = require('express');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const usersController = require('../controllers/users.controller');

const router = express.Router();
const ROLES = ['Administrator', 'Dispatcher', 'Accounting'];

router.use(requireAuth, requireRole('Administrator'));

router.get('/', asyncHandler(usersController.list));

router.post(
  '/',
  [
    body('username').trim().isLength({ min: 3, max: 64 }),
    body('password').isLength({ min: 8 }),
    body('name').trim().notEmpty(),
    body('role').isIn(ROLES)
  ],
  validate,
  asyncHandler(usersController.create)
);

router.put(
  '/:id',
  [
    param('id').isUUID(),
    body('name').optional().trim().notEmpty(),
    body('role').optional().isIn(ROLES),
    body('password').optional().isLength({ min: 8 })
  ],
  validate,
  asyncHandler(usersController.update)
);

router.delete('/:id', [param('id').isUUID()], validate, asyncHandler(usersController.remove));

module.exports = router;
