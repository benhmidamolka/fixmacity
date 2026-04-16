const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/chatbot.controller');
const authenticate = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const { chatbotLimiter } = require('../middleware/rateLimit');

router.use(authenticate, rbac('citizen'));

// POST /api/chatbot/message — rate limited: 20/min per user
router.post('/message', chatbotLimiter, [
  body('message').notEmpty().trim().withMessage('Message requis.'),
  body('session_id').optional().isUUID(),
], ctrl.sendMessage);

module.exports = router;
