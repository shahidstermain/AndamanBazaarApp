import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { auth, db } from "../lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";

export const useNotifications = () => {
  const location = useLocation();
  const chatIdsRef = useRef<Set<string>>(new Set());
  const senderNameCacheRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!("Notification" in window)) return;

    let isActive = true;
    const unsubscribers: (() => void)[] = [];

    const getSenderName = async (senderId: string) => {
      const cached = senderNameCacheRef.current.get(senderId);
      if (cached) return cached;

      try {
        const snap = await getDoc(doc(db, "users", senderId));
        const name = snap.exists() ? snap.data().name || "Someone" : "Someone";
        senderNameCacheRef.current.set(senderId, name);
        return name;
      } catch {
        return "Someone";
      }
    };

    const setup = () => {
      const user = auth.currentUser;
      if (!user || !isActive) return;

      // Subscribe to buyer-side chats
      const buyerChatsQ = query(
        collection(db, "chats"),
        where("buyerId", "==", user.uid),
      );
      const sellerChatsQ = query(
        collection(db, "chats"),
        where("sellerId", "==", user.uid),
      );

      const handleChatsSnap = (snap: any) => {
        if (!isActive) return;
        snap.docs.forEach((d: any) => chatIdsRef.current.add(d.id));
      };

      unsubscribers.push(onSnapshot(buyerChatsQ, handleChatsSnap));
      unsubscribers.push(onSnapshot(sellerChatsQ, handleChatsSnap));

      // Subscribe to new messages across user's chats
      const messagesQ = query(
        collection(db, "messages"),
        where("recipientId", "==", user.uid),
      );

      unsubscribers.push(
        onSnapshot(messagesQ, async (snap) => {
          if (!isActive) return;
          for (const change of snap.docChanges()) {
            if (change.type !== "added") continue;
            const msg = change.doc.data();
            if (!msg?.chatId || !msg?.senderId) continue;
            if (msg.senderId === user.uid) continue;
            if (!chatIdsRef.current.has(msg.chatId)) continue;

            const isChatOpen = location.pathname === `/chats/${msg.chatId}`;
            if (isChatOpen && document.visibilityState === "visible") continue;
            if (Notification.permission !== "granted") continue;

            const senderName = await getSenderName(msg.senderId);
            const body = msg.content || "New message";

            try {
              new Notification(`New message from ${senderName}`, {
                body,
                icon: "/logo192.png",
                tag: msg.chatId,
              });
            } catch {
              // ignore
            }
          }
        }),
      );
    };

    // Wait for auth state to resolve
    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (user && isActive) setup();
    });

    return () => {
      isActive = false;
      unsubAuth();
      unsubscribers.forEach((fn) => fn());
    };
  }, [location.pathname]);
};
