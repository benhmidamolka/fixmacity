// src/routes/agent.routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { body } = require('express-validator');
const authenticate = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const {
  getDeclarations,
  getDeclarationById,
  acceptDeclaration,
  refuseDeclaration,
  uploadPhoto,
  resolveDeclaration,
  getComments,
  addComment,
} = require('../controllers/agent.controller');

// ── Memory-based multer for photo upload ─────────────────────
const memUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// All routes require authentication and agent role
router.use(authenticate, rbac('agent'));

router.get('/declarations',              getDeclarations);
router.get('/declarations/:id',          getDeclarationById);
router.post('/declarations/:id/accept',  acceptDeclaration);
router.post('/declarations/:id/refuse',  refuseDeclaration);

// Photo upload uses memory storage to allow processing in controller
router.post('/declarations/:id/photo',   memUpload.single('photo'), uploadPhoto);

router.post('/declarations/:id/resolve', resolveDeclaration);
router.get('/declarations/:id/comments', getComments);
router.post('/declarations/:id/comments', addComment);

module.exports = router;