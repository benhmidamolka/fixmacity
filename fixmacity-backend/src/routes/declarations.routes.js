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

router.post('/analyze-photo',
  memUpload.single('photo'),
  authenticate,
  ctrl.analyzePhoto
);

// 1. Named static routes FIRST
router.get('/mine',   authenticate, rbac('citizen'), ctrl.mine);
router.get('/map',    ctrl.map);
router.get('/nearby', authenticate, ctrl.nearby);

// 2. Wildcard AFTER named routes
router.get('/:id', authenticate, ctrl.getById);
router.get('/:id/export', authenticate, rbac('president'), exportCtrl.exportDeclaration);

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

// 3. Citizen-only mutations (explicitly defined per route)

// PUT /api/declarations/:id — Edit (soumise only)
router.put('/:id', authenticate, rbac('citizen'), [
  body('title').optional().notEmpty().trim(),
  body('description').optional().notEmpty().trim(),
], ctrl.update);

// DELETE /api/declarations/:id — Soft delete (soumise only)
router.delete('/:id', authenticate, rbac('citizen'), ctrl.remove);

// POST /api/declarations/:id/vote — Vote
router.post('/:id/vote', authenticate, rbac('citizen'), ctrl.vote);

// POST /api/declarations/:id/rate — Rate (after resolue)
router.post('/:id/rate', authenticate, rbac('citizen'), [
  body('score').isInt({ min: 1, max: 5 }).withMessage('Note entre 1 et 5.'),
  body('comment').optional().trim(),
], ctrl.rate);
router.get('/nearby/sensitive', ctrl.getNearSensitiveLocations)

// ── Declaration Comments (citizen sees agent_citizen channel) ──
router.get('/:id/comments', authenticate, rbac('citizen'), ctrl.listComments);
router.post('/:id/comments', authenticate, rbac('citizen'), [
  body('content').notEmpty().trim().withMessage('Contenu requis.'),
], ctrl.addComment);

module.exports = router;