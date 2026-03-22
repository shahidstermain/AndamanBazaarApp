import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export const useNotifications = () => {
  const location = useLocation();
  const chatIdsRef = useRef<Set<string>>(new Set());
  const senderNameCacheRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!('Notification' in window)) return;

    let isActive = true;
    const unsubscribers: (() => void)[] = [];

    const primeChatIds = async (userId: string) => {
      const buyerSnap = await getDocs(query(collection(db, 'chats'), where('buyer_id', '==', userId)));
      const sellerSnap = await getDocs(query(collection(db, 'chats'), where('seller_id', '==', userId)));
      if (!isActive) return;

      const ids = new Set<string>();
      buyerSnap.docs.forEach(d => ids.add(d.id));
      sellerSnap.docs.forEach(d => ids.add(d.id));
      chatIdsRef.current = ids;
    };

    const getSenderName = async (senderId: string) => {
      const cached = senderNameCacheRef.current.get(senderId);
      if (cached) return cached;

      const profileSnap = await getDoc(doc(db, 'profiles', senderId));
      const name = profileSnap.exists() ? (profileSnap.data().name || 'Someone') : 'Someone';
      senderNameCacheRef.current.set(senderId, name);
      return name;
    };

    const setup = async () => {
      const user = auth.currentUser;
      if (!user || !isActive) return;

      await primeChatIds(user.uid);
      if (!isActive) return;

      // Listen for new messages in user's chats using Firestore onSnapshot
      // We listen to all chats the user is involved in
      const buyerChatsUnsub = onSnapshot(
        query(collection(db, 'chats'), where('buyer_id', '==', user.uid)),
        () => primeChatIds(user.uid)
      );
      unsubscribers.push(buyerChatsUnsub);

      const sellerChatsUnsub = onSnapshot(
        query(collection(db, 'chats'), where('seller_id', '==', user.uid)),
        () => primeChatIds(user.uid)
      );
      unsubscribers.push(sellerChatsUnsub);

      // Listen for new messages across all chats
      // Note: Firestore doesn't support filtering by a dynamic set of chat_ids easily.
      // We'll listen to messages collection and filter client-side.
      const messagesUnsub = onSnapshot(
        query(collection(db, 'messages'), orderBy('created_at', 'desc')),
        (snapshot) => {
          if (!isActive) return;
          snapshot.docChanges().forEach(async (change) => {
            if (change.type !== 'added') return;
            const msg = change.doc.data() as any;
            if (!msg?.chat_id || !msg?.sender_id) return;
            if (msg.sender_id === user.uid) return;
            if (!chatIdsRef.current.has(msg.chat_id)) return;

            const isChatOpen = location.pathname === `/chats/${msg.chat_id}`;
            if (isChatOpen && document.visibilityState === 'visible') return;

            if (Notification.permission !== 'granted') return;

            const senderName = await getSenderName(msg.sender_id);
            const body = msg.message_text || 'New message';

            try {
              new Notification(`New message from ${senderName}`, {
                body,
                icon: '/logo192.png',
                tag: msg.chat_id,
              });
            } catch {
              // ignore
            }
          });
        }
      );
      unsubscribers.push(messagesUnsub);
    };

    setup();

    return () => {
      isActive = false;
      unsubscribers.forEach(unsub => unsub());
    };
  }, [location.pathname]);
};
