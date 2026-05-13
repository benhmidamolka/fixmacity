const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/president.controller');
const authenticate = require('../middleware/auth');
const rbac = require('../middleware/rbac');

// All routes require auth + president role
router.use(authenticate, rbac('president'));

// ── Declarations ──
router.get('/declarations', ctrl.listDeclarations);
router.get('/declarations/:id', ctrl.getDeclarationDetail);

router.post('/declarations/:id/assign', [
  body('department_id').isUUID().withMessage('Département invalide (UUID attendu).'),
], ctrl.assignDeclaration);

router.post('/declarations/:id/reassign', [
  body('department_id').isUUID().withMessage('Département invalide (UUID attendu).'),
], ctrl.reassignDeclaration);

// ── Declaration Comments ──
router.get('/declarations/:id/comments', ctrl.listComments);
router.post('/declarations/:id/comments', [
  body('content').notEmpty().trim().withMessage('Contenu requis.'),
], ctrl.addComment);

// ── Users ──
router.get('/users', ctrl.listUsers);

router.post('/users', [
  body('email').isEmail().withMessage('Email invalide.'),
  body('password').isLength({ min: 8 }).withMessage('Mot de passe : 8 caractères minimum.'),
  body('first_name').notEmpty().trim().withMessage('Prénom requis.'),
  body('last_name').notEmpty().trim().withMessage('Nom requis.'),
  body('role').isIn(['agent', 'chef']).withMessage('Rôle invalide (agent ou chef).'),
  body('department_id').optional().isUUID().withMessage('Département invalide.'),
  body('delegation_id').optional().isUUID().withMessage('Délégation invalide.'),
], ctrl.createUser);

router.patch('/users/:id', ctrl.updateUser);
router.delete('/users/:id', ctrl.deleteUser);

// ── Departments ──
router.get('/departments', ctrl.listDepartments);
router.patch('/departments/:id/status', ctrl.updateDepartmentStatus);

// ── Propositions ──
router.get('/propositions', ctrl.listPropositions);
router.post('/propositions', [
  body('title').notEmpty().trim().withMessage('Titre requis.'),
  body('description').notEmpty().trim().withMessage('Description requise.'),
], ctrl.createProposition);

router.post('/propositions/:id/confirmer', ctrl.confirmProposition);
router.post('/propositions/:id/retenu', ctrl.retainProposition);
router.get('/propositions/:id/summary', ctrl.getPropositionSummary);
router.patch('/propositions/:id/respond', [
  body('status').isIn(['a_discuter', 'retenu', 'refuse']).withMessage('Statut invalide.'),
  body('president_response').optional().isString()
], ctrl.respondToProposition);

// ── Dashboard & Export ──
router.get('/dashboard', ctrl.dashboard);
router.get('/export', ctrl.exportData);

module.exports = router;