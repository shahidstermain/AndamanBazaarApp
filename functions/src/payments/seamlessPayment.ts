import * as functions from 'firebase-functions';
import { logger } from 'firebase-functions/v2';
import { Cashfree } from 'cashfree-pg';
import { admin } from '../utils/admin';
import { CASHFREE_SECRET_BINDINGS, getRequiredEnv, SECRET_NAMES } from '../utils/secrets';

const paymentsRuntime = functions.runWith({ secrets: CASHFREE_SECRET_BINDINGS });

/**
 * Initialize Cashfree SDK with credentials
 */
const initializeCashfree = (): void => {
  Cashfree.XClientId = getRequiredEnv(SECRET_NAMES.CASHFREE_APP_ID);
  Cashfree.XClientSecret = getRequiredEnv(SECRET_NAMES.CASHFREE_SECRET_KEY);
  Cashfree.XEnvironment = process.env.CASHFREE_ENV === 'production'
    ? Cashfree.Environment.PRODUCTION
    : Cashfree.Environment.SANDBOX;
  Cashfree.XApiVersion = '2025-01-01';
};


/**
 * Step 1: Create Order (Seamless Integration)
 * 
 * Creates a payment order with Cashfree and returns payment session ID
 * for seamless checkout integration.
 * 
 * Security:
 * - Server-side only (never expose credentials to client)
 * - Validates user authentication
 * - Validates listing ownership and availability
 * - Creates audit trail in Firestore
 */
export const createSeamlessOrder = paymentsRuntime.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const {
    listingId,
    orderAmount,
    customerEmail,
    customerPhone,
    customerName,
    returnUrl,
    notifyUrl,
  } = data;

  // Validate required fields
  if (!listingId || !orderAmount || !customerEmail) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing required fields: listingId, orderAmount, customerEmail'
    );
  }

  try {
    initializeCashfree();

    // Verify listing exists and is available
    const listingDoc = await admin.firestore().collection('listings').doc(listingId).get();
    
    if (!listingDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Listing not found');
    }

    const listing = listingDoc.data()!;
    
    if (listing.status !== 'active') {
      throw new functions.https.HttpsError('failed-precondition', 'Listing is not available for purchase');
    }

    // Prevent self-purchase (use camelCase userId to match Firestore schema)
    if (listing.userId === context.auth.uid) {
      throw new functions.https.HttpsError('failed-precondition', 'Cannot purchase your own listing');
    }

    // Generate unique order ID
    const orderId = `order_${listingId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create order with Cashfree
    const orderRequest = {
      order_id: orderId,
      order_amount: orderAmount,
      order_currency: 'INR',
      customer_details: {
        customer_id: context.auth.uid,
        customer_email: customerEmail,
        customer_phone: customerPhone || '',
        customer_name: customerName || '',
      },
      order_meta: {
        return_url: returnUrl || `${process.env.FRONTEND_URL || 'https://andamanbazaarfirebase.web.app'}/payment/success?order_id={order_id}`,
        notify_url: notifyUrl || `${process.env.FUNCTIONS_URL || 'https://api.andamanbazaar.in'}/cashfree/webhook`,
      },
      order_note: `Purchase of listing: ${listing.title}`,
    };

    logger.info('Creating Cashfree order', { orderId, listingId, amount: orderAmount });

    const response = await Cashfree.PGCreateOrder('2025-01-01', orderRequest);
    const orderData = response.data;

    logger.info('Cashfree order created successfully', {
      orderId: orderData.order_id,
      cfOrderId: orderData.cf_order_id,
      orderStatus: orderData.order_status,
    });

    // Store payment order in Firestore
    await admin.firestore().collection('payments').doc(orderId).set({
      orderId: orderId,
      cfOrderId: String(orderData.cf_order_id),
      listingId: listingId,
      buyerId: context.auth.uid,
      sellerId: listing.userId,
      orderAmount: orderAmount,
      orderCurrency: 'INR',
      orderStatus: orderData.order_status || 'ACTIVE',
      paymentStatus: 'PENDING',
      paymentSessionId: orderData.payment_session_id,
      customerEmail: customerEmail,
      customerPhone: customerPhone,
      customerName: customerName,
      listingTitle: listing.title,
      listingPrice: listing.price,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      expiresAt: orderData.order_expiry_time 
        ? admin.firestore.Timestamp.fromDate(new Date(orderData.order_expiry_time))
        : admin.firestore.Timestamp.fromDate(new Date(Date.now() + 15 * 60 * 1000)), // 15 min default
    });

    // Reserve the listing temporarily
    await admin.firestore().collection('listings').doc(listingId).update({
      reservedBy: context.auth.uid,
      reservedAt: admin.firestore.Timestamp.now(),
      reservationExpiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 15 * 60 * 1000)),
      updatedAt: admin.firestore.Timestamp.now(),
    });

    logger.info('Payment order stored and listing reserved', { orderId, listingId });

    // Return payment session details for seamless checkout
    return {
      success: true,
      orderId: orderData.order_id,
      cfOrderId: String(orderData.cf_order_id),
      paymentSessionId: orderData.payment_session_id,
      orderStatus: orderData.order_status,
      orderAmount: orderData.order_amount,
      orderCurrency: orderData.order_currency,
      orderExpiryTime: orderData.order_expiry_time,
    };

  } catch (error) {
    logger.error('Failed to create seamless order', {
      error: error instanceof Error ? error.message : 'Unknown error',
      listingId,
      userId: context.auth.uid,
    });

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      `Order creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
});

