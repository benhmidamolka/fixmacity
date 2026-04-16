const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/chef.controller');
const authenticate = require('../middleware/auth');
const rbac = require('../middleware/rbac');

router.use(authenticate, rbac('chef'));

// ── Declarations ──────────────────────────────────────────────
router.get('/declarations', ctrl.listDeclarations);

router.post('/declarations/:id/accept', [
  body('agent_id').optional().isUUID().withMessage('Agent ID invalide.'),
], ctrl.acceptDeclaration);

router.post('/declarations/:id/refuse', [
  body('reason').notEmpty().trim().withMessage('Motif de refus requis.'),
], ctrl.refuseDeclaration);

// ── Agents ────────────────────────────────────────────────────
router.get('/agents', ctrl.listAgents);
router.patch('/agents/:id/deactivate', ctrl.deactivateAgent);

// ── Department (own department only) ─────────────────────────
// PRD 3.2.3: Chef can view and modify their département configuration
router.get('/department', ctrl.getDepartment);

router.patch('/department', [
  body('name_fr').optional().notEmpty().trim().withMessage('Le nom français ne peut pas être vide.'),
  body('name_ar').optional().trim(),
  body('name_en').optional().trim(),
  body('description').optional().trim(),
], ctrl.updateDepartment);

// ── Dashboard & Export ────────────────────────────────────────
router.get('/dashboard', ctrl.dashboard);
router.get('/export', ctrl.exportData);

module.exports = router;