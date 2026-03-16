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
exports.webhookHealthCheck = exports.cashfreeWebhook = void 0;
const functions = __importStar(require("firebase-functions"));
const v2_1 = require("firebase-functions/v2");
const cashfreeClient_1 = require("../utils/cashfreeClient");
const admin_1 = require("../utils/admin");
const secrets_1 = require("../utils/secrets");
const paymentsRuntime = functions.runWith({ secrets: secrets_1.CASHFREE_SECRET_BINDINGS });
/**
 * Handles Cashfree webhook events
 *
 * Security considerations:
 * - Validates webhook signature for all requests
 * - Idempotent processing - safe to receive duplicate webhooks
 * - Logs all events for audit and debugging
 * - Updates payment state atomically
 * - Never trusts webhook data for critical decisions without validation
 */
exports.cashfreeWebhook = paymentsRuntime.https.onRequest(async (req, res) => {
    // Only accept POST requests
    if (req.method !== 'POST') {
        v2_1.logger.warn('Webhook received non-POST request', { method: req.method });
        return res.status(405).json({ error: 'Method not allowed' });
    }
    const signature = req.headers['x-cashfree-signature'];
    const payload = JSON.stringify(req.body);
    // Validate signature
    if (!signature) {
        v2_1.logger.error('Webhook missing signature');
        return res.status(401).json({ error: 'Missing signature' });
    }
    const isValidSignature = (0, cashfreeClient_1.verifyWebhookSignature)(payload, signature);
    if (!isValidSignature) {
        v2_1.logger.error('Webhook signature verification failed', {
            signature: signature.substring(0, 20) + '...',
            payloadLength: payload.length,
        });
        return res.status(401).json({ error: 'Invalid signature' });
    }
    // Generate unique event ID for idempotency
    const eventId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    try {
        // Parse webhook event
        const event = (0, cashfreeClient_1.parseWebhookEvent)(payload);
        // Log the webhook event immediately for audit
        const webhookLog = {
            eventId,
            type: event.type,
            timestamp: event.timestamp,
            orderId: event.orderId,
            orderStatus: event.orderStatus,
            paymentStatus: event.paymentStatus,
            paymentId: event.paymentId,
            paymentAmount: event.paymentAmount,
            orderAmount: event.orderAmount,
            signature,
            payload: req.body,
            processedAt: admin_1.admin.firestore.Timestamp.now(),
            processingStatus: 'SUCCESS',
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        };
        // Check for duplicate processing
        const existingEventQuery = await admin_1.admin.firestore()
            .collection('paymentEvents')
            .where('orderId', '==', event.orderId)
            .where('type', '==', event.type)
            .where('timestamp', '==', event.timestamp)
            .limit(1)
            .get();
        if (!existingEventQuery.empty) {
            v2_1.logger.info(`Duplicate webhook event detected: ${eventId}`, {
                existingEventId: existingEventQuery.docs[0].id,
                orderId: event.orderId,
                type: event.type,
            });
            // Update log as duplicate
            webhookLog.processingStatus = 'DUPLICATE';
            await admin_1.admin.firestore().collection('paymentEvents').doc(eventId).set(webhookLog);
            return res.status(200).json({
                success: true,
                message: 'Duplicate event ignored',
                eventId,
            });
        }
        // Process the webhook event
        await processWebhookEvent(event, eventId);
        // Save the webhook event log
        await admin_1.admin.firestore().collection('paymentEvents').doc(eventId).set(webhookLog);
        v2_1.logger.info(`Webhook event processed successfully: ${eventId}`, {
            orderId: event.orderId,
            type: event.type,
            orderStatus: event.orderStatus,
            paymentStatus: event.paymentStatus,
        });
        return res.status(200).json({
            success: true,
            eventId,
        });
    }
    catch (error) {
        v2_1.logger.error(`Webhook processing failed: ${eventId}`, {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            signature: signature.substring(0, 20) + '...',
        });
        // Log the failed event
        try {
            const failedWebhookLog = {
                eventId,
                type: 'WEBHOOK_ERROR',
                timestamp: new Date().toISOString(),
                orderId: 'unknown',
                orderStatus: 'ERROR',
                signature,
                payload: req.body,
                processedAt: admin_1.admin.firestore.Timestamp.now(),
                processingStatus: 'FAILED',
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
                ip: req.ip,
                userAgent: req.headers['user-agent'],
            };
            await admin_1.admin.firestore().collection('paymentEvents').doc(eventId).set(failedWebhookLog);
        }
        catch (logError) {
            v2_1.logger.error('Failed to log webhook error', logError);
        }
        return res.status(500).json({
            success: false,
            error: 'Webhook processing failed',
            eventId,
        });
    }
});
/**
 * Processes individual webhook events
 */
