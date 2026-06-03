const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/president.controller');
const authenticate = require('../middleware/auth');
const rbac = require('../middleware/rbac');

// All routes require auth + president role
router.use(authenticate, rbac('president'));

// ── Declarations ──
router.get('/declarations', ctrl.listDeclarations);
router.get('/declarations/:id', ctrl.getDeclarationDetail);
router.delete('/declarations/:id', ctrl.deleteDeclaration);
router.post('/declarations/bulk-delete', ctrl.bulkDeleteDeclarations);
router.post('/declarations/:id/recalculate-priority', ctrl.recalculateDeclarationPriority);

// AI image analysis + priority override
router.post('/declarations/:id/analyze-image', ctrl.analyzeDeclarationImage);
router.get('/declarations/:id/priority', require('../controllers/declarations.controller').getPriorityDetail);
router.patch('/declarations/:id/priority', ctrl.overridePriority);

router.post('/declarations/:id/assign', [
  body('department_id').isUUID().withMessage('Département invalide (UUID attendu).'),
], ctrl.assignDeclaration);

router.post('/declarations/:id/reassign', [
  body('department_id').isUUID().withMessage('Département invalide (UUID attendu).'),
], ctrl.reassignDeclaration);

// ── Declaration Comments ──
router.get('/declarations/:id/comments', ctrl.listComments);
router.post('/declarations/:id/comments', [
  body('content').notEmpty().trim().withMessage('Contenu requis.'),
], ctrl.addComment);

// ── Users ──
router.get('/users', ctrl.listUsers);

router.post('/users', [
  body('email').isEmail().withMessage('Email invalide.'),
  body('password').isLength({ min: 8 }).withMessage('Mot de passe : 8 caractères minimum.'),
  body('first_name').notEmpty().trim().withMessage('Prénom requis.'),
  body('last_name').notEmpty().trim().withMessage('Nom requis.'),
  body('role').isIn(['agent', 'chef']).withMessage('Rôle invalide (agent ou chef).'),
  body('department_id').optional().isUUID().withMessage('Département invalide.'),
  body('delegation_id').optional().isUUID().withMessage('Délégation invalide.'),
], ctrl.createUser);

router.patch('/users/:id', ctrl.updateUser);
router.delete('/users/:id', ctrl.deleteUser);

// ── Departments ──
router.get('/departments', ctrl.listDepartments);
router.post('/departments', ctrl.createDepartment);
router.delete('/departments/:id', ctrl.deleteDepartment);
router.patch('/departments/:id/status', ctrl.updateDepartmentStatus);
// PATCH /api/president/departments/:id  — edit names/description
router.patch('/departments/:id', [
  body('name_fr').optional().trim(),
  body('name_ar').optional().trim(),
  body('name_en').optional().trim(),
  body('description').optional().trim(),
], ctrl.updateDepartment);

const multer = require('multer');

// Memory-based multer for photo upload
const memUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Type de fichier non autorisé.'));
  },
});

// ── Propositions ──
router.get('/propositions', ctrl.listPropositions);
router.post('/propositions',
  memUpload.single('photo'),
  [
    body('title').notEmpty().trim().withMessage('Titre requis.'),
    body('description').optional().isString(),
    body('start_date').optional().isISO8601(),
    body('end_date').optional().isISO8601(),
    body('category').optional().isString(),
    body('status').optional().isIn(['active', 'closed', 'draft']),
  ],
  ctrl.createProposition
);
// NEW ↓
router.put('/propositions/:id',
  memUpload.single('photo'),
  ctrl.updateProposition
);
router.delete('/propositions/:id', ctrl.deleteProposition);
// existing ↓
router.post('/propositions/:id/confirmer', ctrl.confirmProposition);
router.post('/propositions/:id/retenu', ctrl.retainProposition);
router.get('/propositions/:id/summary', ctrl.getPropositionSummary);
router.patch('/propositions/:id/respond', [
  body('status').isIn(['a_discuter', 'retenu', 'refuse']).withMessage('Statut invalide.'),
  body('president_response').optional().isString(),
], ctrl.respondToProposition);

// ── Dashboard & Export ──
router.get('/dashboard', ctrl.dashboard);
router.get('/analytics', ctrl.analytics);
router.get('/export', ctrl.exportData);

module.exports = router;