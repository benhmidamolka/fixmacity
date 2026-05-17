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
router.delete("/:id", nc.deleteNotification);
router.post("/bulk", nc.bulkDeleteNotifications);
module.exports = router;