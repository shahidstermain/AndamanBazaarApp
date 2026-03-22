
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, getDocs, addDoc, updateDoc, setDoc, collection, query, where, orderBy, limit, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Chat, Message, Profile } from '../types';
import { Send, ChevronLeft, ShieldCheck, Check, CheckCheck } from 'lucide-react';
import { messageSchema, sanitizePlainText } from '../lib/validation';
import { checkRateLimit, logAuditEvent, sanitizeErrorMessage } from '../lib/security';
import { useToast } from '../components/Toast';
import { COPY } from '../lib/localCopy';

export const ChatRoom: React.FC = () => {
  const { chatId } = useParams();
  const id = chatId;
  const navigate = useNavigate();
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  const [hasMore, setHasMore] = useState(false);
  const MESSAGES_PER_PAGE = 50;

  useEffect(() => {
    const initChat = async () => {
      const user = auth.currentUser;
      if (!user) return;
      setCurrentUser(user);

      try {
        let chatData: any = null;

        // Try to load chat by ID first
        if (id) {
          const chatRef = doc(db, 'chats', id);
          const chatSnap = await getDoc(chatRef);
          if (chatSnap.exists()) {
            chatData = { id: chatSnap.id, ...chatSnap.data() };
          }
        }

        // If ID is actually a listing ID (from "Chat Now" button), resolve correctly
        if (!chatData && id) {
          const listingRef = doc(db, 'listings', id);
          const listingSnap = await getDoc(listingRef);

          if (listingSnap.exists()) {
            const listing = { id: listingSnap.id, ...listingSnap.data() } as any;

            // Guard: prevent chatting on own listing
            if (listing.user_id === user.uid) {
              setLoading(false);
              return;
            }

            // Check for existing chat
            const existingChatSnap = await getDocs(query(
              collection(db, 'chats'),
              where('listing_id', '==', listing.id),
              where('buyer_id', '==', user.uid)
            ));

            if (!existingChatSnap.empty) {
              const existingDoc = existingChatSnap.docs[0];
              chatData = { id: existingDoc.id, ...existingDoc.data() };
            } else if (listing.status === 'sold' || listing.status === 'deleted' || listing.status === 'expired') {
              navigate('/listings');
              return;
            } else {
              // Create new chat
              const newChatRef = await addDoc(collection(db, 'chats'), {
                listing_id: listing.id,
                buyer_id: user.uid,
                seller_id: listing.user_id,
                last_message: null,
                last_message_at: null,
                buyer_unread_count: 0,
                seller_unread_count: 0,
                created_at: new Date().toISOString()
              });
              chatData = { id: newChatRef.id, listing_id: listing.id, buyer_id: user.uid, seller_id: listing.user_id, buyer_unread_count: 0, seller_unread_count: 0 };
            }
          }
        }

        if (chatData) {
          // Enrich with listing and profile data
          const [listingSnap, sellerSnap, buyerSnap] = await Promise.all([
            chatData.listing_id ? getDoc(doc(db, 'listings', chatData.listing_id)) : null,
            chatData.seller_id ? getDoc(doc(db, 'profiles', chatData.seller_id)) : null,
            chatData.buyer_id ? getDoc(doc(db, 'profiles', chatData.buyer_id)) : null
          ]);

          chatData.listing = listingSnap?.exists() ? { id: listingSnap.id, ...listingSnap.data() } : null;
          chatData.seller = sellerSnap?.exists() ? { id: sellerSnap.id, ...sellerSnap.data() } : null;
          chatData.buyer = buyerSnap?.exists() ? { id: buyerSnap.id, ...buyerSnap.data() } : null;

          setChat(chatData);

          // Fetch initial messages
          const msgsSnap = await getDocs(query(
            collection(db, 'messages'),
            where('chat_id', '==', chatData.id),
            orderBy('created_at', 'desc'),
            limit(MESSAGES_PER_PAGE)
          ));
          const msgs = msgsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)).reverse();
          setMessages(msgs);
          setHasMore(msgsSnap.docs.length === MESSAGES_PER_PAGE);

          // Reset unread count
          const isBuyer = user.uid === chatData.buyer_id;
          const chatRef = doc(db, 'chats', chatData.id);
          await updateDoc(chatRef, { [isBuyer ? 'buyer_unread_count' : 'seller_unread_count']: 0 });
        }
      } catch (err) {
        console.error('Chat init error:', err);
      } finally {
        setLoading(false);
      }
    };

    initChat();
  }, [id]);

  // Real-time message listener
  useEffect(() => {
    if (!chat) return;
    const unsubscribe = onSnapshot(
      query(
        collection(db, 'messages'),
        where('chat_id', '==', chat.id),
        orderBy('created_at', 'asc')
      ),
      (snapshot) => {
        const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
        setMessages(msgs);
      }
    );

    return () => unsubscribe();
  }, [chat?.id]);

  useEffect(() => {
    if (scrollRef.current && typeof scrollRef.current.scrollIntoView === 'function') {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const loadMoreMessages = async () => {
    if (!chat || !hasMore || messages.length === 0) return;
    const oldestMessage = messages[0];
    try {
      const olderSnap = await getDocs(query(
        collection(db, 'messages'),
        where('chat_id', '==', chat.id),
        where('created_at', '<', oldestMessage.created_at),
        orderBy('created_at', 'desc'),
        limit(MESSAGES_PER_PAGE)
      ));

      if (olderSnap.docs.length > 0) {
        const olderMsgs = olderSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)).reverse();
        setMessages(prev => [...olderMsgs, ...prev]);
        if (olderSnap.docs.length < MESSAGES_PER_PAGE) setHasMore(false);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error loading more messages:', err);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !chat || !currentUser) return;

    const rateLimitCheck = checkRateLimit(`${currentUser.uid}:send_message`, {
      maxRequests: 10,
      windowSeconds: 60
    });

    if (!rateLimitCheck.allowed) {
      showToast(`Please wait ${rateLimitCheck.retryAfter}s before sending more messages.`, 'warning');
      await logAuditEvent({
        action: 'message_rate_limited',
        status: 'blocked',
        metadata: { chat_id: chat.id }
      });
      return;
    }

    const messageText = inputText.trim();
    const sanitizedMessage = sanitizePlainText(messageText);

    const validationResult = messageSchema.safeParse({
      message_text: sanitizedMessage,
      image_url: ''
    });

    if (!validationResult.success) {
      showToast('Your message contains invalid content. Please revise.', 'error');
      await logAuditEvent({
        action: 'message_validation_failed',
        status: 'blocked',
        metadata: { error: validationResult.error.issues[0].message }
      });
      return;
    }

    setInputText('');

    try {
      // Add message to Firestore
      await addDoc(collection(db, 'messages'), {
        chat_id: chat.id,
        sender_id: currentUser.uid,
        message_text: sanitizedMessage,
        is_read: false,
        created_at: new Date().toISOString()
      });

      // Update chat's last_message and increment unread for recipient
      const isBuyer = currentUser.uid === chat.buyer_id;
      const chatRef = doc(db, 'chats', chat.id);
      const { increment } = await import('firebase/firestore');
      await updateDoc(chatRef, {
        last_message: sanitizedMessage,
        last_message_at: new Date().toISOString(),
        [isBuyer ? 'seller_unread_count' : 'buyer_unread_count']: increment(1)
      });

      await logAuditEvent({
        action: 'message_sent',
        resource_type: 'message',
        status: 'success',
        metadata: { chat_id: chat.id }
      });
    } catch (err) {
      console.error('Error sending message:', err);
      showToast('Message failed to send. Please try again.', 'error');
      setInputText(messageText);
      await logAuditEvent({
        action: 'message_send_failed',
        status: 'failed',
        metadata: { error: sanitizeErrorMessage(err) }
      });
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-white">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-ocean-600"></div>
    </div>
  );

  if (!chat) return (
    <div className="h-screen flex flex-col items-center justify-center p-8 text-center bg-white">
      <h2 className="text-2xl font-black mb-2 uppercase tracking-tighter">Chat Unavailable</h2>
      <p className="text-sm text-slate-500 font-medium mb-4">{COPY.CHAT.SELLER_UNAVAILABLE}</p>
      <Link to="/chats" className="bg-ocean-700 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest">Back to Inbox</Link>
    </div>
  );

  const otherParty = currentUser?.uid === chat.buyer_id ? chat.seller : chat.buyer;

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <div className="px-4 py-3 border-b bg-white flex items-center justify-between shadow-sm sticky top-0 z-20">
        <div className="flex items-center space-x-3">
          <button onClick={() => navigate('/chats')} aria-label="Go back to inbox" className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm ring-1 ring-slate-100">
            <img src={otherParty?.profile_photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherParty?.id}`} alt="" />
          </div>
          <div>
            <div className="flex items-center space-x-1">
              <h3 className="font-black text-xs text-slate-900 leading-tight uppercase tracking-tight">{otherParty?.name || 'Seller'}</h3>
              {otherParty?.is_location_verified && <ShieldCheck size={12} className="text-ocean-600" />}
            </div>
            {otherParty?.is_location_verified ? (
              <p className="text-[9px] font-black text-green-600 uppercase tracking-widest">Island Verified</p>
            ) : (
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4">
          <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest text-center">
            Safety Tip: Meet in public places and never share banking details.
          </p>
        </div>
        {hasMore && (
          <div className="text-center py-2">
            <button
              onClick={loadMoreMessages}
              className="text-[10px] font-black text-ocean-600 uppercase tracking-widest bg-ocean-50 px-4 py-2 rounded-full hover:bg-ocean-100 transition-colors"
            >
              Load older messages
            </button>
          </div>
        )}
        <div className="text-center py-6">
          <p className="text-[11px] font-bold text-slate-500 bg-slate-100 inline-block px-4 py-1.5 rounded-full">{COPY.CHAT.CONVERSATION_STARTED}</p>
        </div>

        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUser?.uid;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
              <div className={`max-w-[75%] px-4 py-3 rounded-2xl shadow-sm ${isMe ? 'bg-ocean-700 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-200'
                }`}>
                <p className="text-sm font-medium leading-relaxed">{msg.message_text}</p>
                <div className="flex items-center justify-end space-x-1 mt-1 opacity-60">
                  <p className="text-[8px] font-black uppercase tracking-widest">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {isMe && (
                    msg.is_read ? (
                      <CheckCheck size={12} className="text-blue-500" />
                    ) : (
                      <Check size={12} />
                    )
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      <div className="p-4 bg-white border-t safe-bottom">
        <div className="flex items-center space-x-3">
          <div className="flex-1 bg-slate-50 rounded-[24px] flex items-center px-5 py-3 border-2 border-slate-100 focus-within:border-ocean-600 focus-within:bg-white transition-all">
            <input
              type="text"
              placeholder="Type your message..."
              className="bg-transparent flex-1 outline-none text-sm font-bold placeholder:text-slate-400"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!inputText.trim()}
            aria-label="Send message"
            data-testid="send-button"
            className="p-4 bg-ocean-700 text-white rounded-[20px] shadow-xl shadow-ocean-700/20 active:scale-90 transition-all disabled:opacity-30 disabled:scale-95"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