/**
 * Step 2: Order Pay (Seamless Integration)
 * 
 * Processes payment for a created order using payment session ID.
 * This is typically called from the frontend after collecting payment details.
 * 
 * Note: For PCI-compliant card payments, this requires PCI DSS flag enabled.
 */
export const processSeamlessPayment = paymentsRuntime.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { paymentSessionId, paymentMethod } = data;

  if (!paymentSessionId || !paymentMethod) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing required fields: paymentSessionId, paymentMethod'
    );
  }

  try {
    initializeCashfree();

    // Find the order by payment session ID
    const ordersSnapshot = await admin.firestore()
      .collection('payments')
      .where('paymentSessionId', '==', paymentSessionId)
      .where('buyerId', '==', context.auth.uid)
      .limit(1)
      .get();

    if (ordersSnapshot.empty) {
      throw new functions.https.HttpsError('not-found', 'Order not found');
    }

    const orderDoc = ordersSnapshot.docs[0];
    const order = orderDoc.data();

    logger.info('Processing seamless payment', {
      orderId: order.orderId,
      paymentMethod: paymentMethod.type,
    });

    // Call Cashfree Order Pay API
    const paymentRequest = {
      payment_session_id: paymentSessionId,
      payment_method: paymentMethod,
    };

    const response = await Cashfree.PGPayOrder('2025-01-01', paymentRequest);
    const paymentData = response.data;

    // PayOrderEntity returns: cf_payment_id, payment_amount, payment_method, channel, action
    // payment_status is NOT in this response — it comes asynchronously via webhook
    logger.info('Payment initiated via PGPayOrder', {
      orderId: order.orderId,
      cfPaymentId: paymentData.cf_payment_id,
      action: paymentData.action,
      channel: paymentData.channel,
    });

    // Update payment record with initiated payment ID; status stays PENDING until webhook
    await admin.firestore().collection('payments').doc(order.orderId).update({
      paymentId: paymentData.cf_payment_id != null ? String(paymentData.cf_payment_id) : null,
      paymentMethod: paymentMethod.type,
      paymentAction: paymentData.action,       // e.g. 'link' for UPI intent redirect
      paymentChannel: paymentData.channel,
      updatedAt: admin.firestore.Timestamp.now(),
    });

    return {
      success: true,
      orderId: order.orderId,
      cfPaymentId: paymentData.cf_payment_id != null ? String(paymentData.cf_payment_id) : null,
      // PENDING — final status delivered by webhook (PAYMENT_SUCCESS_WEBHOOK / PAYMENT_FAILED_WEBHOOK)
      paymentStatus: 'PENDING',
      paymentMessage: paymentData.action ?? 'Payment initiated. Waiting for confirmation.',
    };

  } catch (error) {
    logger.error('Failed to process seamless payment', {
      error: error instanceof Error ? error.message : 'Unknown error',
      paymentSessionId,
    });

    throw new functions.https.HttpsError(
      'internal',
      `Payment processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
});

/**
 * Step 3: Get Payments for Order
 * 
 * Retrieves all payment attempts for a given order.
 * Use this to check payment status after redirect from payment gateway.
 */
export const getOrderPayments = paymentsRuntime.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { orderId } = data;

  if (!orderId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required field: orderId');
  }

  try {
    initializeCashfree();

    // Verify user owns this order
    const orderDoc = await admin.firestore().collection('payments').doc(orderId).get();
    
    if (!orderDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Order not found');
    }

    const order = orderDoc.data()!;

    if (order.buyerId !== context.auth.uid) {
      throw new functions.https.HttpsError('permission-denied', 'Access denied');
    }

    logger.info('Fetching payments for order', { orderId });

    // Fetch payments from Cashfree
    const response = await Cashfree.PGOrderFetchPayments('2025-01-01', orderId);
    const payments = response.data || [];

    logger.info('Payments retrieved', { orderId, paymentCount: payments.length });

    // Update local order status based on latest payment
    if (payments.length > 0) {
      const latestPayment = payments[0];
      
      await admin.firestore().collection('payments').doc(orderId).update({
        paymentId: String(latestPayment.cf_payment_id),
        paymentStatus: latestPayment.payment_status,
        paymentAmount: latestPayment.payment_amount,
        paymentTime: latestPayment.payment_time,
        updatedAt: admin.firestore.Timestamp.now(),
      });
    }

    return {
      success: true,
      orderId: orderId,
      payments: payments.map(p => ({
        cfPaymentId: String(p.cf_payment_id),
        paymentStatus: p.payment_status,
        paymentAmount: p.payment_amount,
        paymentCurrency: p.payment_currency,
        paymentTime: p.payment_time,
        paymentCompletionTime: p.payment_completion_time,
        paymentGroup: p.payment_group,
        paymentMessage: p.payment_message,
      })),
    };

  } catch (error) {
    logger.error('Failed to get order payments', {
      error: error instanceof Error ? error.message : 'Unknown error',
      orderId,
    });

    throw new functions.https.HttpsError(
      'internal',
      `Failed to retrieve payments: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
});

