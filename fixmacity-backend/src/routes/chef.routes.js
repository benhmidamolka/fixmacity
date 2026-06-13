'use strict';

const router   = require('express').Router();
const { body } = require('express-validator');
const ctrl     = require('../controllers/chef.controller');
const authenticate = require('../middleware/auth');
const rbac         = require('../middleware/rbac');

const multer = require('multer');
const memUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// DB role enum value is 'chef'
router.use(authenticate, rbac('chef'));

// ── Declarations ──────────────────────────────────────────────────────────────
router.get('/declarations',            ctrl.listDeclarations);
router.get('/declarations/:id',        ctrl.getDeclarationDetail);

router.post('/declarations/:id/accept', [
  body('agent_id').optional().isUUID().withMessage('Agent ID invalide.'),
], ctrl.acceptDeclaration);

router.post('/declarations/:id/assign-agents', [
  body('agent_ids').isArray({ min: 1 }).withMessage('Au moins un agent requis.'),
  body('agent_ids.*').isUUID().withMessage('Chaque agent_id doit être un UUID valide.'),
], ctrl.assignAgents);

router.post('/declarations/:id/refuse', [
  body('reason').notEmpty().trim().withMessage('Motif de refus requis.'),
], ctrl.refuseDeclaration);

router.post('/declarations/:id/secondary-departments', [
  body('department_id').isUUID().withMessage('department_id invalide.'),
], ctrl.addSecondaryDepartment);

router.post('/declarations/:id/photo', memUpload.single('photo'), ctrl.uploadPhoto);

router.get('/departments', ctrl.listDepartments);

// ── AI Priority Score ─────────────────────────────────────────────────────────
// Returns the computed AI priority score for a single declaration.
// Falls back to vote/sensitivity scoring if no photo or Gemini unreachable.
router.get('/declarations/:id/priority-score', ctrl.getPriorityScore);

// ── Agents ───────────────────────────────────────────────────────────────────
router.get('/agents',                     ctrl.listAgents);
router.patch('/agents/:id/deactivate',    ctrl.deactivateAgent);

// ── Dashboard & Export ────────────────────────────────────────────────────────
router.get('/dashboard', ctrl.dashboard);
router.get('/export',    ctrl.exportData);

module.exports = router;