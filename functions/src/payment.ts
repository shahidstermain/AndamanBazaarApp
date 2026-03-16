import * as functions from 'firebase-functions';
import { Cashfree } from 'cashfree-pg';
import { admin } from './utils/admin';
import { CASHFREE_SECRET_BINDINGS, getRequiredEnv, SECRET_NAMES } from './utils/secrets';

const paymentRuntime = functions.runWith({ secrets: CASHFREE_SECRET_BINDINGS });

const getCashfreeClient = (): Cashfree => new Cashfree({
  environment: process.env.CASHFREE_ENV === 'production' ? 'production' : 'sandbox',
  appId: getRequiredEnv(SECRET_NAMES.CASHFREE_APP_ID),
  secretKey: getRequiredEnv(SECRET_NAMES.CASHFREE_SECRET_KEY),
});

// Create Payment Intent
export const createPayment = paymentRuntime.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { orderId, amount, currency, customerEmail, customerPhone, listingId, paymentMethod } = data;
  const cashfree = getCashfreeClient();

  try {
    // Validate input
    if (!orderId || !amount || !customerEmail || !listingId) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }

    // Create payment order with Cashfree
    const orderRequest = {
      order_id: orderId,
      order_amount: amount,
      order_currency: currency || 'INR',
      customer_details: {
        customer_id: context.auth.uid,
        customer_email: customerEmail,
        customer_phone: customerPhone,
      },
      order_meta: {
        return_url: `${process.env.FRONTEND_URL}/payment/success`,
        notify_url: `${process.env.FUNCTIONS_URL}/webhook/cashfree`,
      },
      payment_methods: paymentMethod ? paymentMethod.split(',') : undefined,
    };

    const response = await cashfree.createOrder(orderRequest);

    // Store payment order in Firestore
    await admin.firestore().collection('payment_orders').doc(orderId).set({
      userId: context.auth.uid,
      listingId,
      amount,
      currency: currency || 'INR',
      customerEmail,
      customerPhone,
      paymentMethod,
      status: 'created',
      cashfreeOrderId: response.order_id,
      paymentSessionId: response.payment_session_id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      paymentId: response.order_id,
      paymentUrl: response.payment_session_id,
      requiresAction: true,
      actionData: {
        paymentSessionId: response.payment_session_id,
        orderId: response.order_id,
      },
    };
  } catch (error) {
    console.error('Error creating payment:', error);
    throw new functions.https.HttpsError('internal', 'Payment creation failed');
  }
});

// Verify Payment
export const verifyPayment = paymentRuntime.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { paymentId } = data;
  const cashfree = getCashfreeClient();

  try {
    // Get payment order from Firestore
    const orderDoc = await admin.firestore().collection('payment_orders').doc(paymentId).get();
    
    if (!orderDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Payment order not found');
    }

    const orderData = orderDoc.data()!;

    // Check payment status with Cashfree
    const response = await cashfree.getOrderStatus(paymentId);

    // Update payment order status
    await admin.firestore().collection('payment_orders').doc(paymentId).update({
      status: response.order_status,
      cashfreeStatus: response.order_status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // If payment is successful, create/update listing purchase record
    if (response.order_status === 'PAID') {
      await admin.firestore().collection('purchases').add({
        userId: context.auth.uid,
        listingId: orderData.listingId,
        paymentId,
        amount: orderData.amount,
        status: 'completed',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update listing status
      await admin.firestore().collection('listings').doc(orderData.listingId).update({
        status: 'sold',
        soldTo: context.auth.uid,
        soldAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return {
      success: response.order_status === 'PAID',
      paymentId,
      status: response.order_status,
    };
  } catch (error) {
    console.error('Error verifying payment:', error);
    throw new functions.https.HttpsError('internal', 'Payment verification failed');
  }
});

// Cashfree Webhook Handler
export const cashfreeWebhook = paymentRuntime.https.onRequest(async (req, res) => {
  const signature = req.headers['x-cashfree-signature'];
  const payload = JSON.stringify(req.body);

  // Verify webhook signature
  const isValidSignature = await verifyWebhookSignature(payload, signature as string);
  
  if (!isValidSignature) {
    console.error('Invalid webhook signature');
    return res.status(401).send('Unauthorized');
  }

  const { order_id, order_status, transaction_id } = req.body;

  try {
    // Get payment order
    const orderDoc = await admin.firestore().collection('payment_orders').doc(order_id).get();
    
    if (!orderDoc.exists) {
      console.error('Order not found:', order_id);
      return res.status(404).send('Order not found');
    }

    const orderData = orderDoc.data()!;

    // Update payment status
    await admin.firestore().collection('payment_orders').doc(order_id).update({
      status: order_status,
      transactionId: transaction_id,
      cashfreeStatus: order_status,
      webhookProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // If payment is successful, process the purchase
    if (order_status === 'PAID') {
      await admin.firestore().collection('purchases').add({
        userId: orderData.userId,
        listingId: orderData.listingId,
        paymentId: order_id,
        amount: orderData.amount,
        status: 'completed',
        transactionId: transaction_id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update listing status
      await admin.firestore().collection('listings').doc(orderData.listingId).update({
        status: 'sold',
        soldTo: orderData.userId,
        soldAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Send notification to seller
      // TODO: Implement notification system
    }

    res.status(200).send('Webhook processed successfully');
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Webhook processing failed');
  }
});

// Helper function to verify webhook signature
async function verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
  const crypto = require('crypto');
  const secretKey = getRequiredEnv(SECRET_NAMES.CASHFREE_WEBHOOK_SECRET);
  
  const expectedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(payload)
    .digest('base64');

  return signature === expectedSignature;
}

// Refund Payment
export const refundPayment = paymentRuntime.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { paymentId, reason } = data;
  const cashfree = getCashfreeClient();

  try {
    // Check if user owns this payment
    const orderDoc = await admin.firestore().collection('payment_orders').doc(paymentId).get();
    
    if (!orderDoc.exists || orderDoc.data()!.userId !== context.auth.uid) {
      throw new functions.https.HttpsError('permission-denied', 'Access denied');
    }

    // Process refund with Cashfree
    const response = await cashfree.refundOrder({
      order_id: paymentId,
      refund_amount: orderDoc.data()!.amount,
      refund_reason: reason || 'Customer requested refund',
    });

    // Update payment order
    await admin.firestore().collection('payment_orders').doc(paymentId).update({
      refundId: response.refund_id,
      refundStatus: response.refund_status,
      refundReason: reason,
      refundedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      refundId: response.refund_id,
      refundStatus: response.refund_status,
    };
  } catch (error) {
    console.error('Error processing refund:', error);
    throw new functions.https.HttpsError('internal', 'Refund processing failed');
  }
});

// Get Payment History
export const getPaymentHistory = paymentRuntime.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { limit = 10, startAfter } = data;

  try {
    let query = admin.firestore()
      .collection('payment_orders')
      .where('userId', '==', context.auth.uid)
      .orderBy('createdAt', 'desc')
      .limit(limit);

    if (startAfter) {
      query = query.startAfter(startAfter);
    }

    const snapshot = await query.get();
    const payments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      success: true,
      payments,
      hasMore: payments.length === limit,
      lastDoc: snapshot.docs[snapshot.docs.length - 1],
    };
  } catch (error) {
    console.error('Error getting payment history:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get payment history');
  }
});
