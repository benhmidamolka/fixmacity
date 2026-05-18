'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const nc = require('../controllers/notifications.controller');

const router = express.Router();

router.use(authenticate);

router.get('/unread-count', nc.getUnreadCount);
router.get('/', nc.listNotifications);
router.put('/read-all', nc.markAllAsRead);
router.put('/:id/read', nc.markAsRead);
// Bulk delete must be declared before the parameterized `/:id` route
router.delete('/bulk', nc.bulkDeleteNotifications);
router.delete('/:id', nc.deleteNotification);
module.exports = router;