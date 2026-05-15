// src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authenticate = require('../middleware/auth');
const {
  register,
  login,
  getMe,
  updateMe,
  updateProfile,
  updatePassword,
  logout,
  forgotPassword,
  resetPassword,
  refresh,
} = require('../controllers/auth.controller');

const passwordRules = body('password')
  .isLength({ min: 8 })
  .withMessage('Le mot de passe doit contenir au moins 8 caractères');

// Public
router.post('/register', [
  body('email').isEmail().withMessage('Email invalide'),
  body('first_name').notEmpty().withMessage('Prénom requis'),
  body('last_name').notEmpty().withMessage('Nom requis'),
  passwordRules,
], register);

router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
], login);

router.post('/refresh', refresh);

// Password reset flow
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Email invalide'),
], forgotPassword);

router.post('/reset-password', [
  body('token').notEmpty().withMessage('Token requis'),
  passwordRules,
], resetPassword);

// Protected
router.get('/me',           authenticate, getMe);
router.patch('/me',         authenticate, updateMe);
router.patch('/profil',     authenticate, updateProfile);
router.patch('/profile',    authenticate, updateProfile);
router.patch('/mot-de-passe', authenticate, [
  body('new_password').isLength({ min: 8 })
    .withMessage('Le nouveau mot de passe doit contenir au moins 8 caractères')
], updatePassword);
router.patch('/password', authenticate, [
  body('new_password').isLength({ min: 8 })
    .withMessage('Le nouveau mot de passe doit contenir au moins 8 caractères')
], updatePassword);
router.post('/logout',      authenticate, logout);

module.exports = router;