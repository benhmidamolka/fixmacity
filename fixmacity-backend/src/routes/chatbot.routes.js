const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/chatbot.controller');
const authenticate = require('../middleware/auth');
const { chatbotLimiter } = require('../middleware/rateLimit');

router.use(authenticate);

router.post('/message', 
  chatbotLimiter,
  [
    body('message')
      .notEmpty()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Message requis (max 1000 caractères).')
  ],
  ctrl.sendMessage
);

module.exports = router;
