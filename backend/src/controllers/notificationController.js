const Notification = require('../models/Notification');
const PushSubscription = require('../models/PushSubscription');
const webpush = require('web-push');

// Get all notifications for current user
const getNotifications = async (req, res) => {
  const notifications = await Notification.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50);

  const unreadCount = await Notification.countDocuments({ userId: req.user._id, read: false });

  res.json({ notifications, unreadCount });
};

// Mark one notification as read
const markRead = async (req, res) => {
  await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { read: true }
  );
  res.json({ message: 'Marked as read' });
};

// Mark all as read
const markAllRead = async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
  res.json({ message: 'All notifications marked as read' });
};

// Delete a notification
const deleteNotification = async (req, res) => {
  await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  res.json({ message: 'Notification deleted' });
};

// Save push subscription
const savePushSubscription = async (req, res) => {
  const { endpoint, keys } = req.body;
  await PushSubscription.findOneAndUpdate(
    { endpoint },
    { userId: req.user._id, endpoint, keys },
    { upsert: true, new: true }
  );
  res.json({ message: 'Push subscription saved' });
};

// Send push notification to a user (internal helper, also exposed for admin)
const sendPushToUser = async (userId, title, message) => {
  const subs = await PushSubscription.find({ userId });
  const payload = JSON.stringify({ title, message });

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        payload
      );
    } catch (err) {
      if (err.statusCode === 410) {
        await PushSubscription.findByIdAndDelete(sub._id);
      }
    }
  }
};

// Internal helper: create a notification + optionally send push
const createNotification = async ({ userId, title, message, type = 'info', link }) => {
  const notif = await Notification.create({ userId, title, message, type, link });
  await sendPushToUser(userId, title, message);
  return notif;
};

module.exports = {
  getNotifications,
  markRead,
  markAllRead,
  deleteNotification,
  savePushSubscription,
  createNotification,
};
