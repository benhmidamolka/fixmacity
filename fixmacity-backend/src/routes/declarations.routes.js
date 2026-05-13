const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/declarations.controller');
const authenticate = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const exportCtrl = require('../controllers/export.controller');

const multer = require('multer');

// ── Memory-based multer for photo upload ─────────────────────
const memUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Type de fichier non autorisé.'));
  },
});

// AI Photo Analysis — PUBLIC within auth (no citizen-only restriction)
router.post('/analyze-photo',
  memUpload.single('photo'),
  authenticate,
  ctrl.analyzePhoto
);

router.get('/:id/export', authenticate, exportCtrl.exportDeclaration);

// POST /api/declarations — Submit new declaration with photo
router.post('/',
  memUpload.single('photo'),
  authenticate,
  rbac('citizen'),
  [
    body('title').notEmpty().trim().withMessage('Titre requis.'),
    body('description').notEmpty().trim().withMessage('Description requise.'),
    body('category').optional().notEmpty().withMessage('Catégorie requise.'),
    body('delegation_id').optional().isUUID().withMessage('Délégation invalide.'),
  ],
  ctrl.create
);

// All other routes require auth + citizen role
router.use(authenticate, rbac('citizen'));

// GET /api/declarations/nearby — Find nearby duplicates
router.get('/nearby', ctrl.nearby);

// GET /api/declarations/mine — My declarations
router.get('/mine', ctrl.mine);

// GET /api/declarations/map — Map view
router.get('/map', ctrl.map);

// PUT /api/declarations/:id — Edit (soumise only)
router.put('/:id', [
  body('title').optional().notEmpty().trim(),
  body('description').optional().notEmpty().trim(),
], ctrl.update);

// DELETE /api/declarations/:id — Soft delete (soumise only)
router.delete('/:id', ctrl.remove);

// POST /api/declarations/:id/vote — Vote
router.post('/:id/vote', ctrl.vote);

// POST /api/declarations/:id/rate — Rate (after resolue)
router.post('/:id/rate', [
  body('score').isInt({ min: 1, max: 5 }).withMessage('Note entre 1 et 5.'),
  body('comment').optional().trim(),
], ctrl.rate);

// ── Declaration Comments (citizen sees agent_citizen channel) ──
router.get('/:id/comments', ctrl.listComments);
router.post('/:id/comments', [
  body('content').notEmpty().trim().withMessage('Contenu requis.'),
], ctrl.addComment);

module.exports = router;