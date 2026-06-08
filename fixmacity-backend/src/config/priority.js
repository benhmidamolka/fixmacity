'use strict';

/**
 * priority.js — FixMaCity priority scoring constants
 *
 * Referenced by priority.service.js and declarations.controller.js
 */

// Weight added to the score for each sensitive place type confirmed by the citizen
const SENSITIVE_PLACE_WEIGHTS = {
  hospital : 4,
  school   : 3,
  mosque   : 2,
  park     : 1,
};

// Numeric score contributed by Gemini's danger_level assessment
const IMAGE_SCORE_MAP = {
  faible   : 2,
  moyenne  : 6,
  elevee   : 14,
  critique : 20,
};

// Score thresholds → priority_level label
// score < 15  → faible
// score < 35  → moyenne
// score >= 35 → elevee
// critique is NEVER assigned via thresholds alone (requires Gemini + sensitive place)
const THRESHOLDS = {
  faible  : 15,
  moyenne : 35,
};

// Valid priority_level values for validation
const VALID_PRIORITY_LEVELS = ['faible', 'moyenne', 'elevee', 'critique'];

module.exports = {
  SENSITIVE_PLACE_WEIGHTS,
  IMAGE_SCORE_MAP,
  THRESHOLDS,
  VALID_PRIORITY_LEVELS,
};
