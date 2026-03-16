import * as functions from 'firebase-functions';
import { logger } from 'firebase-functions/v2';
import { getCashfreeOrderStatus, CreateOrderResponse } from '../utils/cashfreeClient';
import { admin } from '../utils/admin';
import { CASHFREE_SECRET_BINDINGS } from '../utils/secrets';

const paymentsRuntime = functions.runWith({ secrets: CASHFREE_SECRET_BINDINGS });

// Request data interface
interface CheckPaymentStatusRequest {
  orderId: string;
}

// Response interface
interface CheckPaymentStatusResponse {
  success: boolean;
  orderId: string;
  orderStatus: string;
  paymentStatus: string;
  orderAmount: number;
  orderCurrency: string;
  paymentId?: string;
  paymentAmount?: number;
  paymentTime?: string;
  listingId?: string;
  listingTitle?: string;
  createdAt: string;
  updatedAt: string;
  error?: string;
}

/**
 * Checks payment status from Cashfree and syncs with Firestore
 * 
 * Security considerations:
 * - Validates Firebase Auth token
 * - Only allows buyer to check their own payment status
 * - Syncs Firestore with latest Cashfree status
 * - Prevents status tampering by validating with source of truth
 */
export const checkPaymentStatus = paymentsRuntime.https.onCall(async (data: CheckPaymentStatusRequest, context) => {
  // Validate authentication
  if (!context.auth) {
    logger.warn('Unauthorized attempt to check payment status');
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  const userId = context.auth.uid;

  try {
    // Validate input data
    const { orderId } = data;

    if (!orderId) {
      throw new functions.https.HttpsError('invalid-argument', 'orderId is required');
    }

    // Get payment order from Firestore
    const paymentDoc = await admin.firestore().collection('payments').doc(orderId).get();
    
    if (!paymentDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Payment order not found');
    }

    const payment = paymentDoc.data()!;

    // Validate user authorization (only buyer can check their own payment status)
    if (payment.buyerId !== userId) {
      logger.warn('Unauthorized payment status check attempt', {
        userId,
        orderId,
        paymentBuyerId: payment.buyerId,
      });
      throw new functions.https.HttpsError('permission-denied', 'Access denied');
    }

    // Get latest status from Cashfree
    const cashfreeStatus = await getCashfreeOrderStatus(orderId);

    // Check if status needs to be updated in Firestore
    const needsUpdate = 
      cashfreeStatus.orderStatus !== payment.orderStatus ||
      (cashfreeStatus.payments?.[0]?.payment_status !== payment.paymentStatus);

    if (needsUpdate) {
      logger.info(`Payment status update needed: ${orderId}`, {
        currentOrderStatus: payment.orderStatus,
        currentPaymentStatus: payment.paymentStatus,
        newOrderStatus: cashfreeStatus.orderStatus,
        newPaymentStatus: cashfreeStatus.payments?.[0]?.payment_status,
      });

      // Update Firestore with latest status
      const updateData: any = {
        orderStatus: cashfreeStatus.orderStatus,
        updatedAt: admin.firestore.Timestamp.now(),
        lastSyncedAt: admin.firestore.Timestamp.now(),
        cashfreeResponse: cashfreeStatus,
      };

      // Update payment status if available
      if (cashfreeStatus.payments && cashfreeStatus.payments.length > 0) {
        const paymentInfo = cashfreeStatus.payments[0];
        updateData.paymentStatus = paymentInfo.payment_status;
        updateData.paymentId = paymentInfo.cf_payment_id;
        updateData.paymentAmount = paymentInfo.payment_amount;
        updateData.paymentTime = paymentInfo.payment_time;
        updateData.paymentCompletionTime = paymentInfo.payment_completion_time;
      }

      await admin.firestore().collection('payments').doc(orderId).update(updateData);

      // Handle status change side effects
      await handleStatusChange(payment, cashfreeStatus);

      logger.info(`Payment status updated in Firestore: ${orderId}`, updateData);
    }

    // Get the updated payment document
    const updatedPaymentDoc = await admin.firestore().collection('payments').doc(orderId).get();
    const updatedPayment = updatedPaymentDoc.data()!;

    // Prepare response
    const response: CheckPaymentStatusResponse = {
      success: true,
      orderId: updatedPayment.orderId,
      orderStatus: updatedPayment.orderStatus,
      paymentStatus: updatedPayment.paymentStatus,
      orderAmount: updatedPayment.orderAmount,
      orderCurrency: updatedPayment.orderCurrency,
      paymentId: updatedPayment.paymentId,
      paymentAmount: updatedPayment.paymentAmount,
      paymentTime: updatedPayment.paymentTime,
      listingId: updatedPayment.listingId,
      listingTitle: updatedPayment.listingTitle,
      createdAt: updatedPayment.createdAt.toDate().toISOString(),
      updatedAt: updatedPayment.updatedAt.toDate().toISOString(),
    };

    logger.info(`Payment status checked successfully: ${orderId}`, {
      orderStatus: response.orderStatus,
      paymentStatus: response.paymentStatus,
    });

    return response;

  } catch (error) {
    logger.error('Failed to check payment status', {
      userId,
      orderId: data.orderId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      `Failed to check payment status: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
});

/**
 * Handles side effects of payment status changes
 */
async function handleStatusChange(currentPayment: any, newStatus: CreateOrderResponse): Promise<void> {
  const orderId = currentPayment.orderId;
  const oldStatus = currentPayment.orderStatus;
  const newOrderStatus = newStatus.orderStatus;
  const newPaymentStatus = newStatus.payments?.[0]?.payment_status;

  // Handle payment success
  if (newPaymentStatus === 'SUCCESS' && currentPayment.paymentStatus !== 'SUCCESS') {
    logger.info(`Payment success detected: ${orderId}`, {
      oldStatus,
      newOrderStatus,
      newPaymentStatus,
    });

    // Update listing as sold (if not already done)
    try {
      const listingRef = admin.firestore().collection('listings').doc(currentPayment.listingId);
      const listingDoc = await listingRef.get();

      if (listingDoc.exists && listingDoc.data()!.status !== 'sold') {
        await listingRef.update({
          status: 'sold',
          soldTo: currentPayment.buyerId,
          soldAt: admin.firestore.Timestamp.now(),
          soldPrice: currentPayment.orderAmount,
          soldVia: 'cashfree',
          updatedAt: admin.firestore.Timestamp.now(),
        });

        logger.info(`Listing marked as sold via status check: ${currentPayment.listingId}`);
      }
    } catch (listingError) {
      logger.error('Failed to update listing status', {
        listingId: currentPayment.listingId,
        orderId,
        error: listingError instanceof Error ? listingError.message : 'Unknown error',
      });
    }
  }

  // Handle payment failure/cancellation
  if ((newPaymentStatus === 'FAILED' || newPaymentStatus === 'CANCELLED') && 
      currentPayment.paymentStatus === 'PENDING') {
    logger.info(`Payment failure/cancellation detected: ${orderId}`, {
      oldStatus,
      newOrderStatus,
      newPaymentStatus,
    });

    // Release listing reservation
    try {
      const listingRef = admin.firestore().collection('listings').doc(currentPayment.listingId);
      await listingRef.update({
        status: 'active',
        reservedBy: admin.firestore.FieldValue.delete(),
        reservedAt: admin.firestore.FieldValue.delete(),
        reservationExpiresAt: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.Timestamp.now(),
      });

      logger.info(`Listing reservation released: ${currentPayment.listingId}`);
    } catch (listingError) {
      logger.error('Failed to release listing reservation', {
        listingId: currentPayment.listingId,
        orderId,
        error: listingError instanceof Error ? listingError.message : 'Unknown error',
      });
    }
  }

  // Log status change for audit
  await admin.firestore().collection('paymentEvents').add({
    type: 'STATUS_CHECK_UPDATE',
    orderId,
    cfOrderId: newStatus.cfOrderId,
    listingId: currentPayment.listingId,
    buyerId: currentPayment.buyerId,
    oldOrderStatus: oldStatus,
    newOrderStatus: newOrderStatus,
    oldPaymentStatus: currentPayment.paymentStatus,
    newPaymentStatus: newPaymentStatus,
    timestamp: new Date().toISOString(),
    source: 'status_check',
    processedAt: admin.firestore.Timestamp.now(),
  });
}

/**
 * Get payment history for a user
 */
export const getPaymentHistory = paymentsRuntime.https.onCall(async (data: { limit?: number; startAfter?: string }, context) => {
  // Validate authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  const userId = context.auth.uid;
  const { limit = 20, startAfter } = data;

  try {
    let query = admin.firestore()
      .collection('payments')
      .where('buyerId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit);

    if (startAfter) {
      query = query.startAfter(startAfter);
    }

    const snapshot = await query.get();
    const payments = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        orderId: data.orderId,
        cfOrderId: data.cfOrderId,
        listingId: data.listingId,
        listingTitle: data.listingTitle,
        orderAmount: data.orderAmount,
        orderCurrency: data.orderCurrency,
        orderStatus: data.orderStatus,
        paymentStatus: data.paymentStatus,
        createdAt: data.createdAt.toDate().toISOString(),
        updatedAt: data.updatedAt.toDate().toISOString(),
        paymentId: data.paymentId,
        paymentAmount: data.paymentAmount,
      };
    });

    return {
      success: true,
      payments,
      hasMore: payments.length === limit,
      lastDoc: snapshot.docs[snapshot.docs.length - 1]?.id,
    };
  } catch (error) {
    logger.error('Failed to get payment history', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw new functions.https.HttpsError(
      'internal',
      `Failed to get payment history: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
});

/**
 * Get payment details for a specific order
 */
export const getPaymentDetails = paymentsRuntime.https.onCall(async (data: { orderId: string }, context) => {
  // Validate authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  const userId = context.auth.uid;
  const { orderId } = data;

  try {
    if (!orderId) {
      throw new functions.https.HttpsError('invalid-argument', 'orderId is required');
    }

    const paymentDoc = await admin.firestore().collection('payments').doc(orderId).get();
    
    if (!paymentDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Payment not found');
    }

    const payment = paymentDoc.data()!;

    // Validate user authorization (buyer or seller can view)
    if (payment.buyerId !== userId && payment.sellerId !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Access denied');
    }

    // Get listing details
    const listingDoc = await admin.firestore().collection('listings').doc(payment.listingId).get();
    const listing = listingDoc.exists ? listingDoc.data() : null;

    return {
      success: true,
      payment: {
        orderId: payment.orderId,
        cfOrderId: payment.cfOrderId,
        listingId: payment.listingId,
        buyerId: payment.buyerId,
        sellerId: payment.sellerId,
        orderAmount: payment.orderAmount,
        orderCurrency: payment.orderCurrency,
        orderStatus: payment.orderStatus,
        paymentStatus: payment.paymentStatus,
        customerEmail: payment.customerEmail,
        createdAt: payment.createdAt.toDate().toISOString(),
        updatedAt: payment.updatedAt.toDate().toISOString(),
        paymentId: payment.paymentId,
        paymentAmount: payment.paymentAmount,
        paymentTime: payment.paymentTime,
        listingTitle: payment.listingTitle,
        listingPrice: payment.listingPrice,
      },
      listing: listing ? {
        title: listing.title,
        price: listing.price,
        category: listing.category,
        city: listing.city,
        images: listing.images || [],
        description: listing.description,
      } : null,
    };
  } catch (error) {
    logger.error('Failed to get payment details', {
      userId,
      orderId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      `Failed to get payment details: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
});
