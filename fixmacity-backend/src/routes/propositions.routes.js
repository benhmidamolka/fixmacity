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

// Create a proposition (President only)
router.post(
  '/',
  rbac('president'),
  [
    body('title').notEmpty().withMessage('Titre requis.'),
    body('start_date').isISO8601().withMessage('Date de début valide requise.'),
    body('end_date').isISO8601().withMessage('Date de fin valide requise.')
  ],
  cp.createProposition
);

module.exports = router;