async function processWebhookEvent(event, eventId) {
    const orderId = event.orderId;
    // ── Check if this is a boost order ──────────────────────
    if (orderId.startsWith('BOOST_')) {
        return processBoostWebhookEvent(event, eventId);
    }
    // Get the payment order from Firestore
    const paymentDoc = await admin_1.admin.firestore().collection('payments').doc(orderId).get();
    if (!paymentDoc.exists) {
        v2_1.logger.warn(`Payment order not found for webhook: ${orderId}`, {
            eventId,
            orderStatus: event.orderStatus,
        });
        throw new Error(`Payment order not found: ${orderId}`);
    }
    const payment = paymentDoc.data();
    const batch = admin_1.admin.firestore.batch();
    // Prepare payment update based on event type
    let paymentUpdate = {
        orderStatus: event.orderStatus,
        paymentStatus: 'PENDING',
        updatedAt: admin_1.admin.firestore.Timestamp.now(),
        cashfreeResponse: event,
    };
    // Handle different event types
    switch (event.type) {
        case 'PAYMENT_SUCCESS':
        case 'ORDER_PAID':
            paymentUpdate.paymentStatus = 'SUCCESS';
            paymentUpdate.paymentId = event.paymentId;
            paymentUpdate.paymentAmount = event.paymentAmount;
            paymentUpdate.paymentTime = event.paymentTime;
            paymentUpdate.paymentCompletionTime = event.paymentCompletionTime;
            // Update listing as sold
            const listingRef = admin_1.admin.firestore().collection('listings').doc(payment.listingId);
            batch.update(listingRef, {
                status: 'sold',
                soldTo: payment.buyerId,
                soldAt: admin_1.admin.firestore.Timestamp.now(),
                soldPrice: payment.orderAmount,
                soldVia: 'cashfree',
                updatedAt: admin_1.admin.firestore.Timestamp.now(),
            });
            // Create purchase record
            const purchaseRef = admin_1.admin.firestore().collection('purchases').doc();
            batch.set(purchaseRef, {
                id: purchaseRef.id,
                orderId: orderId,
                cfOrderId: payment.cfOrderId,
                listingId: payment.listingId,
                buyerId: payment.buyerId,
                sellerId: payment.sellerId,
                purchaseAmount: payment.orderAmount,
                purchaseCurrency: payment.orderCurrency,
                paymentId: event.paymentId,
                paymentMethod: 'cashfree',
                purchaseStatus: 'completed',
                purchaseAt: admin_1.admin.firestore.Timestamp.now(),
                createdAt: admin_1.admin.firestore.Timestamp.now(),
            });
            // Send notification to seller (you can implement this later)
            await sendSellerNotification(payment.sellerId, {
                type: 'listing_sold',
                listingId: payment.listingId,
                orderId: orderId,
                buyerId: payment.buyerId,
                amount: payment.orderAmount,
            });
            break;
        case 'PAYMENT_FAILED':
        case 'ORDER_FAILED':
            paymentUpdate.paymentStatus = 'FAILED';
            // Release listing reservation
            const listingRefFailed = admin_1.admin.firestore().collection('listings').doc(payment.listingId);
            batch.update(listingRefFailed, {
                status: 'active',
                reservedBy: admin_1.admin.firestore.FieldValue.delete(),
                reservedAt: admin_1.admin.firestore.FieldValue.delete(),
                reservationExpiresAt: admin_1.admin.firestore.FieldValue.delete(),
                updatedAt: admin_1.admin.firestore.Timestamp.now(),
            });
            break;
        case 'PAYMENT_CANCELLED':
        case 'ORDER_CANCELLED':
            paymentUpdate.paymentStatus = 'CANCELLED';
            // Release listing reservation
            const listingRefCancelled = admin_1.admin.firestore().collection('listings').doc(payment.listingId);
            batch.update(listingRefCancelled, {
                status: 'active',
                reservedBy: admin_1.admin.firestore.FieldValue.delete(),
                reservedAt: admin_1.admin.firestore.FieldValue.delete(),
                reservationExpiresAt: admin_1.admin.firestore.FieldValue.delete(),
                updatedAt: admin_1.admin.firestore.Timestamp.now(),
            });
            break;
        case 'ORDER_EXPIRED':
            paymentUpdate.orderStatus = 'EXPIRED';
            paymentUpdate.paymentStatus = 'CANCELLED';
            // Release listing reservation
            const listingRefExpired = admin_1.admin.firestore().collection('listings').doc(payment.listingId);
            batch.update(listingRefExpired, {
                status: 'active',
                reservedBy: admin_1.admin.firestore.FieldValue.delete(),
                reservedAt: admin_1.admin.firestore.FieldValue.delete(),
                reservationExpiresAt: admin_1.admin.firestore.FieldValue.delete(),
                updatedAt: admin_1.admin.firestore.Timestamp.now(),
            });
            break;
        default:
            v2_1.logger.info(`Unhandled webhook event type: ${event.type}`, {
                orderId,
                eventId,
            });
            return; // Don't update payment for unknown event types
    }
    // Update payment document
    const paymentRef = admin_1.admin.firestore().collection('payments').doc(orderId);
    batch.update(paymentRef, paymentUpdate);
    // Commit all changes atomically
    await batch.commit();
    v2_1.logger.info(`Payment updated successfully: ${orderId}`, {
        eventId,
        orderStatus: paymentUpdate.orderStatus,
        paymentStatus: paymentUpdate.paymentStatus,
        listingId: payment.listingId,
    });
}
/**
 * Sends notification to seller (placeholder implementation)
 */
