const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markRead,
  markAllRead,
  deleteNotification,
  savePushSubscription,
} = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, getNotifications);
router.put('/read-all', authenticate, markAllRead);
router.put('/:id/read', authenticate, markRead);
router.delete('/:id', authenticate, deleteNotification);
router.post('/push-subscription', authenticate, savePushSubscription);

module.exports = router;
