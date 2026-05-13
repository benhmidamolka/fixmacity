'use strict';

/**
 * Input sanitization middleware.
 * Strips HTML tags and trims whitespace from all string fields in req.body.
 * Prevents basic XSS attacks via user input.
 */
const sanitize = (req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    const clean = (obj) => {
      for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'string') {
          // Strip HTML tags
          obj[key] = obj[key].replace(/<[^>]*>/g, '').trim();
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          clean(obj[key]);
        }
      }
    };
    clean(req.body);
  }
  next();
};

module.exports = sanitize;
