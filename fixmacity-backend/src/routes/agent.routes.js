'use strict';

/**
 * agent.routes.js
 *
 * IMPORTANT — photo upload middleware order:
 *
 * The authenticate middleware makes 2 async DB calls (~50-200ms).
 * During that time, Postman finishes sending the multipart body.
 * Node.js TCP buffers the data but multer's busboy never attaches
 * a 'data' listener in time — so the stream appears empty.
 *
 * FIX: Run multer.memoryStorage() BEFORE authenticate on the photo route.
 * We use memoryStorage so the file is held in memory (req.file.buffer),
 * then write it to disk ourselves in the controller after auth passes.
 *
 * All other routes keep authenticate first as normal.
 */

const router = require('express').Router();
const { body } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ctrl = require('../controllers/agent.controller');
const authenticate = require('../middleware/auth');
const rbac = require('../middleware/rbac');

// ── Memory-based multer for photo upload ─────────────────────
// Runs BEFORE authenticate so the stream is captured immediately
const memUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Type de fichier non autorisé. Utilisez JPEG, PNG ou WebP.'));
  },
});

// ── Photo upload — multer FIRST, then auth ────────────────────
router.post('/declarations/:id/photo',
  memUpload.single('photo'),  // ← captures stream immediately, stores in memory
  authenticate,               // ← DB queries happen AFTER file is buffered
  rbac('agent'),
  ctrl.uploadPhoto
);

router.post('/declarations/:id/photos',
  memUpload.single('photo'),
  authenticate,
  rbac('agent'),
  ctrl.uploadPhoto
);

// ── All other routes — auth first as normal ───────────────────
router.use(authenticate, rbac('agent'));

router.get('/declarations', ctrl.listDeclarations);
router.post('/declarations/:id/accept', ctrl.acceptDeclaration);

router.post('/declarations/:id/refuse', [
  body('reason').notEmpty().trim().withMessage('Motif de refus requis.'),
], ctrl.refuseDeclaration);

router.post('/declarations/:id/resolve', ctrl.resolveDeclaration);
router.get('/declarations/:id/comments', ctrl.listComments);

router.post('/declarations/:id/comments', [
  body('content').notEmpty().trim().withMessage('Contenu requis.'),
], ctrl.addComment);

module.exports = router;