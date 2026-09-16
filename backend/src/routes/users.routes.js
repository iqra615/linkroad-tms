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
    body('username').trim().isLength({ min: 3, max: 64 }).withMessage('Username must be 3-64 characters.'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
    body('name').trim().notEmpty().withMessage('Full name is required.'),
    body('role').isIn(ROLES).withMessage(`Role must be one of: ${ROLES.join(', ')}.`)
  ],
  validate,
  asyncHandler(usersController.create)
);

router.put(
  '/:id',
  [
    param('id').isUUID(),
    body('name').optional().trim().notEmpty().withMessage('Full name cannot be empty.'),
    body('role').optional().isIn(ROLES).withMessage(`Role must be one of: ${ROLES.join(', ')}.`),
    body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
  ],
  validate,
  asyncHandler(usersController.update)
);

router.delete('/:id', [param('id').isUUID()], validate, asyncHandler(usersController.remove));

module.exports = router;
