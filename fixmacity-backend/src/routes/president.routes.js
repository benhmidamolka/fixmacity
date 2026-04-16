const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/president.controller');
const authenticate = require('../middleware/auth');
const rbac = require('../middleware/rbac');

router.use(authenticate, rbac('president'));

// ── Declarations ──────────────────────────────────────────────
router.get('/declarations', ctrl.listDeclarations);

router.post('/declarations/:id/assign', [
  body('department_id').isUUID().withMessage('Département invalide.'),
], ctrl.assignDeclaration);

router.post('/declarations/:id/reassign', [
  body('department_id').isUUID().withMessage('Département invalide.'),
], ctrl.reassignDeclaration);

// ── Users ─────────────────────────────────────────────────────
router.get('/users', ctrl.listUsers);

router.post('/users', [
  body('email').isEmail().withMessage('Email invalide.'),
  body('password').isLength({ min: 8 }).withMessage('Mot de passe : 8 caractères minimum.'),
  body('first_name').notEmpty().trim().withMessage('Prénom requis.'),
  body('last_name').notEmpty().trim().withMessage('Nom requis.'),
  body('role').isIn(['agent', 'chef']).withMessage('Rôle invalide.'),
], ctrl.createUser);

router.patch('/users/:id', ctrl.updateUser);
router.delete('/users/:id', ctrl.deleteUser);

// ── Departments ───────────────────────────────────────────────
router.get('/departments', ctrl.listDepartments);

router.post('/departments', [
  body('name_fr').notEmpty().trim().withMessage('Nom français requis.'),
  body('code')
    .notEmpty().trim()
    .isLength({ min: 2, max: 5 }).withMessage('Le code doit comporter entre 2 et 5 caractères.')
    .matches(/^[A-Z0-9]+$/i).withMessage('Le code ne peut contenir que des lettres et chiffres.'),
  body('name_ar').optional().trim(),
  body('name_en').optional().trim(),
  body('description').optional().trim(),
], ctrl.createDepartment);

router.patch('/departments/:id', [
  body('name_fr').optional().notEmpty().trim(),
  body('name_ar').optional().trim(),
  body('name_en').optional().trim(),
  body('description').optional().trim(),
  body('is_active').optional().isBoolean(),
], ctrl.updateDepartment);

router.delete('/departments/:id', ctrl.deleteDepartment);

// ── Propositions ──────────────────────────────────────────────
router.post('/propositions', [
  body('title').notEmpty().trim().withMessage('Titre requis.'),
  body('description').notEmpty().trim().withMessage('Description requise.'),
], ctrl.createProposition);

// ── Dashboard & Export ────────────────────────────────────────
router.get('/dashboard', ctrl.dashboard);
router.get('/export', ctrl.exportData);

module.exports = router;