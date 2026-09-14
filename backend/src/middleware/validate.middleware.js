const { validationResult } = require('express-validator');

/**
 * Place after express-validator check(...) chains on a route.
 * Short-circuits with 400 + field errors if validation failed.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed.',
      details: errors.array().map((e) => ({ field: e.path, message: e.msg }))
    });
  }
  return next();
}

module.exports = { validate };
