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
exports.getPaymentDetails = exports.getPaymentHistory = exports.checkPaymentStatus = void 0;
const functions = __importStar(require("firebase-functions"));
const v2_1 = require("firebase-functions/v2");
const cashfreeClient_1 = require("../utils/cashfreeClient");
const admin_1 = require("../utils/admin");
const secrets_1 = require("../utils/secrets");
const paymentsRuntime = functions.runWith({ secrets: secrets_1.CASHFREE_SECRET_BINDINGS });
/**
 * Checks payment status from Cashfree and syncs with Firestore
 *
 * Security considerations:
 * - Validates Firebase Auth token
 * - Only allows buyer to check their own payment status
 * - Syncs Firestore with latest Cashfree status
 * - Prevents status tampering by validating with source of truth
 */
exports.checkPaymentStatus = paymentsRuntime.https.onCall(async (data, context) => {
    // Validate authentication
    if (!context.auth) {
        v2_1.logger.warn('Unauthorized attempt to check payment status');
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
        const paymentDoc = await admin_1.admin.firestore().collection('payments').doc(orderId).get();
        if (!paymentDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Payment order not found');
        }
        const payment = paymentDoc.data();
        // Validate user authorization (only buyer can check their own payment status)
        if (payment.buyerId !== userId) {
            v2_1.logger.warn('Unauthorized payment status check attempt', {
                userId,
                orderId,
                paymentBuyerId: payment.buyerId,
            });
            throw new functions.https.HttpsError('permission-denied', 'Access denied');
        }
        // Get latest status from Cashfree
        const cashfreeStatus = await (0, cashfreeClient_1.getCashfreeOrderStatus)(orderId);
        // Check if status needs to be updated in Firestore
        const needsUpdate = cashfreeStatus.orderStatus !== payment.orderStatus ||
            (cashfreeStatus.payments?.[0]?.payment_status !== payment.paymentStatus);
        if (needsUpdate) {
            v2_1.logger.info(`Payment status update needed: ${orderId}`, {
                currentOrderStatus: payment.orderStatus,
                currentPaymentStatus: payment.paymentStatus,
                newOrderStatus: cashfreeStatus.orderStatus,
                newPaymentStatus: cashfreeStatus.payments?.[0]?.payment_status,
            });
            // Update Firestore with latest status
            const updateData = {
                orderStatus: cashfreeStatus.orderStatus,
                updatedAt: admin_1.admin.firestore.Timestamp.now(),
                lastSyncedAt: admin_1.admin.firestore.Timestamp.now(),
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
            await admin_1.admin.firestore().collection('payments').doc(orderId).update(updateData);
            // Handle status change side effects
            await handleStatusChange(payment, cashfreeStatus);
            v2_1.logger.info(`Payment status updated in Firestore: ${orderId}`, updateData);
        }
        // Get the updated payment document
        const updatedPaymentDoc = await admin_1.admin.firestore().collection('payments').doc(orderId).get();
        const updatedPayment = updatedPaymentDoc.data();
        // Prepare response
        const response = {
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
        v2_1.logger.info(`Payment status checked successfully: ${orderId}`, {
            orderStatus: response.orderStatus,
            paymentStatus: response.paymentStatus,
        });
        return response;
    }
    catch (error) {
        v2_1.logger.error('Failed to check payment status', {
            userId,
            orderId: data.orderId,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
        });
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', `Failed to check payment status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});
/**
 * Handles side effects of payment status changes
 */
async function handleStatusChange(currentPayment, newStatus) {
    const orderId = currentPayment.orderId;
    const oldStatus = currentPayment.orderStatus;
    const newOrderStatus = newStatus.orderStatus;
    const newPaymentStatus = newStatus.payments?.[0]?.payment_status;
    // Handle payment success
    if (newPaymentStatus === 'SUCCESS' && currentPayment.paymentStatus !== 'SUCCESS') {
        v2_1.logger.info(`Payment success detected: ${orderId}`, {
            oldStatus,
            newOrderStatus,
            newPaymentStatus,
        });
        // Update listing as sold (if not already done)
        try {
            const listingRef = admin_1.admin.firestore().collection('listings').doc(currentPayment.listingId);
            const listingDoc = await listingRef.get();
            if (listingDoc.exists && listingDoc.data().status !== 'sold') {
                await listingRef.update({
                    status: 'sold',
                    soldTo: currentPayment.buyerId,
                    soldAt: admin_1.admin.firestore.Timestamp.now(),
                    soldPrice: currentPayment.orderAmount,
                    soldVia: 'cashfree',
                    updatedAt: admin_1.admin.firestore.Timestamp.now(),
                });
                v2_1.logger.info(`Listing marked as sold via status check: ${currentPayment.listingId}`);
            }
        }
        catch (listingError) {
            v2_1.logger.error('Failed to update listing status', {
                listingId: currentPayment.listingId,
                orderId,
                error: listingError instanceof Error ? listingError.message : 'Unknown error',
            });
        }
    }
    // Handle payment failure/cancellation
    if ((newPaymentStatus === 'FAILED' || newPaymentStatus === 'CANCELLED') &&
        currentPayment.paymentStatus === 'PENDING') {
        v2_1.logger.info(`Payment failure/cancellation detected: ${orderId}`, {
            oldStatus,
            newOrderStatus,
            newPaymentStatus,
        });
        // Release listing reservation
        try {
            const listingRef = admin_1.admin.firestore().collection('listings').doc(currentPayment.listingId);
            await listingRef.update({
                status: 'active',
                reservedBy: admin_1.admin.firestore.FieldValue.delete(),
                reservedAt: admin_1.admin.firestore.FieldValue.delete(),
                reservationExpiresAt: admin_1.admin.firestore.FieldValue.delete(),
                updatedAt: admin_1.admin.firestore.Timestamp.now(),
            });
            v2_1.logger.info(`Listing reservation released: ${currentPayment.listingId}`);
        }
        catch (listingError) {
            v2_1.logger.error('Failed to release listing reservation', {
                listingId: currentPayment.listingId,
                orderId,
                error: listingError instanceof Error ? listingError.message : 'Unknown error',
            });
        }
    }
    // Log status change for audit
    await admin_1.admin.firestore().collection('paymentEvents').add({
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
        processedAt: admin_1.admin.firestore.Timestamp.now(),
    });
}
/**
 * Get payment history for a user
 */
exports.getPaymentHistory = paymentsRuntime.https.onCall(async (data, context) => {
    // Validate authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
    const userId = context.auth.uid;
    const { limit = 20, startAfter } = data;
    try {
        let query = admin_1.admin.firestore()
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
    }
    catch (error) {
        v2_1.logger.error('Failed to get payment history', {
            userId,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw new functions.https.HttpsError('internal', `Failed to get payment history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});
/**
 * Get payment details for a specific order
 */
exports.getPaymentDetails = paymentsRuntime.https.onCall(async (data, context) => {
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
        const paymentDoc = await admin_1.admin.firestore().collection('payments').doc(orderId).get();
        if (!paymentDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Payment not found');
        }
        const payment = paymentDoc.data();
        // Validate user authorization (buyer or seller can view)
        if (payment.buyerId !== userId && payment.sellerId !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'Access denied');
        }
        // Get listing details
        const listingDoc = await admin_1.admin.firestore().collection('listings').doc(payment.listingId).get();
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
    }
    catch (error) {
        v2_1.logger.error('Failed to get payment details', {
            userId,
            orderId,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', `Failed to get payment details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});
//# sourceMappingURL=checkPaymentStatus.js.map