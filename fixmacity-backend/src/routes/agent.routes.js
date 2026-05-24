// src/routes/agent.routes.js
'use strict';
const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const authenticate = require('../middleware/auth');
const rbac         = require('../middleware/rbac');
const ctrl         = require('../controllers/agent.controller');

// ── Memory multer for photo uploads ──────────────────────────────────────────
const memUpload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    allowed.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Type de fichier non autorisé (jpeg/png/webp uniquement).'));
  },
});

// All routes require a valid JWT + agent role
router.use(authenticate, rbac('agent'));

// ── KPI stats ─────────────────────────────────────────────────────────────────
router.get('/stats', ctrl.getStats);

// ── Declaration CRUD ──────────────────────────────────────────────────────────
router.get('/declarations',               ctrl.getDeclarations);
router.get('/declarations/:id',           ctrl.getDeclarationById);
router.post('/declarations/:id/accept',   ctrl.acceptDeclaration);
router.post('/declarations/:id/refuse',   ctrl.refuseDeclaration);
router.post('/declarations/:id/photo',    memUpload.single('photo'), ctrl.uploadPhoto);
router.post('/declarations/:id/resolve',  ctrl.resolveDeclaration);
router.post('/declarations/:id/close',    ctrl.closeDeclaration);

// ── Internal comments ─────────────────────────────────────────────────────────
router.get('/declarations/:id/comments',  ctrl.getComments);
router.post('/declarations/:id/comments', ctrl.addComment);

module.exports = router;