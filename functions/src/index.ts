import * as functions from 'firebase-functions';
import { logger } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

// Import all function modules
import { createPayment, verifyPayment, cashfreeWebhook, refundPayment, getPaymentHistory } from './payment';
import { verifyLocation, getLocationHistory, getNearbyListings } from './location';
import { moderateContent, batchModerateContent, getModerationHistory, getModerationStats } from './moderation';
import { sendEmail, sendWeeklyTrendingEmails, sendEmailInternal } from './email';
import { emailTemplates } from './emailTemplatesNode';
import { updateListingFreshness, markInactiveListings, calculateResponseRates } from './freshness';
import { generateItinerary } from './itinerary';

// Import new payment functions
import { createOrder, cleanupExpiredReservations } from './payments/createOrder';
import { cashfreeWebhook as newCashfreeWebhook, webhookHealthCheck } from './payments/cashfreeWebhook';
import { checkPaymentStatus, getPaymentHistory as getPaymentHistoryNew, getPaymentDetails } from './payments/checkPaymentStatus';
import { 
  createSeamlessOrder, 
  processSeamlessPayment, 
  getOrderPayments, 
  verifyOrderStatus 
} from './payments/seamlessPayment';
import { createBoostOrder } from './payments/createBoostOrder';
import { verifyBoostPayment } from './payments/verifyBoostPayment';
import { expireBoosts } from './payments/expireBoosts';

// Export payment functions
export {
  createPayment,
  verifyPayment,
  cashfreeWebhook,
  refundPayment,
  getPaymentHistory,
};

// Export location functions
export {
  verifyLocation,
  getLocationHistory,
  getNearbyListings,
};

// Export moderation functions
export {
  moderateContent,
  batchModerateContent,
  getModerationHistory,
  getModerationStats,
};

// Export new payment functions
export {
  createOrder,
  cleanupExpiredReservations,
  newCashfreeWebhook as cashfreeWebhookV2,
  webhookHealthCheck,
  checkPaymentStatus,
  getPaymentHistoryNew,
  getPaymentDetails,
  createSeamlessOrder,
  processSeamlessPayment,
  getOrderPayments,
  verifyOrderStatus,
  createBoostOrder,
  verifyBoostPayment,
  expireBoosts,
};

// Health check function
export const healthCheck = functions.https.onRequest(async (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// General webhook handler
export const handleWebhook = functions.https.onRequest(async (req, res) => {
  const webhookType = req.headers['x-webhook-type'] as string;
  const payload = req.body;

  try {
    switch (webhookType) {
      case 'cashfree':
        await cashfreeWebhook(req, res);
        break;
      default:
        logger.error('Unknown webhook type:', webhookType);
        res.status(400).send('Unknown webhook type');
    }
  } catch (error) {
    logger.error('Error handling webhook:', error);
    res.status(500).send('Webhook processing failed');
  }
});

// Export email functions
export { sendEmail, sendWeeklyTrendingEmails };

// Export freshness functions
export { updateListingFreshness, markInactiveListings, calculateResponseRates };

// Export itinerary functions
export { generateItinerary };

// Scheduled tasks
export const cleanupOldData = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    logger.info('Running scheduled cleanup tasks');
  });

// Scheduled: listing expiry reminders (runs daily)
export const sendListingExpiryReminders = functions.pubsub
  .schedule('every 24 hours')
  .timeZone('Asia/Kolkata')
  .onRun(async () => {
    const db = admin.firestore();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);

    const snap = await db.collection('listings')
      .where('status', '==', 'active')
      .where('expiresAt', '>=', tomorrow)
      .where('expiresAt', '<', dayAfter)
      .get();

    for (const doc of snap.docs) {
      const listing = doc.data();
      if (!listing.sellerId) continue;
      const userDoc = await db.collection('users').doc(listing.sellerId).get();
      const user = userDoc.data();
      if (!user?.email || user?.emailNotifications?.listingExpiring === false) continue;

      const template = emailTemplates.listingExpiring({
        LISTING_NAME: listing.title || 'Your listing',
        RENEW_LISTING: `https://andamanbazaar.in/listings/${doc.id}/edit`,
      });
      await sendEmailInternal(user.email, template.subject, template.htmlContent);
    }
    logger.info(`Expiry reminders sent for ${snap.size} listings`);
  });

// Scheduled: abandoned chat reminders (runs every 6 hours)
export const sendAbandonedChatReminders = functions.pubsub
  .schedule('every 6 hours')
  .timeZone('Asia/Kolkata')
  .onRun(async () => {
    const db = admin.firestore();
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 24);
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const snap = await db.collection('chats')
      .where('lastMessageAt', '<=', cutoff)
      .where('lastMessageAt', '>=', twoDaysAgo)
      .where('reminderSent', '==', false)
      .limit(100)
      .get();

    for (const doc of snap.docs) {
      const chat = doc.data();
      const unansweredUserId = chat.lastMessageBy === chat.sellerId ? chat.buyerId : chat.sellerId;
      if (!unansweredUserId) continue;

      const userDoc = await db.collection('users').doc(unansweredUserId).get();
      const user = userDoc.data();
      if (!user?.email || user?.emailNotifications?.abandonedChat === false) continue;

      const template = emailTemplates.abandonedChat({
        LISTING_NAME: chat.listingTitle || 'a listing',
        CHAT_LINK: `https://andamanbazaar.in/chat/${doc.id}`,
      });
      await sendEmailInternal(user.email, template.subject, template.htmlContent);
      await doc.ref.update({ reminderSent: true });
    }
    logger.info(`Abandoned chat reminders sent for ${snap.size} chats`);
  });
