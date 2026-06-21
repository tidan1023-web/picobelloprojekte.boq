'use strict';

// Recursively removes keys that start with '$' or contain '.' from user-supplied
// objects. This prevents NoSQL operator injection attacks against MongoDB.
function sanitizeValue(val) {
  if (Array.isArray(val)) return val.map(sanitizeValue);
  if (val !== null && typeof val === 'object') return sanitizeObject(val);
  return val;
}

function sanitizeObject(obj) {
  const out = {};
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) continue;
    out[key] = sanitizeValue(obj[key]);
  }
  return out;
}

function mongoSanitize(req, _res, next) {
  if (req.body && typeof req.body === 'object') req.body = sanitizeObject(req.body);
  if (req.query && typeof req.query === 'object') req.query = sanitizeObject(req.query);
  next();
}

module.exports = { mongoSanitize };
