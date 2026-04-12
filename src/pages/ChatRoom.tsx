import React, { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { auth, db } from "../lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { Chat, Message } from "../types";
import {
  Send,
  ChevronLeft,
  ShieldCheck,
  Check,
  CheckCheck,
  MoreVertical,
  Flag,
  Ban,
  Info,
  IndianRupee,
  ThumbsUp,
  ThumbsDown,
  X,
} from "lucide-react";
import { messageSchema, sanitizePlainText } from "../lib/validation";
import {
  checkRateLimit,
  logAuditEvent,
  sanitizeErrorMessage,
} from "../lib/security";
import { useToast } from "../components/Toast";
import { COPY } from "../lib/localCopy";
import { SafetyNudge } from "../components/SafetyNudge";
import { ReportModal } from "../components/ReportModal";

export const ChatRoom: React.FC = () => {
  const { chatId } = useParams();
  const id = chatId;
  const navigate = useNavigate();
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  const [hasMore, setHasMore] = useState(false);
  const MESSAGES_PER_PAGE = 50;

  // Safety & Moderation
  const [nudgeType, setNudgeType] = useState<
    "payment" | "privacy" | "general" | null
  >(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Offer mode
  const [showOfferInput, setShowOfferInput] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Safety keywords detection
  useEffect(() => {
    const lower = inputText.toLowerCase();
    if (
      lower.includes("bank") ||
      lower.includes("pay") ||
      lower.includes("upi") ||
      lower.includes("gpay") ||
      lower.includes("account")
    ) {
      setNudgeType("payment");
    } else if (
      lower.includes("phone") ||
      lower.includes("number") ||
      lower.includes("call") ||
      lower.includes("address")
    ) {
      setNudgeType("privacy");
    } else {
      setNudgeType(null);
    }
  }, [inputText]);

  useEffect(() => {
    const initChat = async () => {
      const user = auth.currentUser;
      if (!user) return;
      setCurrentUser({ id: user.uid });

      try {
        let chatDoc: any = null;

        // Try to load chat by ID first
        const chatSnap = await getDoc(doc(db, "chats", id!));
        if (chatSnap.exists()) {
          chatDoc = { id: chatSnap.id, ...chatSnap.data() };
        } else {
          // If ID is a listing ID (from "Chat Now" button)
          const listingSnap = await getDoc(doc(db, "listings", id!));
          if (listingSnap.exists()) {
            const listing = {
              id: listingSnap.id,
              ...listingSnap.data(),
            } as any;

            // Guard: prevent chatting on own listing
            if (listing.userId === user.uid) {
              setLoading(false);
              return;
            }

            if (["sold", "deleted", "expired"].includes(listing.status)) {
              navigate("/listings");
              return;
            }

            // Create new chat
            const newChatRef = await addDoc(collection(db, "chats"), {
              listingId: listing.id,
              buyerId: user.uid,
              sellerId: listing.userId,
              buyerUnreadCount: 0,
              sellerUnreadCount: 0,
              createdAt: serverTimestamp(),
              lastMessageAt: serverTimestamp(),
            });

            chatDoc = {
              id: newChatRef.id,
              listingId: listing.id,
              buyerId: user.uid,
              sellerId: listing.userId,
              listing,
            };
          }
        }

        if (chatDoc) {
          // Enrich with listing + user profiles
          const [listingSnap, sellerSnap, buyerSnap] = await Promise.all([
            chatDoc.listing
              ? null
              : getDoc(doc(db, "listings", chatDoc.listingId)).catch(
                  () => null,
                ),
            getDoc(doc(db, "users", chatDoc.sellerId)).catch(() => null),
            getDoc(doc(db, "users", chatDoc.buyerId)).catch(() => null),
          ]);

          chatDoc.listing =
            chatDoc.listing ||
            (listingSnap?.exists()
              ? { id: listingSnap.id, ...listingSnap.data() }
              : null);
          chatDoc.seller = sellerSnap?.exists()
            ? { id: sellerSnap.id, ...sellerSnap.data() }
            : null;
          chatDoc.buyer = buyerSnap?.exists()
            ? { id: buyerSnap.id, ...buyerSnap.data() }
            : null;

          setChat(chatDoc);

          // Initial messages fetch
          const msgSnap = await getDocs(
            query(
              collection(db, "chats", chatDoc.id, "messages"),
              orderBy("createdAt", "desc"),
              limit(MESSAGES_PER_PAGE),
            ),
          );
          const msgs = msgSnap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .reverse() as any[];
          setMessages(msgs);
          setHasMore(msgSnap.docs.length === MESSAGES_PER_PAGE);

          // Reset unread count
          const isBuyer = user.uid === chatDoc.buyerId;
          await updateDoc(doc(db, "chats", chatDoc.id), {
            [isBuyer ? "buyerUnreadCount" : "sellerUnreadCount"]: 0,
          });
        }
      } catch (err) {
        console.error("Chat init error:", err);
      } finally {
        setLoading(false);
      }
    };

    initChat();
  }, [id]);

  useEffect(() => {
    if (!chat) return;
    const msgsRef = collection(db, "chats", chat.id, "messages");
    const msgsQ = query(msgsRef, orderBy("createdAt", "asc"));

    const unsubscribeSnapshot = onSnapshot(msgsQ, (snap) => {
      snap.docChanges().forEach((change) => {
        const msg = { id: change.doc.id, ...change.doc.data() } as any;
        if (change.type === "added") {
          setMessages((prev) =>
            prev.find((m) => m.id === msg.id) ? prev : [...prev, msg],
          );
        } else if (change.type === "modified") {
          setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
        }
      });
    });

    return () => unsubscribeSnapshot();
  }, [chat]);

  useEffect(() => {
    if (
      scrollRef.current &&
      typeof scrollRef.current.scrollIntoView === "function"
    ) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const markMessagesAsRead = async (chatId: string, _userId: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const unreadSnap = await getDocs(
        query(
          collection(db, "chats", chatId, "messages"),
          orderBy("createdAt", "asc"),
        ),
      );
      const batch = writeBatch(db);
      unreadSnap.docs.forEach((d) => {
        if (d.data().senderId !== user.uid && !d.data().isRead) {
          batch.update(d.ref, { isRead: true });
        }
      });
      await batch.commit();
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const loadMoreMessages = async () => {
    if (!chat || !hasMore || messages.length === 0) return;
    try {
      const olderSnap = await getDocs(
        query(
          collection(db, "chats", chat.id, "messages"),
          orderBy("createdAt", "desc"),
          limit(MESSAGES_PER_PAGE),
        ),
      );
      const older = olderSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .reverse() as any[];
      if (older.length > 0) {
        setMessages((prev) => [
          ...older.filter((m) => !prev.find((p) => p.id === m.id)),
          ...prev,
        ]);
        if (older.length < MESSAGES_PER_PAGE) setHasMore(false);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Error loading more messages:", err);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !chat || !currentUser) return;

    const rateLimitCheck = checkRateLimit(`${currentUser.id}:send_message`, {
      maxRequests: 10,
      windowSeconds: 60,
    });

    if (!rateLimitCheck.allowed) {
      showToast(
        `Please wait ${rateLimitCheck.retryAfter}s before sending more messages.`,
        "warning",
      );
      await logAuditEvent({
        action: "message_rate_limited",
        status: "blocked",
        metadata: { chat_id: chat.id },
      });
      return;
    }

    const messageText = inputText.trim();
    const sanitizedMessage = sanitizePlainText(messageText);

    const validationResult = messageSchema.safeParse({
      message_text: sanitizedMessage,
      image_url: "",
    });

    if (!validationResult.success) {
      showToast(
        "Your message contains invalid content. Please revise.",
        "error",
      );
      await logAuditEvent({
        action: "message_validation_failed",
        status: "blocked",
        metadata: { error: validationResult.error.issues[0].message },
      });
      return;
    }

    setInputText("");

    try {
      await addDoc(collection(db, "chats", chat.id, "messages"), {
        chatId: chat.id,
        senderId: currentUser.id,
        recipientId:
          currentUser.id === (chat as any).buyerId
            ? (chat as any).sellerId
            : (chat as any).buyerId,
        content: sanitizedMessage,
        isRead: false,
        createdAt: serverTimestamp(),
      });

      await markMessagesAsRead(chat.id, currentUser.id);

      await logAuditEvent({
        action: "message_sent",
        resource_type: "message",
        status: "success",
        metadata: { chat_id: chat.id },
      });
    } catch (err) {
      console.error("Error sending message:", err);
      showToast("Message failed to send. Please try again.", "error");
      setInputText(messageText);
      await logAuditEvent({
        action: "message_send_failed",
        status: "failed",
        metadata: { error: sanitizeErrorMessage(err) },
      });
    }
  };

  const handleSendOffer = async () => {
    const amount = parseFloat(offerAmount);
    if (!amount || amount <= 0 || !chat || !currentUser) return;

    const rateLimitCheck = checkRateLimit(`${currentUser.id}:send_offer`, {
      maxRequests: 5,
      windowSeconds: 60,
    });

    if (!rateLimitCheck.allowed) {
      showToast(
        `Please wait ${rateLimitCheck.retryAfter}s before making another offer.`,
        "warning",
      );
      return;
    }

    // Client-side minPrice nudge
    const listingPrice = (chat as any).listing?.price;
    const minPrice = (chat as any).listing?.minPrice;
    if (minPrice && amount < minPrice) {
      showToast(
        "Your offer is below the seller's minimum. Try a higher amount.",
        "info",
      );
    }

    setOfferAmount("");
    setShowOfferInput(false);

    try {
      const buyerId = chat.buyerId ?? chat.buyer_id;
      const sellerId = chat.sellerId ?? chat.seller_id;

      await addDoc(collection(db, "chats", chat.id, "messages"), {
        chatId: chat.id,
        senderId: currentUser.id,
        recipientId: currentUser.id === buyerId ? sellerId : buyerId,
        content: `Offer: ₹${amount.toLocaleString("en-IN")}`,
        type: "offer",
        offerAmount: amount,
        offerStatus: "pending",
        isRead: false,
        createdAt: serverTimestamp(),
      });

      await logAuditEvent({
        action: "offer_sent",
        resource_type: "offer",
        status: "success",
        metadata: { chat_id: chat.id, amount },
      });
    } catch (err) {
      console.error("Error sending offer:", err);
      showToast("Offer failed to send. Please try again.", "error");
    }
  };

  const handleOfferResponse = async (
    messageId: string,
    response: "accepted" | "rejected",
    offerAmt: number,
  ) => {
    if (!chat || !currentUser) return;
    try {
      const msgRef = doc(db, "chats", chat.id, "messages", messageId);
      await updateDoc(msgRef, { offerStatus: response });

      const buyerId = chat.buyerId ?? chat.buyer_id;
      const sellerId = chat.sellerId ?? chat.seller_id;

      // Send system message
      const statusEmoji = response === "accepted" ? "🎉" : "❌";
      const statusText =
        response === "accepted"
          ? `${statusEmoji} Offer of ₹${offerAmt.toLocaleString("en-IN")} accepted! Meet up to exchange.`
          : `${statusEmoji} Offer of ₹${offerAmt.toLocaleString("en-IN")} declined.`;

      await addDoc(collection(db, "chats", chat.id, "messages"), {
        chatId: chat.id,
        senderId: "system",
        recipientId: currentUser.id === buyerId ? buyerId : sellerId,
        content: statusText,
        type: "system",
        isRead: false,
        createdAt: serverTimestamp(),
      });

      showToast(
        response === "accepted" ? "Offer accepted!" : "Offer declined",
        response === "accepted" ? "success" : "info",
      );

      await logAuditEvent({
        action: `offer_${response}`,
        resource_type: "offer",
        status: "success",
        metadata: { chat_id: chat.id, message_id: messageId, amount: offerAmt },
      });
    } catch (err) {
      console.error("Error responding to offer:", err);
      showToast("Could not respond to offer.", "error");
    }
  };

  const handleBlock = async () => {
    if (!currentUser || !chat) return;
    if (
      !confirm(
        "Are you sure you want to block this user? You will no longer receive messages from them.",
      )
    )
      return;

    try {
      const buyerId = chat.buyerId ?? chat.buyer_id;
      const sellerId = chat.sellerId ?? chat.seller_id;
      const otherUserId = currentUser.id === buyerId ? sellerId : buyerId;
      if (!otherUserId) {
        showToast("Unable to determine the user to block.", "error");
        return;
      }
      await addDoc(collection(db, "blocked_users"), {
        blockerId: currentUser.id,
        blockedId: otherUserId,
        createdAt: serverTimestamp(),
      });
      showToast("User blocked successfully", "success");
      navigate("/chats");
    } catch (error) {
      console.error("Error blocking user:", error);
      showToast("Failed to block user", "error");
    }
  };

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-ocean-600"></div>
      </div>
    );

  if (!chat)
    return (
      <div className="h-screen flex flex-col items-center justify-center p-8 text-center bg-white">
        <h2 className="text-2xl font-black mb-2 uppercase tracking-tighter">
          Chat Unavailable
        </h2>
        <p className="text-sm text-slate-500 font-medium mb-4">
          {COPY.CHAT.SELLER_UNAVAILABLE}
        </p>
        <Link
          to="/chats"
          className="bg-ocean-700 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest"
        >
          Back to Inbox
        </Link>
      </div>
    );

  const buyerId = chat.buyerId ?? chat.buyer_id;
  const sellerId = chat.sellerId ?? chat.seller_id;
  const listingId = chat.listingId ?? chat.listing_id;
  const reportTargetUserId = currentUser
    ? currentUser.id === buyerId
      ? sellerId
      : buyerId
    : "";
  const otherParty =
    currentUser?.id === chat.buyer_id ? chat.seller : chat.buyer;
  const isOfficial =
    otherParty?.is_official || otherParty?.trust_level === "official";

  return (
    <div className="h-screen flex flex-col bg-warm-50">
      <div className="px-4 py-3 border-b bg-white flex items-center justify-between shadow-card sticky top-0 z-20">
        <div className="flex items-center gap-3 flex-1 overflow-hidden">
          <button
            onClick={() => navigate("/chats")}
            aria-label="Go back to inbox"
            className="p-2 -ml-2 hover:bg-warm-100 rounded-full transition-colors shrink-0"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="w-10 h-10 rounded-full bg-warm-200 overflow-hidden border-2 border-white shadow-sm ring-1 ring-warm-100 shrink-0">
            <img
              src={
                otherParty?.profile_photo_url ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherParty?.id}`
              }
              alt=""
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <h3 className="font-black text-xs text-midnight-700 leading-tight uppercase tracking-tight truncate">
                {otherParty?.name || "User"}
              </h3>
              {isOfficial && (
                <span
                  className="bg-blue-50 text-blue-600 p-0.5 rounded-full ring-1 ring-blue-100"
                  title="AndamanBazaar Team"
                >
                  <Info size={10} fill="currentColor" />
                </span>
              )}
              {otherParty?.is_location_verified && (
                <ShieldCheck size={12} className="text-teal-600" />
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {isOfficial ? (
                <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">
                  Official Team
                </p>
              ) : otherParty?.is_location_verified ? (
                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">
                  Island Verified
                </p>
              ) : (
                <p className="text-[9px] font-black text-warm-400 uppercase tracking-widest">
                  Active
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setShowReportModal(true)}
              className="p-2 hover:bg-red-50 rounded-full transition-colors text-warm-400 hover:text-red-600 md:flex hidden"
              title="Report User"
            >
              <Flag size={18} />
            </button>
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-warm-100 rounded-full transition-colors text-warm-500"
                aria-label="More options"
              >
                <MoreVertical size={20} />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-warm-200 py-1 w-48 z-30 animate-in fade-in zoom-in-95 duration-200">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowReportModal(true);
                    }}
                    className="w-full text-left px-4 py-3 text-sm font-medium text-midnight-700 hover:bg-warm-50 flex items-center gap-3"
                  >
                    <Flag size={16} /> Report User
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      handleBlock();
                    }}
                    className="w-full text-left px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-3"
                  >
                    <Ban size={16} /> Block User
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
          <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest text-center">
            Safety Tip: Meet in public places and never share banking details.
          </p>
        </div>
        {hasMore && (
          <div className="text-center py-2">
            <button
              onClick={loadMoreMessages}
              className="text-[10px] font-black text-teal-600 uppercase tracking-widest bg-teal-50 px-4 py-2 rounded-full hover:bg-teal-100 transition-colors"
            >
              Load older messages
            </button>
          </div>
        )}
        <div className="text-center py-6">
          <p className="text-[11px] font-bold text-warm-500 bg-warm-100 inline-block px-4 py-1.5 rounded-full">
            {COPY.CHAT.CONVERSATION_STARTED}
          </p>
        </div>

        {messages.map((msg) => {
          const isMe = (msg.sender_id || msg.senderId) === currentUser?.id;
          const msgType = msg.type || "text";
          const offerAmt = msg.offerAmount;
          const offerStatus = msg.offerStatus;

          // System messages
          if (msgType === "system" || msg.senderId === "system") {
            return (
              <div
                key={msg.id}
                className="flex justify-center animate-in fade-in duration-300"
              >
                <div className="px-4 py-2 bg-warm-100 rounded-full border border-warm-200">
                  <p className="text-xs font-bold text-warm-600 text-center">
                    {msg.content || msg.message_text}
                  </p>
                </div>
              </div>
            );
          }

          // Offer messages
          if (msgType === "offer") {
            const buyerId = chat.buyerId ?? chat.buyer_id;
            const sellerId = chat.sellerId ?? chat.seller_id;
            const isSeller = currentUser?.id === sellerId;
            const canRespond = isSeller && offerStatus === "pending" && !isMe;

            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2 duration-300`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl shadow-md border-2 overflow-hidden ${
                    offerStatus === "accepted"
                      ? "border-green-300 bg-green-50"
                      : offerStatus === "rejected"
                        ? "border-red-200 bg-red-50 opacity-70"
                        : isMe
                          ? "border-teal-300 bg-teal-50"
                          : "border-amber-300 bg-amber-50"
                  }`}
                >
                  <div className="px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-warm-500 mb-1">
                      {isMe ? "Your Offer" : "Offer Received"}
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-midnight-700">
                        ₹{offerAmt?.toLocaleString("en-IN")}
                      </span>
                      {offerStatus !== "pending" && (
                        <span
                          className={`text-xs font-black uppercase tracking-widest ml-2 px-2 py-0.5 rounded-full ${
                            offerStatus === "accepted"
                              ? "bg-green-200 text-green-700"
                              : "bg-red-200 text-red-700"
                          }`}
                        >
                          {offerStatus}
                        </span>
                      )}
                    </div>
                  </div>
                  {canRespond && (
                    <div className="flex border-t border-warm-200">
                      <button
                        onClick={() =>
                          handleOfferResponse(msg.id, "accepted", offerAmt || 0)
                        }
                        className="flex-1 py-3 flex items-center justify-center gap-2 text-green-700 font-bold text-sm hover:bg-green-100 transition-colors border-r border-warm-200"
                      >
                        <ThumbsUp size={16} /> Accept
                      </button>
                      <button
                        onClick={() =>
                          handleOfferResponse(msg.id, "rejected", offerAmt || 0)
                        }
                        className="flex-1 py-3 flex items-center justify-center gap-2 text-red-600 font-bold text-sm hover:bg-red-100 transition-colors"
                      >
                        <ThumbsDown size={16} /> Decline
                      </button>
                    </div>
                  )}
                  <div className="px-4 py-1.5 bg-black/5">
                    <p className="text-[8px] font-black uppercase tracking-widest text-warm-500 text-right">
                      {msg.created_at
                        ? new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </p>
                  </div>
                </div>
              </div>
            );
          }

          // Regular text messages
          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2 duration-300`}
            >
              <div
                className={`max-w-[75%] px-4 py-3 rounded-2xl shadow-sm ${
                  isMe
                    ? "bg-teal-600 text-white rounded-tr-none"
                    : "bg-white text-midnight-700 rounded-tl-none border border-warm-200"
                }`}
              >
                <p className="text-sm font-medium leading-relaxed">
                  {msg.content || msg.message_text}
                </p>
                <div className="flex items-center justify-end space-x-1 mt-1 opacity-60">
                  <p className="text-[8px] font-black uppercase tracking-widest">
                    {msg.created_at
                      ? new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </p>
                  {isMe &&
                    (msg.is_read || msg.isRead ? (
                      <CheckCheck size={12} className="text-emerald-500" />
                    ) : (
                      <Check size={12} />
                    ))}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      <div className="p-4 bg-white border-t safe-bottom">
        {nudgeType && (
          <SafetyNudge type={nudgeType} onDismiss={() => setNudgeType(null)} />
        )}
        {showOfferInput && (
          <div className="flex items-center gap-2 mb-3 p-3 bg-amber-50 rounded-2xl border border-amber-200 animate-in slide-in-from-bottom-2 duration-200">
            <IndianRupee size={18} className="text-amber-600 flex-shrink-0" />
            <input
              type="number"
              placeholder="Enter your offer"
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendOffer()}
              autoFocus
              className="flex-1 bg-white rounded-xl px-3 py-2 text-sm font-bold text-midnight-700 border border-amber-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none"
            />
            <button
              onClick={handleSendOffer}
              disabled={!offerAmount || parseFloat(offerAmount) <= 0}
              className="px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-40 hover:bg-amber-600 transition-colors"
            >
              Send
            </button>
            <button
              onClick={() => {
                setShowOfferInput(false);
                setOfferAmount("");
              }}
              className="p-1.5 text-warm-400 hover:text-warm-600 transition-colors"
              aria-label="Cancel offer"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div className="flex items-center space-x-2">
          {!showOfferInput && (
            <button
              onClick={() => setShowOfferInput(true)}
              className="p-3 bg-amber-50 text-amber-600 rounded-2xl border-2 border-amber-200 hover:bg-amber-100 transition-colors flex-shrink-0"
              title="Make an offer"
            >
              <IndianRupee size={20} />
            </button>
          )}
          <div className="flex-1 bg-warm-100 rounded-[24px] flex items-center px-5 py-3 border-2 border-warm-200 focus-within:border-teal-500 focus-within:bg-white transition-all">
            <input
              type="text"
              placeholder="Type your message..."
              className="bg-transparent flex-1 outline-none text-sm font-bold placeholder:text-warm-400"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!inputText.trim()}
            aria-label="Send message"
            data-testid="send-button"
            className="p-4 bg-teal-600 text-white rounded-[20px] shadow-xl shadow-teal-600/20 active:scale-90 transition-all disabled:opacity-30 disabled:scale-95"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        listingId={listingId || ""}
        listingTitle={chat.listing?.title || "Chat Listing"}
        reportedUserId={reportTargetUserId || ""}
      />
    </div>
  );
};
