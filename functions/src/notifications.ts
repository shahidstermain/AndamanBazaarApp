import * as functions from "firebase-functions";
import { logger } from "firebase-functions/v2";
import { admin } from "./utils/admin";

// ============================================================
// Firebase Cloud Messaging — Server-Side Push Notifications
//
// Triggers:
//   - New chat message  → notify recipient
//   - Boost activated   → notify listing owner
//   - Listing sold      → notify seller
//   - New offer/inquiry → notify seller
// ============================================================

const db = admin.firestore();
const messaging = admin.messaging();

// ── Helpers ──────────────────────────────────────────────────

async function getFcmToken(userId: string): Promise<string | null> {
  const snap = await db.collection("fcmTokens").doc(userId).get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  return data.token || null;
}

async function sendPush(
  userId: string,
  title: string,
  body: string,
  data: Record<string, string> = {},
): Promise<void> {
  const token = await getFcmToken(userId);
  if (!token) return;

  try {
    await messaging.send({
      token,
      notification: { title, body },
      data: { ...data, timestamp: Date.now().toString() },
      webpush: {
        notification: {
          icon: "/favicon.png",
          badge: "/favicon.png",
          requireInteraction: false,
        },
        fcmOptions: {
          link: data.url || "/",
        },
      },
    });
    logger.info("Push sent", { userId, title });
  } catch (err: any) {
    if (
      err.code === "messaging/registration-token-not-registered" ||
      err.code === "messaging/invalid-registration-token"
    ) {
      await db.collection("fcmTokens").doc(userId).update({ token: null });
      logger.info("Stale FCM token cleared", { userId });
    } else {
      logger.error("Push send failed", { userId, err: err.message });
    }
  }
}

// ── Trigger: New chat message ─────────────────────────────────

export const onNewChatMessage = functions.firestore
  .document("chats/{chatId}/messages/{messageId}")
  .onCreate(async (snap, context) => {
    const msg = snap.data();
    const { chatId } = context.params;

    if (!msg.senderId) return;

    const chatSnap = await db.collection("chats").doc(chatId).get();
    if (!chatSnap.exists) return;

    const chat = chatSnap.data()!;
    const recipientId =
      msg.senderId === chat.buyerId ? chat.sellerId : chat.buyerId;
    if (!recipientId) return;

    const listingTitle: string = chat.listingTitle || "your listing";

    await sendPush(
      recipientId,
      "New message",
      msg.text ? msg.text.substring(0, 100) : "You have a new message",
      {
        type: "new_message",
        chatId,
        url: `/chat/${chatId}`,
        listingTitle,
      },
    );
  });

// ── Trigger: Boost activated ──────────────────────────────────

export const onBoostActivated = functions.firestore
  .document("listingBoosts/{boostId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.status !== "paid" && after.status === "paid") {
      const { boostId } = context.params;

      let listingTitle = "your listing";
      try {
        const listingSnap = await db
          .collection("listings")
          .doc(after.listingId)
          .get();
        if (listingSnap.exists)
          listingTitle = listingSnap.data()!.title || listingTitle;
      } catch {
        /* non-critical */
      }

      const expiresAt = after.boostExpiresAt?.toDate?.();
      const expiresStr = expiresAt
        ? expiresAt.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          })
        : "";

      await sendPush(
        after.userId,
        "🚀 Boost Activated!",
        `"${listingTitle}" is now boosted${expiresStr ? ` until ${expiresStr}` : ""}.`,
        {
          type: "boost_activated",
          boostId,
          listingId: after.listingId,
          url: `/listing/${after.listingId}`,
        },
      );
    }
  });

// ── Trigger: Listing sold ─────────────────────────────────────

export const onListingSold = functions.firestore
  .document("listings/{listingId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.status !== "sold" && after.status === "sold") {
      const { listingId } = context.params;

      await sendPush(
        after.userId,
        "🎉 Listing Sold!",
        `Congratulations! "${after.title || "Your listing"}" has been marked as sold.`,
        {
          type: "listing_sold",
          listingId,
          url: `/listing/${listingId}`,
        },
      );
    }
  });

// ── Trigger: New favorite on listing ─────────────────────────

export const onNewFavorite = functions.firestore
  .document("favorites/{favoriteId}")
  .onCreate(async (snap) => {
    const { listingId, userId: favoritedBy } = snap.data();
    if (!listingId || !favoritedBy) return;

    const listingSnap = await db.collection("listings").doc(listingId).get();
    if (!listingSnap.exists) return;

    const listing = listingSnap.data()!;
    if (!listing.userId || listing.userId === favoritedBy) return;

    await sendPush(
      listing.userId,
      "❤️ Someone liked your listing",
      `"${listing.title || "Your listing"}" was added to favourites.`,
      {
        type: "new_favorite",
        listingId,
        url: `/listing/${listingId}`,
      },
    );
  });

// ── HTTP: Send targeted notification (Admin only) ─────────────

export const sendAdminNotification = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Auth required");
    }

    const userSnap = await db.collection("users").doc(context.auth.uid).get();
    if (userSnap.data()?.role !== "admin") {
      throw new functions.https.HttpsError("permission-denied", "Admin only");
    }

    const { userId, title, body, url } = data as {
      userId?: string;
      title: string;
      body: string;
      url?: string;
    };

    if (!title || !body) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "title and body required",
      );
    }

    if (userId) {
      await sendPush(userId, title, body, { type: "admin", url: url || "/" });
      return { sent: 1 };
    }

    // Broadcast to all tokens with non-null token
    const tokensSnap = await db
      .collection("fcmTokens")
      .where("token", "!=", null)
      .limit(500)
      .get();

    let sent = 0;
    await Promise.all(
      tokensSnap.docs.map(async (d) => {
        const token = d.data().token;
        const uid = d.id;
        if (!token) return;
        try {
          await messaging.send({
            token,
            notification: { title, body },
            data: {
              type: "admin",
              url: url || "/",
              timestamp: Date.now().toString(),
            },
            webpush: { fcmOptions: { link: url || "/" } },
          });
          sent++;
        } catch (err: any) {
          if (err.code === "messaging/registration-token-not-registered") {
            await db.collection("fcmTokens").doc(uid).update({ token: null });
          }
        }
      }),
    );

    logger.info("Admin broadcast sent", { sent, total: tokensSnap.size });
    return { sent };
  },
);
