const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { validate } = require('../middleware/validate.middleware');
const { requireAuth } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const authController = require('../controllers/auth.controller');

const router = express.Router();

// Slow down brute-force attempts against login without affecting normal use.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait a few minutes and try again.' }
});

const credentialRules = [
  body('username').trim().isLength({ min: 3, max: 64 }).withMessage('Username must be 3-64 characters.'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
];

router.post(
  '/register',
  [...credentialRules, body('name').trim().notEmpty().withMessage('Name is required.')],
  validate,
  asyncHandler(authController.register)
);

router.post('/login', loginLimiter, credentialRules, validate, asyncHandler(authController.login));

router.get('/me', requireAuth, asyncHandler(authController.me));

module.exports = router;
