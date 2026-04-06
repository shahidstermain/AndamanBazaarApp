"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendAbandonedChatReminders = exports.sendListingExpiryReminders = exports.cleanupOldData = exports.calculateResponseRates = exports.markInactiveListings = exports.updateListingFreshness = exports.sendWeeklyTrendingEmails = exports.sendEmail = exports.handleWebhook = exports.healthCheck = exports.verifyBoostPayment = exports.createBoostOrder = exports.verifyOrderStatus = exports.getOrderPayments = exports.processSeamlessPayment = exports.createSeamlessOrder = exports.getPaymentDetails = exports.getPaymentHistoryNew = exports.checkPaymentStatus = exports.webhookHealthCheck = exports.cashfreeWebhookV2 = exports.cleanupExpiredReservations = exports.createOrder = exports.getModerationStats = exports.getModerationHistory = exports.batchModerateContent = exports.moderateContent = exports.getNearbyListings = exports.getLocationHistory = exports.verifyLocation = exports.getPaymentHistory = exports.refundPayment = exports.cashfreeWebhook = exports.verifyPayment = exports.createPayment = void 0;
const functions = __importStar(require("firebase-functions"));
const v2_1 = require("firebase-functions/v2");
const admin = __importStar(require("firebase-admin"));
// Import all function modules
const payment_1 = require("./payment");
Object.defineProperty(exports, "createPayment", { enumerable: true, get: function () { return payment_1.createPayment; } });
Object.defineProperty(exports, "verifyPayment", { enumerable: true, get: function () { return payment_1.verifyPayment; } });
Object.defineProperty(exports, "cashfreeWebhook", { enumerable: true, get: function () { return payment_1.cashfreeWebhook; } });
Object.defineProperty(exports, "refundPayment", { enumerable: true, get: function () { return payment_1.refundPayment; } });
Object.defineProperty(exports, "getPaymentHistory", { enumerable: true, get: function () { return payment_1.getPaymentHistory; } });
const location_1 = require("./location");
Object.defineProperty(exports, "verifyLocation", { enumerable: true, get: function () { return location_1.verifyLocation; } });
Object.defineProperty(exports, "getLocationHistory", { enumerable: true, get: function () { return location_1.getLocationHistory; } });
Object.defineProperty(exports, "getNearbyListings", { enumerable: true, get: function () { return location_1.getNearbyListings; } });
const moderation_1 = require("./moderation");
Object.defineProperty(exports, "moderateContent", { enumerable: true, get: function () { return moderation_1.moderateContent; } });
Object.defineProperty(exports, "batchModerateContent", { enumerable: true, get: function () { return moderation_1.batchModerateContent; } });
Object.defineProperty(exports, "getModerationHistory", { enumerable: true, get: function () { return moderation_1.getModerationHistory; } });
Object.defineProperty(exports, "getModerationStats", { enumerable: true, get: function () { return moderation_1.getModerationStats; } });
const email_1 = require("./email");
Object.defineProperty(exports, "sendEmail", { enumerable: true, get: function () { return email_1.sendEmail; } });
Object.defineProperty(exports, "sendWeeklyTrendingEmails", { enumerable: true, get: function () { return email_1.sendWeeklyTrendingEmails; } });
const emailTemplatesNode_1 = require("./emailTemplatesNode");
const freshness_1 = require("./freshness");
Object.defineProperty(exports, "updateListingFreshness", { enumerable: true, get: function () { return freshness_1.updateListingFreshness; } });
Object.defineProperty(exports, "markInactiveListings", { enumerable: true, get: function () { return freshness_1.markInactiveListings; } });
Object.defineProperty(exports, "calculateResponseRates", { enumerable: true, get: function () { return freshness_1.calculateResponseRates; } });
// Import new payment functions
const createOrder_1 = require("./payments/createOrder");
Object.defineProperty(exports, "createOrder", { enumerable: true, get: function () { return createOrder_1.createOrder; } });
Object.defineProperty(exports, "cleanupExpiredReservations", { enumerable: true, get: function () { return createOrder_1.cleanupExpiredReservations; } });
const cashfreeWebhook_1 = require("./payments/cashfreeWebhook");
Object.defineProperty(exports, "cashfreeWebhookV2", { enumerable: true, get: function () { return cashfreeWebhook_1.cashfreeWebhook; } });
Object.defineProperty(exports, "webhookHealthCheck", { enumerable: true, get: function () { return cashfreeWebhook_1.webhookHealthCheck; } });
const checkPaymentStatus_1 = require("./payments/checkPaymentStatus");
Object.defineProperty(exports, "checkPaymentStatus", { enumerable: true, get: function () { return checkPaymentStatus_1.checkPaymentStatus; } });
Object.defineProperty(exports, "getPaymentHistoryNew", { enumerable: true, get: function () { return checkPaymentStatus_1.getPaymentHistory; } });
Object.defineProperty(exports, "getPaymentDetails", { enumerable: true, get: function () { return checkPaymentStatus_1.getPaymentDetails; } });
const seamlessPayment_1 = require("./payments/seamlessPayment");
Object.defineProperty(exports, "createSeamlessOrder", { enumerable: true, get: function () { return seamlessPayment_1.createSeamlessOrder; } });
Object.defineProperty(exports, "processSeamlessPayment", { enumerable: true, get: function () { return seamlessPayment_1.processSeamlessPayment; } });
Object.defineProperty(exports, "getOrderPayments", { enumerable: true, get: function () { return seamlessPayment_1.getOrderPayments; } });
Object.defineProperty(exports, "verifyOrderStatus", { enumerable: true, get: function () { return seamlessPayment_1.verifyOrderStatus; } });
const createBoostOrder_1 = require("./payments/createBoostOrder");
Object.defineProperty(exports, "createBoostOrder", { enumerable: true, get: function () { return createBoostOrder_1.createBoostOrder; } });
const verifyBoostPayment_1 = require("./payments/verifyBoostPayment");
Object.defineProperty(exports, "verifyBoostPayment", { enumerable: true, get: function () { return verifyBoostPayment_1.verifyBoostPayment; } });
// Health check function
exports.healthCheck = functions.https.onRequest(async (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
    });
});
// General webhook handler
exports.handleWebhook = functions.https.onRequest(async (req, res) => {
    const webhookType = req.headers['x-webhook-type'];
    const payload = req.body;
    try {
        switch (webhookType) {
            case 'cashfree':
                await (0, payment_1.cashfreeWebhook)(req, res);
                break;
            default:
                v2_1.logger.error('Unknown webhook type:', webhookType);
                res.status(400).send('Unknown webhook type');
        }
    }
    catch (error) {
        v2_1.logger.error('Error handling webhook:', error);
        res.status(500).send('Webhook processing failed');
    }
});
// Scheduled tasks
exports.cleanupOldData = functions.pubsub
    .schedule('every 24 hours')
    .onRun(async () => {
    v2_1.logger.info('Running scheduled cleanup tasks');
});
// Scheduled: listing expiry reminders (runs daily)
exports.sendListingExpiryReminders = functions.pubsub
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
        if (!listing.sellerId)
            continue;
        const userDoc = await db.collection('users').doc(listing.sellerId).get();
        const user = userDoc.data();
        if (!user?.email || user?.emailNotifications?.listingExpiring === false)
            continue;
        const template = emailTemplatesNode_1.emailTemplates.listingExpiring({
            LISTING_NAME: listing.title || 'Your listing',
            RENEW_LISTING: `https://andamanbazaar.in/listings/${doc.id}/edit`,
        });
        await (0, email_1.sendEmailInternal)(user.email, template.subject, template.htmlContent);
    }
    v2_1.logger.info(`Expiry reminders sent for ${snap.size} listings`);
});
// Scheduled: abandoned chat reminders (runs every 6 hours)
exports.sendAbandonedChatReminders = functions.pubsub
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
        if (!unansweredUserId)
            continue;
        const userDoc = await db.collection('users').doc(unansweredUserId).get();
        const user = userDoc.data();
        if (!user?.email || user?.emailNotifications?.abandonedChat === false)
            continue;
        const template = emailTemplatesNode_1.emailTemplates.abandonedChat({
            LISTING_NAME: chat.listingTitle || 'a listing',
            CHAT_LINK: `https://andamanbazaar.in/chat/${doc.id}`,
        });
        await (0, email_1.sendEmailInternal)(user.email, template.subject, template.htmlContent);
        await doc.ref.update({ reminderSent: true });
    }
    v2_1.logger.info(`Abandoned chat reminders sent for ${snap.size} chats`);
});
//# sourceMappingURL=index.js.map