import * as functions from 'firebase-functions';
import { logger } from 'firebase-functions/v2';
import { verifyWebhookSignature, parseWebhookEvent, CashfreeWebhookEvent } from '../utils/cashfreeClient';
import { admin } from '../utils/admin';
import { CASHFREE_SECRET_BINDINGS } from '../utils/secrets';

const paymentsRuntime = functions.runWith({ secrets: CASHFREE_SECRET_BINDINGS });

// Webhook event logging interface
interface WebhookEventLog {
  eventId: string;
  type: string;
  timestamp: string;
  orderId: string;
  cfOrderId?: string;
  orderStatus: string;
  paymentStatus?: string;
  paymentId?: string;
  paymentAmount?: number;
  orderAmount?: number;
  signature: string;
  payload: any;
  processedAt: admin.firestore.Timestamp;
  processingStatus: 'SUCCESS' | 'FAILED' | 'DUPLICATE';
  errorMessage?: string;
  ip?: string;
  userAgent?: string;
}

// Payment update interface
interface PaymentUpdate {
  orderStatus: 'ACTIVE' | 'PAID' | 'EXPIRED' | 'CANCELLED';
  paymentStatus: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  paymentId?: string;
  paymentAmount?: number;
  paymentTime?: string;
  paymentCompletionTime?: string;
  updatedAt: admin.firestore.Timestamp;
  cashfreeResponse?: any;
}

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
export const cashfreeWebhook = paymentsRuntime.https.onRequest(async (req, res) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    logger.warn('Webhook received non-POST request', { method: req.method });
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const signature = req.headers['x-cashfree-signature'] as string;
  const payload = JSON.stringify(req.body);

  // Validate signature
  if (!signature) {
    logger.error('Webhook missing signature');
    return res.status(401).json({ error: 'Missing signature' });
  }

  const isValidSignature = verifyWebhookSignature(payload, signature);
  
  if (!isValidSignature) {
    logger.error('Webhook signature verification failed', {
      signature: signature.substring(0, 20) + '...',
      payloadLength: payload.length,
    });
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Generate unique event ID for idempotency
  const eventId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Parse webhook event
    const event = parseWebhookEvent(payload);

    // Log the webhook event immediately for audit
    const webhookLog: WebhookEventLog = {
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
      processedAt: admin.firestore.Timestamp.now(),
      processingStatus: 'SUCCESS',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };

    // Check for duplicate processing
    const existingEventQuery = await admin.firestore()
      .collection('paymentEvents')
      .where('orderId', '==', event.orderId)
      .where('type', '==', event.type)
      .where('timestamp', '==', event.timestamp)
      .limit(1)
      .get();

    if (!existingEventQuery.empty) {
      logger.info(`Duplicate webhook event detected: ${eventId}`, {
        existingEventId: existingEventQuery.docs[0].id,
        orderId: event.orderId,
        type: event.type,
      });

      // Update log as duplicate
      webhookLog.processingStatus = 'DUPLICATE';
      await admin.firestore().collection('paymentEvents').doc(eventId).set(webhookLog);

      return res.status(200).json({ 
        success: true, 
        message: 'Duplicate event ignored',
        eventId,
      });
    }

    // Process the webhook event
    await processWebhookEvent(event, eventId);

    // Save the webhook event log
    await admin.firestore().collection('paymentEvents').doc(eventId).set(webhookLog);

    logger.info(`Webhook event processed successfully: ${eventId}`, {
      orderId: event.orderId,
      type: event.type,
      orderStatus: event.orderStatus,
      paymentStatus: event.paymentStatus,
    });

    return res.status(200).json({ 
      success: true, 
      eventId,
    });

  } catch (error) {
    logger.error(`Webhook processing failed: ${eventId}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      signature: signature.substring(0, 20) + '...',
    });

    // Log the failed event
    try {
      const failedWebhookLog: WebhookEventLog = {
        eventId,
        type: 'WEBHOOK_ERROR',
        timestamp: new Date().toISOString(),
        orderId: 'unknown',
        orderStatus: 'ERROR',
        signature,
        payload: req.body,
        processedAt: admin.firestore.Timestamp.now(),
        processingStatus: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      };

      await admin.firestore().collection('paymentEvents').doc(eventId).set(failedWebhookLog);
    } catch (logError) {
      logger.error('Failed to log webhook error', logError);
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
async function processWebhookEvent(event: CashfreeWebhookEvent, eventId: string): Promise<void> {
  const orderId = event.orderId;

  // Get the payment order from Firestore
  const paymentDoc = await admin.firestore().collection('payments').doc(orderId).get();
  
  if (!paymentDoc.exists) {
    logger.warn(`Payment order not found for webhook: ${orderId}`, {
      eventId,
      orderStatus: event.orderStatus,
    });
    throw new Error(`Payment order not found: ${orderId}`);
  }

  const payment = paymentDoc.data()!;
  const batch = admin.firestore.batch();

  // Prepare payment update based on event type
  let paymentUpdate: PaymentUpdate = {
    orderStatus: event.orderStatus as 'ACTIVE' | 'PAID' | 'EXPIRED' | 'CANCELLED',
    paymentStatus: 'PENDING',
    updatedAt: admin.firestore.Timestamp.now(),
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
      const listingRef = admin.firestore().collection('listings').doc(payment.listingId);
      batch.update(listingRef, {
        status: 'sold',
        soldTo: payment.buyerId,
        soldAt: admin.firestore.Timestamp.now(),
        soldPrice: payment.orderAmount,
        soldVia: 'cashfree',
        updatedAt: admin.firestore.Timestamp.now(),
      });

      // Create purchase record
      const purchaseRef = admin.firestore().collection('purchases').doc();
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
        purchaseAt: admin.firestore.Timestamp.now(),
        createdAt: admin.firestore.Timestamp.now(),
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
      const listingRefFailed = admin.firestore().collection('listings').doc(payment.listingId);
      batch.update(listingRefFailed, {
        status: 'active',
        reservedBy: admin.firestore.FieldValue.delete(),
        reservedAt: admin.firestore.FieldValue.delete(),
        reservationExpiresAt: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.Timestamp.now(),
      });

      break;

    case 'PAYMENT_CANCELLED':
    case 'ORDER_CANCELLED':
      paymentUpdate.paymentStatus = 'CANCELLED';

      // Release listing reservation
      const listingRefCancelled = admin.firestore().collection('listings').doc(payment.listingId);
      batch.update(listingRefCancelled, {
        status: 'active',
        reservedBy: admin.firestore.FieldValue.delete(),
        reservedAt: admin.firestore.FieldValue.delete(),
        reservationExpiresAt: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.Timestamp.now(),
      });

      break;

    case 'ORDER_EXPIRED':
      paymentUpdate.orderStatus = 'EXPIRED';
      paymentUpdate.paymentStatus = 'CANCELLED';

      // Release listing reservation
      const listingRefExpired = admin.firestore().collection('listings').doc(payment.listingId);
      batch.update(listingRefExpired, {
        status: 'active',
        reservedBy: admin.firestore.FieldValue.delete(),
        reservedAt: admin.firestore.FieldValue.delete(),
        reservationExpiresAt: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.Timestamp.now(),
      });

      break;

    default:
      logger.info(`Unhandled webhook event type: ${event.type}`, {
        orderId,
        eventId,
      });
      return; // Don't update payment for unknown event types
  }

  // Update payment document
  const paymentRef = admin.firestore().collection('payments').doc(orderId);
  batch.update(paymentRef, paymentUpdate);

  // Commit all changes atomically
  await batch.commit();

  logger.info(`Payment updated successfully: ${orderId}`, {
    eventId,
    orderStatus: paymentUpdate.orderStatus,
    paymentStatus: paymentUpdate.paymentStatus,
    listingId: payment.listingId,
  });
}

/**
 * Sends notification to seller (placeholder implementation)
 */
async function sendSellerNotification(sellerId: string, notificationData: any): Promise<void> {
  try {
    // Create notification document
    await admin.firestore().collection('notifications').add({
      userId: sellerId,
      type: notificationData.type,
      title: 'Your listing has been sold!',
      message: `Congratulations! Your listing has been sold for ₹${notificationData.amount.toLocaleString('en-IN')}`,
      data: notificationData,
      read: false,
      createdAt: admin.firestore.Timestamp.now(),
    });

    logger.info(`Seller notification sent: ${sellerId}`, notificationData);
  } catch (error) {
    logger.error('Failed to send seller notification', {
      sellerId,
      notificationData,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    // Don't throw - notification failure shouldn't break webhook processing
  }
}

/**
 * Health check endpoint for webhook handler
 */
export const webhookHealthCheck = paymentsRuntime.https.onRequest(async (req, res) => {
  try {
    // Check Firestore connectivity
    await admin.firestore().collection('health').doc('webhook').set({
      timestamp: admin.firestore.Timestamp.now(),
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
  } catch (error) {
    logger.error('Webhook health check failed', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
