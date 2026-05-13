const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authenticate = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const tasksController = require('../controllers/tasks.controller');

const taskRules = [
  body('title').notEmpty().withMessage('Titre requis.'),
  body('declaration_id').isUUID().withMessage('ID déclaration invalide.'),
];

// All task routes require authentication
router.use(authenticate);

router.get('/', tasksController.list);

// Only Chef, President, or Admin can create/update/delete tasks
router.post('/', rbac('chef', 'president', 'admin'), taskRules, tasksController.create);
router.patch('/:id', rbac('chef', 'president', 'admin', 'agent'), tasksController.update); // Agent can update status
router.delete('/:id', rbac('chef', 'president', 'admin'), tasksController.remove);

module.exports = router;
