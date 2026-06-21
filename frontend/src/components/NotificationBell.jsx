import React, { useEffect, useRef, useState } from 'react';
import { Bell, X, CheckCheck, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import api from '../services/api';

const TYPE_ICONS = {
  info: <Info size={14} className="text-blue-500 shrink-0" />,
  success: <CheckCircle size={14} className="text-green-500 shrink-0" />,
  warning: <AlertTriangle size={14} className="text-yellow-500 shrink-0" />,
  error: <XCircle size={14} className="text-red-500 shrink-0" />,
};

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications);
      setUnread(data.unreadCount);
    } catch (_) {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (id) => {
    await api.put(`/notifications/${id}/read`);
    setNotifications((n) => n.map((x) => x._id === id ? { ...x, read: true } : x));
    setUnread((u) => Math.max(0, u - 1));
  };

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    setNotifications((n) => n.map((x) => ({ ...x, read: true })));
    setUnread(0);
  };

  const deleteNotif = async (id) => {
    await api.delete(`/notifications/${id}`);
    const removed = notifications.find((n) => n._id === id);
    setNotifications((n) => n.filter((x) => x._id !== id));
    if (removed && !removed.read) setUnread((u) => Math.max(0, u - 1));
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen((o) => !o); if (!open) fetchNotifications(); }}
        className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-primary-900" />
              <span className="font-semibold text-gray-800 text-sm">Notifications</span>
              {unread > 0 && (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">{unread}</span>
              )}
            </div>
            {unread > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-primary-900 hover:underline font-medium">
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell size={32} className="mx-auto mb-2 text-gray-200" />
                <p className="text-sm text-gray-400">No notifications</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n._id} className={`px-4 py-3 flex gap-3 items-start hover:bg-gray-50 transition-colors ${!n.read ? 'bg-blue-50/40' : ''}`}>
                  <div className="mt-0.5">{TYPE_ICONS[n.type] ?? TYPE_ICONS.info}</div>
                  <div className="flex-1 min-w-0" onClick={() => !n.read && markRead(n._id)} style={{ cursor: n.read ? 'default' : 'pointer' }}>
                    <p className={`text-xs font-semibold leading-tight ${n.read ? 'text-gray-600' : 'text-gray-800'}`}>{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-snug">{n.message}</p>
                    <p className="text-xs text-gray-300 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                  <button onClick={() => deleteNotif(n._id)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0 mt-0.5">
                    <X size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
