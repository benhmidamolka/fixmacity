const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/declarations.controller');
const authenticate = require('../middleware/auth');
const rbac = require('../middleware/rbac');

const citizenOnly = rbac('citizen');
const staffOrCitizen = rbac('citizen', 'agent', 'chef', 'president');

router.use(authenticate);

// POST /api/declarations
// FIX #6: latitude and longitude are now MANDATORY (PRD section 3.2.1 requires GPS).
// Without location the map view shows nothing and proximity check is useless.
router.post('/', citizenOnly, [
  body('title').notEmpty().trim().withMessage('Titre requis.'),
  body('description').notEmpty().trim().withMessage('Description requise.'),
  body('category').notEmpty().withMessage('Catégorie requise.'),
  body('latitude')
    .notEmpty().withMessage('Latitude requise.')
    .isFloat({ min: -90, max: 90 }).withMessage('Latitude invalide (entre -90 et 90).'),
  body('longitude')
    .notEmpty().withMessage('Longitude requise.')
    .isFloat({ min: -180, max: 180 }).withMessage('Longitude invalide (entre -180 et 180).'),
], ctrl.create);

// GET /api/declarations/mine
router.get('/mine', citizenOnly, ctrl.mine);

// GET /api/declarations/map — open to all authenticated roles
router.get('/map', ctrl.map);

// GET /api/declarations/nearby
router.get('/nearby', citizenOnly, ctrl.nearby);

// GET /api/declarations — all non-deleted declarations (for map/public list)
// Supports ?delegation_id= ?department_id= ?status= ?page= ?limit=
router.get('/', ctrl.getAll);

// POST /api/declarations/check-duplicate
router.post('/check-duplicate', citizenOnly, ctrl.checkDuplicate);

// GET /api/declarations/:id
router.get('/:id', staffOrCitizen, ctrl.getOne);

// PUT /api/declarations/:id
router.put('/:id', citizenOnly, [
  body('title').optional().notEmpty().trim(),
  body('description').optional().notEmpty().trim(),
  body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Latitude invalide.'),
  body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Longitude invalide.'),
], ctrl.update);

// DELETE /api/declarations/:id
router.delete('/:id', citizenOnly, ctrl.remove);

// POST /api/declarations/:id/vote
router.post('/:id/vote', citizenOnly, ctrl.vote);

// POST /api/declarations/:id/rate
router.post('/:id/rate', citizenOnly, [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Note entre 1 et 5.'),
  body('comment').optional().trim(),
], ctrl.rate);

module.exports = router;