import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { auth, db } from "../lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { Chat, Message } from "../types";

interface ChatWithLastMessage extends Chat {
  messages: Pick<Message, "sender_id" | "is_read">[];
}

export const ChatList: React.FC = () => {
  const [chats, setChats] = useState<ChatWithLastMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const fetchChats = async (userId: string) => {
    try {
      const [buyerSnap, sellerSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, "chats"),
            where("buyerId", "==", userId),
            orderBy("lastMessageAt", "desc"),
          ),
        ),
        getDocs(
          query(
            collection(db, "chats"),
            where("sellerId", "==", userId),
            orderBy("lastMessageAt", "desc"),
          ),
        ),
      ]);

      const chatDocs = [
        ...buyerSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        ...sellerSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      ] as any[];

      if (chatDocs.length === 0) {
        setChats([]);
        return;
      }

      // Batch fetch listings + profiles
      const listingIds = [
        ...new Set(chatDocs.map((c: any) => c.listingId).filter(Boolean)),
      ];
      const profileIds = [
        ...new Set(
          [
            ...chatDocs.map((c: any) => c.buyerId),
            ...chatDocs.map((c: any) => c.sellerId),
          ].filter(Boolean),
        ),
      ];

      const [listingSnaps, profileSnaps] = await Promise.all([
        Promise.all(
          listingIds.map((id) => getDoc(doc(db, "listings", id as string))),
        ),
        Promise.all(
          profileIds.map((id) => getDoc(doc(db, "users", id as string))),
        ),
      ]);

      const listingsMap = Object.fromEntries(
        listingSnaps
          .filter((s) => s.exists())
          .map((s) => [s.id, { id: s.id, ...s.data() }]),
      );
      const profilesMap = Object.fromEntries(
        profileSnaps
          .filter((s) => s.exists())
          .map((s) => [s.id, { id: s.id, ...s.data() }]),
      );

      const enrichedChats = chatDocs.map((chat) => ({
        ...chat,
        listing: listingsMap[chat.listingId],
        seller: profilesMap[chat.sellerId],
        buyer: profilesMap[chat.buyerId],
        messages: [],
      }));

      enrichedChats.sort((a: any, b: any) => {
        const ta = a.lastMessageAt?.toMillis?.() || 0;
        const tb = b.lastMessageAt?.toMillis?.() || 0;
        return tb - ta;
      });

      setChats(enrichedChats as ChatWithLastMessage[]);
    } catch (err) {
      console.error("Error fetching chats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setCurrentUser({ id: user.uid });
      fetchChats(user.uid);
    } else {
      const unsub = auth.onAuthStateChanged((u) => {
        if (u) {
          setCurrentUser({ id: u.uid });
          fetchChats(u.uid);
        } else setLoading(false);
      });
      return unsub;
    }
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;

    const buyerQ = query(
      collection(db, "chats"),
      where("buyerId", "==", currentUser.id),
    );
    const sellerQ = query(
      collection(db, "chats"),
      where("sellerId", "==", currentUser.id),
    );

    const unsubBuyer = onSnapshot(buyerQ, () => fetchChats(currentUser.id));
    const unsubSeller = onSnapshot(sellerQ, () => fetchChats(currentUser.id));

    return () => {
      unsubBuyer();
      unsubSeller();
    };
  }, [currentUser?.id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-black mb-8 uppercase tracking-tighter">
          My Conversations
        </h1>
        <div className="bg-white rounded-[40px] shadow-sm border-2 border-slate-100 overflow-hidden">
          <div className="divide-y-2 divide-slate-50">
            {[1, 2, 3, 4, 5].map((n) => (
              <ChatSkeletonRow key={n} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-black uppercase tracking-tighter">
          Messages
        </h1>
        <div className="bg-teal-50 px-4 py-1.5 rounded-full">
          <span className="text-[10px] font-black text-teal-800 uppercase tracking-widest">
            {chats.length} active threads
          </span>
        </div>
      </div>

      <div className="bg-white rounded-[40px] shadow-2xl border-4 border-slate-50 overflow-hidden">
        <div className="bg-slate-50 border-b-2 border-slate-100 px-6 py-5">
          <span className="font-black text-teal-800 uppercase text-[10px] tracking-[0.2em]">
            All Conversations
          </span>
        </div>

        <div className="divide-y divide-slate-50">
          {chats.length === 0 ? (
            <div className="p-20 text-center">
              <span className="text-6xl block mb-6">🏝️</span>
              <p className="text-xl font-black text-slate-300 uppercase tracking-widest">
                No active chats yet
              </p>
              <Link
                to="/listings"
                className="mt-6 inline-block bg-teal-700 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest"
              >
                Start Browsing
              </Link>
            </div>
          ) : (
            chats.map((chat) => {
              const isBuyer = currentUser?.id === chat.buyer_id;
              const otherParty = isBuyer ? chat.seller : chat.buyer;
              const unreadCount = isBuyer
                ? chat.buyer_unread_count
                : chat.seller_unread_count;
              const previewText = chat.last_message || "No messages yet...";

              return (
                <Link
                  key={chat.id}
                  to={`/chats/${chat.id}`}
                  className={`relative flex items-center p-6 hover:bg-slate-50 transition-all group ${unreadCount > 0 ? "bg-teal-50/60" : ""}`}
                >
                  {unreadCount > 0 && (
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-teal-600 rounded-full shadow-[0_0_8px_rgba(13,148,136,0.4)]"></div>
                  )}

                  <div className="relative flex-shrink-0 ml-1">
                    <div
                      className={`w-16 h-16 rounded-[24px] bg-slate-100 border-2 overflow-hidden shadow-sm group-hover:scale-105 transition-transform ${unreadCount > 0 ? "border-teal-200" : "border-slate-50"}`}
                    >
                      {otherParty?.profile_photo_url ? (
                        <img
                          src={otherParty.profile_photo_url}
                          className="w-full h-full object-cover"
                          alt=""
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 text-2xl">
                          👤
                        </div>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <div className="absolute -top-1.5 -right-1.5 min-w-[24px] h-6 px-1.5 bg-teal-600 text-white border-2 border-white rounded-full flex items-center justify-center text-[11px] font-black shadow-lg">
                        {unreadCount}
                      </div>
                    )}
                  </div>

                  <div className="ml-6 flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3
                        className={`font-black truncate text-lg uppercase tracking-tight ${unreadCount > 0 ? "text-slate-900" : "text-slate-600"}`}
                      >
                        {otherParty?.name || "Local Neighbor"}
                      </h3>
                      <span
                        className={`text-[10px] font-black uppercase tracking-widest ${unreadCount > 0 ? "text-teal-600" : "text-slate-400"}`}
                      >
                        {chat.last_message_at
                          ? new Date(chat.last_message_at).toLocaleTimeString(
                              [],
                              { hour: "2-digit", minute: "2-digit" },
                            )
                          : ""}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <p
                        className={`text-sm truncate leading-tight ${unreadCount > 0 ? "font-bold text-slate-900" : "font-medium text-slate-400"}`}
                      >
                        {previewText}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center space-x-2">
                      <span
                        className={`px-3 py-1 bg-white border text-[9px] font-black rounded-full uppercase tracking-tighter shadow-sm transition-colors ${unreadCount > 0 ? "border-teal-200 text-teal-700" : "border-slate-100 text-slate-400"}`}
                      >
                        {chat.listing?.title || "Listing"}
                      </span>
                    </div>
                  </div>

                  <div className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 text-xl font-light">
                    ›
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
      <div className="mt-8 bg-slate-50 p-6 rounded-3xl border-2 border-slate-100">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">
          Keep your community safe. Meet in public places and never share
          banking details over chat.
        </p>
      </div>
    </div>
  );
};

const ChatSkeletonRow = () => (
  <div className="flex items-center p-6 space-x-6">
    <div className="w-16 h-16 rounded-[24px] skeleton-soft flex-shrink-0"></div>
    <div className="flex-1 space-y-3">
      <div className="h-6 w-1/3 skeleton-soft rounded-lg"></div>
      <div className="h-4 w-2/3 skeleton-soft rounded-lg"></div>
    </div>
  </div>
);
