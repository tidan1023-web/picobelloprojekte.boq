import api from './api';

export async function registerPushSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const { data } = await api.get('/push/vapid-public-key');
    if (!data.publicKey) return;

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey),
    });

    await api.post('/notifications/push-subscription', subscription.toJSON());
  } catch (err) {
    console.warn('Push registration failed:', err);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}
