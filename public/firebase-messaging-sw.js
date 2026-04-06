importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// These env values are injected at build time via the SW template.
// See vite.config.ts VitePWA injectManifest or use __WB_MANIFEST.
const firebaseConfig = {
  apiKey: self.__FIREBASE_API_KEY__ || '',
  authDomain: self.__FIREBASE_AUTH_DOMAIN__ || '',
  projectId: self.__FIREBASE_PROJECT_ID__ || '',
  storageBucket: self.__FIREBASE_STORAGE_BUCKET__ || '',
  messagingSenderId: self.__FIREBASE_MESSAGING_SENDER_ID__ || '',
  appId: self.__FIREBASE_APP_ID__ || '',
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Background message handler — shows notification when app is in background/closed
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon, click_action } = payload.notification || {};

  self.registration.showNotification(title || 'AndamanBazaar', {
    body: body || '',
    icon: icon || '/favicon.png',
    badge: '/favicon.png',
    data: { url: click_action || payload.data?.url || '/' },
    vibrate: [200, 100, 200],
    requireInteraction: false,
  });
});

// Click handler — navigate to the action URL when notification is clicked
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