/**
 * Verify Order Status
 * 
 * Checks the current status of an order with Cashfree.
 * Use this after payment completion to verify final status.
 */
export const verifyOrderStatus = paymentsRuntime.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { orderId } = data;

  if (!orderId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required field: orderId');
  }

  try {
    initializeCashfree();

    // Verify user owns this order
    const orderDoc = await admin.firestore().collection('payments').doc(orderId).get();
    
    if (!orderDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Order not found');
    }

    const order = orderDoc.data()!;

    if (order.buyerId !== context.auth.uid) {
      throw new functions.https.HttpsError('permission-denied', 'Access denied');
    }

    logger.info('Verifying order status', { orderId });

    // Fetch order details from Cashfree
    const response = await Cashfree.PGFetchOrder('2025-01-01', orderId);
    const orderData = response.data;

    logger.info('Order status retrieved', {
      orderId,
      orderStatus: orderData.order_status,
    });

    // Update local order record
    await admin.firestore().collection('payments').doc(orderId).update({
      orderStatus: orderData.order_status,
      orderAmount: orderData.order_amount,
      updatedAt: admin.firestore.Timestamp.now(),
    });

    return {
      success: true,
      orderId: orderData.order_id,
      cfOrderId: String(orderData.cf_order_id),
      orderStatus: orderData.order_status,
      orderAmount: orderData.order_amount,
      orderCurrency: orderData.order_currency,
      orderExpiryTime: orderData.order_expiry_time,
    };

  } catch (error) {
    logger.error('Failed to verify order status', {
      error: error instanceof Error ? error.message : 'Unknown error',
      orderId,
    });

    throw new functions.https.HttpsError(
      'internal',
      `Order verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
});
