'use strict';

const router = require('express').Router();
const publicCtrl = require('../controllers/public.controller');
const { generalLimiter } = require('../middleware/rateLimit');

// All endpoints fall under /api/public — no JWT/auth required.
router.use(generalLimiter);

// GET /api/public/declarations -> For the public map view
router.get('/declarations', publicCtrl.getPublicDeclarations);

// GET /api/public/declarations/:id/feedback -> For reading comments/score
router.get('/declarations/:id/feedback', publicCtrl.getDeclarationFeedback);

// GET /api/public/delegations -> For listing all delegations
router.get('/delegations', publicCtrl.getPublicDelegations);

module.exports = router;
