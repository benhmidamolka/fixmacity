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
          // Strip HTML tags and dangerous protocols
          obj[key] = obj[key]
            .replace(/<[^>]*>/g, '')               // Remove HTML tags
            .replace(/javascript\s*:/gi, '')       // Remove JS events
            .replace(/data:\s*/gi, '')             // Remove data URLs
            .replace(/file:\s*/gi, '')             // Remove file URLs
            .trim();
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
