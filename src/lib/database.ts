import { db as firestoreDb } from "./firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

// ===== DATABASE PROVIDER TYPES =====

// ===== INTERFACES =====

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  city: string;
  images: Array<{
    id: string;
    url: string;
    alt: string;
  }>;
  status: "draft" | "active" | "sold" | "deleted";
  isActive: boolean;
  isFeatured: boolean;
  featuredUntil?: Timestamp;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  views?: number;
  favorites?: number;
  locationVerified?: boolean;
  condition?: "new" | "like_new" | "good" | "fair";
  negotiable?: boolean;
  area?: string;
  itemAge?: string | null;
  accessories?: string[];
  isNegotiable?: boolean;
  minPrice?: number | null;
  contactPreferences?: any;
  idempotencyKey?: string;
  [key: string]: any;
}

export interface Chat {
  id: string;
  buyerId: string;
  sellerId: string;
  listingId: string;
  isActive: boolean;
  lastMessageAt?: Timestamp;
  lastMessagePreview?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Message {
  id: string;
  chatId: string;
  content: string;
  type: "text" | "image" | "system";
  senderId: string;
  senderRole: "buyer" | "seller";
  isRead: boolean;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface Favorite {
  id: string;
  userId: string;
  listingId: string;
  createdAt: Timestamp;
}

// ===== LISTING OPERATIONS =====

export const getListing = async (id: string): Promise<Listing | null> => {
  try {
    const docSnap = await getDoc(doc(firestoreDb, "listings", id));
    return docSnap.exists()
      ? ({ id: docSnap.id, ...docSnap.data() } as Listing)
      : null;
  } catch (error) {
    console.error("Error getting listing:", error);
    throw error;
  }
};

export const getListings = async (options: {
  category?: string;
  city?: string;
  status?: string;
  limit?: number;
  startAfter?: string;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
}): Promise<{ listings: Listing[]; hasMore: boolean; lastDoc?: any }> => {
  try {
    const constraints: any[] = [];
    if (options.category)
      constraints.push(where("category", "==", options.category));
    if (options.city) constraints.push(where("city", "==", options.city));
    if (options.status) constraints.push(where("status", "==", options.status));
    constraints.push(
      orderBy(options.orderBy || "createdAt", options.orderDirection || "desc"),
    );
    if (options.limit) constraints.push(limit(options.limit));
    if (options.startAfter)
      constraints.push(
        startAfter(doc(firestoreDb, "listings", options.startAfter)),
      );

    const querySnapshot = await getDocs(
      query(collection(firestoreDb, "listings"), ...constraints),
    );
    const listings = querySnapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Listing[];
    return {
      listings,
      hasMore: listings.length === (options.limit || 10),
      lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1],
    };
  } catch (error) {
    console.error("Error getting listings:", error);
    throw error;
  }
};

export const createListing = async (
  listingData: Omit<Listing, "id" | "createdAt" | "updatedAt">,
): Promise<Listing> => {
  try {
    const now = serverTimestamp();
    const docRef = await addDoc(collection(firestoreDb, "listings"), {
      ...listingData,
      createdAt: now,
      updatedAt: now,
    });
    const localNow = Timestamp.now();
    return {
      id: docRef.id,
      ...listingData,
      createdAt: localNow,
      updatedAt: localNow,
    } as Listing;
  } catch (error) {
    console.error("Error creating listing:", error);
    throw error;
  }
};

export const updateListing = async (
  id: string,
  updates: Partial<Listing>,
): Promise<Listing> => {
  try {
    await updateDoc(doc(firestoreDb, "listings", id), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    const updated = await getListing(id);
    if (!updated) throw new Error("Failed to retrieve updated listing");
    return updated;
  } catch (error) {
    console.error("Error updating listing:", error);
    throw error;
  }
};

// ===== CHAT OPERATIONS =====

export const getChat = async (id: string): Promise<Chat | null> => {
  try {
    const docSnap = await getDoc(doc(firestoreDb, "chats", id));
    return docSnap.exists()
      ? ({ id: docSnap.id, ...docSnap.data() } as Chat)
      : null;
  } catch (error) {
    console.error("Error getting chat:", error);
    throw error;
  }
};

export const getUserChats = async (userId: string): Promise<Chat[]> => {
  try {
    const [buyerSnap, sellerSnap] = await Promise.all([
      getDocs(
        query(
          collection(firestoreDb, "chats"),
          where("isActive", "==", true),
          where("buyerId", "==", userId),
          orderBy("lastMessageAt", "desc"),
        ),
      ),
      getDocs(
        query(
          collection(firestoreDb, "chats"),
          where("isActive", "==", true),
          where("sellerId", "==", userId),
          orderBy("lastMessageAt", "desc"),
        ),
      ),
    ]);
    return [...buyerSnap.docs, ...sellerSnap.docs]
      .map((d) => ({ id: d.id, ...d.data() }) as Chat)
      .sort(
        (a, b) =>
          (b.lastMessageAt?.toMillis?.() || 0) -
          (a.lastMessageAt?.toMillis?.() || 0),
      );
  } catch (error) {
    console.error("Error getting user chats:", error);
    throw error;
  }
};

// ===== REAL-TIME OPERATIONS =====

export const subscribeToListing = (
  id: string,
  callback: (listing: Listing | null) => void,
): (() => void) => {
  return onSnapshot(doc(firestoreDb, "listings", id), (docSnap) => {
    callback(
      docSnap.exists()
        ? ({ id: docSnap.id, ...docSnap.data() } as Listing)
        : null,
    );
  });
};

export const subscribeToUserChats = (
  userId: string,
  callback: (chats: Chat[]) => void,
): (() => void) => {
  const buyerUnsub = onSnapshot(
    query(
      collection(firestoreDb, "chats"),
      where("isActive", "==", true),
      where("buyerId", "==", userId),
    ),
    (snap) =>
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Chat)),
  );
  const sellerUnsub = onSnapshot(
    query(
      collection(firestoreDb, "chats"),
      where("isActive", "==", true),
      where("sellerId", "==", userId),
    ),
    (snap) =>
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Chat)),
  );
  return () => {
    buyerUnsub();
    sellerUnsub();
  };
};

export default {
  getListing,
  getListings,
  createListing,
  updateListing,
  getChat,
  getUserChats,
  subscribeToListing,
  subscribeToUserChats,
};
