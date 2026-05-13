const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/chef.controller');
const authenticate = require('../middleware/auth');
const rbac = require('../middleware/rbac');

// DB role enum value is 'chef' (not 'chef_service')
router.use(authenticate, rbac('chef'));

router.get('/declarations', ctrl.listDeclarations);
router.get('/declarations/:id', ctrl.getDeclarationDetail);

router.post('/declarations/:id/accept', [
  body('agent_id').optional().isUUID().withMessage('Agent ID invalide.'),
], ctrl.acceptDeclaration);

router.post('/declarations/:id/refuse', [
  body('reason').notEmpty().trim().withMessage('Motif de refus requis.'),
], ctrl.refuseDeclaration);

// ── Declaration Comments (chef sees president_chef + chef_agent channels) ──
router.get('/declarations/:id/comments', ctrl.listComments);
router.post('/declarations/:id/comments', [
  body('content').notEmpty().trim().withMessage('Contenu requis.'),
  body('channel').optional().isIn(['president_chef', 'chef_agent']),
], ctrl.addComment);

router.get('/agents', ctrl.listAgents);
router.post('/agents', ctrl.addAgent);
router.put('/agents/:id', ctrl.updateAgent);
router.patch('/agents/:id/toggle-status', ctrl.toggleAgentStatus);

router.get('/dashboard', ctrl.dashboard);
router.get('/export', ctrl.exportData);

module.exports = router;