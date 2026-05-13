const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/auth.controller');
const authenticate = require('../middleware/auth');

// POST /api/auth/register — Public (citizen self-registration)
router.post('/register', [
  body('email').isEmail().withMessage('Email invalide.'),
  body('password').isLength({ min: 8 }).withMessage('Mot de passe : 8 caractères minimum.'),
  body('first_name').notEmpty().trim().withMessage('Prénom requis.'),
  body('last_name').notEmpty().trim().withMessage('Nom requis.'),
  body('delegation_id').optional().isUUID().withMessage('Délégation invalide (UUID attendu).'),
], ctrl.register);

// POST /api/auth/login — Public
router.post('/login', [
  body('email').isEmail().withMessage('Email invalide.'),
  body('password').notEmpty().withMessage('Mot de passe requis.'),
], ctrl.login);

// POST /api/auth/forgot-password — Public
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Email invalide.'),
], ctrl.forgotPassword);

// POST /api/auth/reset-password — Public
router.post('/reset-password', [
  body('newPassword').isLength({ min: 8 }).withMessage('Mot de passe : 8 caractères minimum.'),
  body('token').notEmpty().withMessage('Token requis.'),
], ctrl.resetPassword);

// GET /api/auth/me — Auth required
router.get('/me', authenticate, ctrl.me);

// PATCH /api/auth/me — Auth required
router.patch('/me', authenticate, ctrl.updateMe);

// POST /api/auth/logout — Auth required
router.post('/logout', authenticate, ctrl.logout);

module.exports = router;