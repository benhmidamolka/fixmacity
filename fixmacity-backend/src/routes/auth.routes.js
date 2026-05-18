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
// ════════════════════════════════════════════════════════════════════════════
// PATCH: Add to src/app.js — update CORS to allow Supabase auth redirect
// ════════════════════════════════════════════════════════════════════════════

// In the cors options, ensure these origins are allowed:
// const corsOptions = {
//   origin: [
//     process.env.FRONTEND_URL,              // e.g. http://localhost:5174
//     'https://accounts.google.com',         // Google OAuth
//   ],
//   credentials: true,
// };

// ════════════════════════════════════════════════════════════════════════════
// PATCH: .env additions needed
// Add these to your fixmacity-backend/.env file
// ════════════════════════════════════════════════════════════════════════════

// # ── Supabase (needed for Google OAuth token validation) ────────────────
// SUPABASE_URL=https://your-project.supabase.co
// SUPABASE_SERVICE_ROLE_KEY=your_service_role_key   ← get from Supabase dashboard > Settings > API
//
// # ── Email (fix: code uses EMAIL_USER / EMAIL_PASS, not SMTP_USER) ──────
// EMAIL_USER=your-gmail@gmail.com      ← matches what email.service.js reads
// EMAIL_PASS=your-16-char-app-password ← Gmail App Password (not your real Gmail password)
// EMAIL_SERVICE=gmail
//
// # ── Frontend URL (used in reset link) ──────────────────────────────────
// FRONTEND_URL=http://localhost:5174   ← must match your Vite port

// ════════════════════════════════════════════════════════════════════════════
// PATCH: Add AuthCallback route to src/App.tsx
// ════════════════════════════════════════════════════════════════════════════

// 1. Import:
//    import AuthCallback from './pages/Public/AuthCallback'
//
// 2. Add route (public, no ProtectedRoute):
//    <Route path="/auth/callback" element={<AuthCallback />} />

// ════════════════════════════════════════════════════════════════════════════
// Supabase Dashboard setup (one-time)
// ════════════════════════════════════════════════════════════════════════════
//
// 1. Go to: supabase.com → your project → Authentication → Providers
// 2. Enable Google
// 3. Add your Google OAuth Client ID & Secret
//    (Get from: console.cloud.google.com → APIs & Services → Credentials)
//
// 4. In Google Cloud Console:
//    Authorized redirect URIs → add:
//    https://your-project.supabase.co/auth/v1/callback
//
// 5. In Supabase → Authentication → URL Configuration:
//    Site URL: http://localhost:5174
//    Redirect URLs: http://localhost:5174/auth/callback
//
// ════════════════════════════════════════════════════════════════════════════
// PATCH: Add to frontend .env (create fixmacity-frontend/.env)
// ════════════════════════════════════════════════════════════════════════════
//
// VITE_API_URL=http://localhost:5005/api
// VITE_SUPABASE_URL=https://your-project.supabase.co
// VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
module.exports = router;