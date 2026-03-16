import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import app, { auth, db } from './firebase';

// ============================================================
// Firebase Cloud Messaging — Frontend Service
// ============================================================

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

let messaging: Messaging | null = null;

const getMessagingInstance = (): Messaging | null => {
  if (messaging) return messaging;
  try {
    messaging = getMessaging(app);
    return messaging;
  } catch {
    return null;
  }
};

// ── Token Registration ──────────────────────────────────────

/**
 * Requests notification permission and registers the FCM token in Firestore.
 * Idempotent — safe to call on every app load.
 */
export const registerPushNotifications = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) return null;

  const m = getMessagingInstance();
  if (!m) return null;

  if (!VAPID_KEY) {
    console.warn('VITE_FIREBASE_VAPID_KEY is not set. Push notifications disabled.');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const token = await getToken(m, { vapidKey: VAPID_KEY });
    if (!token) return null;

    // Store token in Firestore — server uses this to send targeted pushes
    await setDoc(
      doc(db, 'fcmTokens', user.uid),
      {
        token,
        userId: user.uid,
        updatedAt: serverTimestamp(),
        platform: 'web',
        userAgent: navigator.userAgent.substring(0, 200),
      },
      { merge: true }
    );

    return token;
  } catch (err) {
    console.error('FCM token registration failed:', err);
    return null;
  }
};

// ── Foreground Message Handler ───────────────────────────────

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  type?: string;
  data?: Record<string, string>;
};

/**
 * Listens for FCM messages when the app is foregrounded.
 * Returns an unsubscribe function.
 */
export const onForegroundMessage = (callback: (payload: PushPayload) => void): (() => void) => {
  const m = getMessagingInstance();
  if (!m) return () => {};

  return onMessage(m, (raw) => {
    const { notification, data } = raw;
    callback({
      title: notification?.title || 'AndamanBazaar',
      body: notification?.body || '',
      url: (data?.url as string) || '/',
      type: (data?.type as string) || 'generic',
      data: data as Record<string, string>,
    });
  });
};

// ── Token Cleanup ────────────────────────────────────────────

export const unregisterPushNotifications = async (): Promise<void> => {
  const user = auth.currentUser;
  if (!user) return;
  try {
    await setDoc(
      doc(db, 'fcmTokens', user.uid),
      { token: null, updatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch {
    // non-critical
  }
};
