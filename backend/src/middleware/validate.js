'use strict';
const { validationResult } = require('express-validator');

function validate(chains) {
  return async (req, res, next) => {
    await Promise.all(chains.map((chain) => chain.run(req)));
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      next();
      return;
    }
    res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map((e) => ({ field: e.type === 'field' ? e.path : 'unknown', message: e.msg })),
    });
  };
}

module.exports = { validate };
