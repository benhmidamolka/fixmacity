'use strict';

const express = require('express');
const { body } = require('express-validator');
const authenticate = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const cp = require('../controllers/propositions.controller');

const router = express.Router();

router.use(authenticate);

// List active/closed propositions
router.get('/', cp.listPropositions);

// Vote on a proposition
router.post(
  '/:id/vote',
  rbac('citizen'),
  cp.voteProposition
);

// Create a suggestion (Citizen & President)
router.post(
  '/',
  rbac('citizen', 'president'),
  [
    body('title').notEmpty().withMessage('Titre requis.').isLength({ min: 3 }),
  ],
  cp.createProposition
);

// Respond to a suggestion (President only)
router.patch(
  '/:id/respond',
  rbac('president'),
  [
    body('status').isIn(['a_discuter', 'retenu', 'refuse']).withMessage('Statut invalide.'),
    body('president_response').optional().isString()
  ],
  cp.respondToProposition
);

router.get(
  '/:id/summary',
  cp.getPropositionSummary
);

module.exports = router;