async function sendSellerNotification(sellerId, notificationData) {
    try {
        // Create notification document
        await admin_1.admin.firestore().collection('notifications').add({
            userId: sellerId,
            type: notificationData.type,
            title: 'Your listing has been sold!',
            message: `Congratulations! Your listing has been sold for ₹${notificationData.amount.toLocaleString('en-IN')}`,
            data: notificationData,
            read: false,
            createdAt: admin_1.admin.firestore.Timestamp.now(),
        });
        v2_1.logger.info(`Seller notification sent: ${sellerId}`, notificationData);
    }
    catch (error) {
        v2_1.logger.error('Failed to send seller notification', {
            sellerId,
            notificationData,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Don't throw - notification failure shouldn't break webhook processing
    }
}
/**
 * Processes boost-specific webhook events.
 * Activates the boost on the listing and generates an invoice on successful payment.
 */
async function processBoostWebhookEvent(event, eventId) {
    const orderId = event.orderId;
    // Find the boost document by orderId
    const boostSnap = await admin_1.admin.firestore()
        .collection('listingBoosts')
        .where('orderId', '==', orderId)
        .limit(1)
        .get();
    if (boostSnap.empty) {
        v2_1.logger.warn(`Boost order not found for webhook: ${orderId}`, { eventId });
        throw new Error(`Boost order not found: ${orderId}`);
    }
    const boostDoc = boostSnap.docs[0];
    const boost = boostDoc.data();
    const boostRef = admin_1.admin.firestore().collection('listingBoosts').doc(boostDoc.id);
    switch (event.type) {
        case 'PAYMENT_SUCCESS':
        case 'ORDER_PAID': {
            // Prevent double-processing
            if (boost.status === 'paid') {
                v2_1.logger.info(`Boost already paid, skipping: ${orderId}`, { eventId });
                return;
            }
            const now = new Date();
            const expiresAt = new Date(now.getTime() + boost.durationDays * 24 * 60 * 60 * 1000);
            const batch = admin_1.admin.firestore().batch();
            // Update boost document
            batch.update(boostRef, {
                status: 'paid',
                paymentId: event.paymentId,
                paymentMethod: 'cashfree',
                boostStartsAt: admin_1.admin.firestore.Timestamp.fromDate(now),
                boostExpiresAt: admin_1.admin.firestore.Timestamp.fromDate(expiresAt),
                updatedAt: admin_1.admin.firestore.Timestamp.now(),
                cashfreeResponse: event,
            });
            // Activate boost on the listing
            const listingRef = admin_1.admin.firestore().collection('listings').doc(boost.listingId);
            batch.update(listingRef, {
                isBoosted: true,
                boostTier: boost.tier,
                boostExpiresAt: admin_1.admin.firestore.Timestamp.fromDate(expiresAt),
                updatedAt: admin_1.admin.firestore.Timestamp.now(),
            });
            await batch.commit();
            // Generate invoice (non-blocking)
            try {
                const invoiceId = await generateBoostInvoiceFromWebhook(boostDoc.id, boost, event);
                if (invoiceId) {
                    await boostRef.update({ invoiceId });
                }
            }
            catch (invoiceErr) {
                v2_1.logger.error('Invoice generation failed in webhook', {
                    boostId: boostDoc.id,
                    error: invoiceErr instanceof Error ? invoiceErr.message : 'Unknown',
                });
            }
            // Send notification to listing owner
            await sendSellerNotification(boost.userId, {
                type: 'boost_activated',
                listingId: boost.listingId,
                orderId,
                tier: boost.tier,
                durationDays: boost.durationDays,
                amount: boost.amount,
            });
            v2_1.logger.info(`Boost activated via webhook: ${orderId}`, {
                boostId: boostDoc.id,
                listingId: boost.listingId,
                tier: boost.tier,
                expiresAt: expiresAt.toISOString(),
            });
            break;
        }
        case 'PAYMENT_FAILED':
        case 'ORDER_FAILED': {
            await boostRef.update({
                status: 'failed',
                failureReason: event.paymentStatus || 'Payment failed at gateway',
                updatedAt: admin_1.admin.firestore.Timestamp.now(),
                cashfreeResponse: event,
            });
            v2_1.logger.info(`Boost payment failed via webhook: ${orderId}`, {
                boostId: boostDoc.id,
                eventType: event.type,
            });
            break;
        }
        case 'PAYMENT_CANCELLED':
        case 'ORDER_CANCELLED':
        case 'ORDER_EXPIRED': {
            await boostRef.update({
                status: 'expired',
                failureReason: `Order ${event.type.toLowerCase().replace('order_', '')}`,
                updatedAt: admin_1.admin.firestore.Timestamp.now(),
                cashfreeResponse: event,
            });
            v2_1.logger.info(`Boost order expired/cancelled via webhook: ${orderId}`, {
                boostId: boostDoc.id,
                eventType: event.type,
            });
            break;
        }
        default:
            v2_1.logger.info(`Unhandled boost webhook event type: ${event.type}`, { orderId, eventId });
    }
}
/**
 * Generates an invoice for a successful boost payment (called from webhook).
 */
async function generateBoostInvoiceFromWebhook(boostId, boost, event) {
    const invoiceId = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const invoiceNumber = `AB-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    // Fetch listing title
    let listingTitle = 'Listing';
    try {
        const listingDoc = await admin_1.admin.firestore().collection('listings').doc(boost.listingId).get();
        if (listingDoc.exists) {
            listingTitle = listingDoc.data().title || 'Listing';
        }
    }
    catch { /* ignore */ }
    // Fetch user profile
    let userName = '';
    let userPhone = '';
    try {
        const userDoc = await admin_1.admin.firestore().collection('users').doc(boost.userId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            userName = userData.name || userData.displayName || '';
            userPhone = userData.phone || '';
        }
    }
    catch { /* ignore */ }
    const expiresAt = new Date(Date.now() + boost.durationDays * 24 * 60 * 60 * 1000);
    const invoiceDoc = {
        invoiceId,
        invoiceNumber,
        type: 'boost',
        boostId,
        orderId: boost.orderId,
        cashfreeOrderId: boost.cashfreeOrderId,
        paymentId: event.paymentId || null,
        // Customer
        userId: boost.userId,
        customerName: userName,
        customerEmail: boost.customerEmail,
        customerPhone: userPhone,
        // Seller (platform)
        sellerName: 'SHAHID MOOSA',
        sellerType: 'Sole Proprietor',
        platform: 'AndamanBazaar',
        // Line items
        items: [
            {
                description: `${boost.tierName} Boost — ${boost.durationDays} days for "${listingTitle}"`,
                quantity: 1,
                unitPrice: boost.amount,
                total: boost.amount,
                tier: boost.tier,
                durationDays: boost.durationDays,
                listingId: boost.listingId,
            },
        ],
        // Totals
        subtotal: boost.amount,
        tax: 0,
        taxRate: 0,
        total: boost.amount,
        currency: 'INR',
        amountPaise: boost.amountPaise,
        // Dates
        invoiceDate: admin_1.admin.firestore.Timestamp.now(),
        dueDate: admin_1.admin.firestore.Timestamp.now(),
        paidAt: admin_1.admin.firestore.Timestamp.now(),
        boostStartsAt: admin_1.admin.firestore.Timestamp.now(),
        boostExpiresAt: admin_1.admin.firestore.Timestamp.fromDate(expiresAt),
        // Status
        status: 'paid',
        paymentMethod: 'Cashfree',
        createdAt: admin_1.admin.firestore.Timestamp.now(),
        updatedAt: admin_1.admin.firestore.Timestamp.now(),
    };
    await admin_1.admin.firestore().collection('invoices').doc(invoiceId).set(invoiceDoc);
    v2_1.logger.info('Invoice generated from webhook', { invoiceId, boostId, orderId: boost.orderId });
    return invoiceId;
}
/**
 * Health check endpoint for webhook handler
 */
exports.webhookHealthCheck = paymentsRuntime.https.onRequest(async (req, res) => {
    try {
        // Check Firestore connectivity
        await admin_1.admin.firestore().collection('health').doc('webhook').set({
            timestamp: admin_1.admin.firestore.Timestamp.now(),
            status: 'healthy',
        });
        // Check Cashfree configuration
        const cashfreeAppId = process.env.CASHFREE_APP_ID;
        const cashfreeSecret = process.env.CASHFREE_SECRET_KEY ? 'SET' : 'NOT_SET';
        const webhookSecret = process.env.CASHFREE_WEBHOOK_SECRET ? 'SET' : 'NOT_SET';
        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            configuration: {
                cashfreeAppId: cashfreeAppId ? 'SET' : 'NOT_SET',
                cashfreeSecret: cashfreeSecret,
                webhookSecret: webhookSecret,
            },
        });
    }
    catch (error) {
        v2_1.logger.error('Webhook health check failed', error);
        res.status(500).json({
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
//# sourceMappingURL=cashfreeWebhook.js.map