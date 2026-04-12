/**
 * @deprecated Legacy payment module (v1).
 *
 * These functions use the old `payment_orders` Firestore collection and are
 * retained only for backward-compatibility with existing deployed webhooks.
 *
 * **DO NOT use in new features.** Use the following instead:
 *  - createOrder / cashfreeWebhookV2 / checkPaymentStatus  (functions/src/payments/)
 *  - createSeamlessOrder / processSeamlessPayment          (functions/src/payments/seamlessPayment.ts)
 *  - createBoostOrder / verifyBoostPayment                 (functions/src/payments/createBoostOrder.ts)
 *
 * Scheduled removal: once all clients have migrated to the v2 payment flow.
 */
import * as functions from "firebase-functions";
import { logger } from "firebase-functions/v2";
import { Cashfree } from "cashfree-pg";
import { admin } from "./utils/admin";
import {
  CASHFREE_SECRET_BINDINGS,
  getRequiredEnv,
  SECRET_NAMES,
} from "./utils/secrets";

const paymentRuntime = functions.runWith({ secrets: CASHFREE_SECRET_BINDINGS });

const initializeCashfree = (): void => {
  Cashfree.XClientId = getRequiredEnv(SECRET_NAMES.CASHFREE_APP_ID);
  Cashfree.XClientSecret = getRequiredEnv(SECRET_NAMES.CASHFREE_SECRET_KEY);
  Cashfree.XEnvironment =
    process.env.CASHFREE_ENV === "production"
      ? Cashfree.Environment.PRODUCTION
      : Cashfree.Environment.SANDBOX;
  Cashfree.XApiVersion = "2025-01-01";
};

// Create Payment Intent
export const createPayment = paymentRuntime.https.onCall(
  async (data, context) => {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated",
      );
    }

    const {
      orderId,
      amount,
      currency,
      customerEmail,
      customerPhone,
      listingId,
      paymentMethod,
    } = data;
    initializeCashfree();

    try {
      // Validate input
      if (!orderId || !amount || !customerEmail || !listingId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Missing required fields",
        );
      }

      // Create payment order with Cashfree
      const orderRequest = {
        order_id: orderId,
        order_amount: amount,
        order_currency: currency || "INR",
        customer_details: {
          customer_id: context.auth.uid,
          customer_email: customerEmail,
          customer_phone: customerPhone,
        },
        order_meta: {
          return_url: `${process.env.FRONTEND_URL}/payment/success`,
          notify_url: `${process.env.FUNCTIONS_URL}/webhook/cashfree`,
        },
        payment_method: paymentMethod ? paymentMethod.split(",") : undefined,
      };

      const response = await Cashfree.PGCreateOrder("2025-01-01", orderRequest);
      const responseData = response.data;

      // Store payment order in Firestore
      await admin
        .firestore()
        .collection("payment_orders")
        .doc(orderId)
        .set({
          userId: context.auth.uid,
          listingId,
          amount,
          currency: currency || "INR",
          customerEmail,
          customerPhone,
          paymentMethod,
          status: "created",
          cashfreeOrderId: responseData.cf_order_id,
          paymentSessionId: responseData.payment_session_id,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      return {
        success: true,
        paymentId: responseData.cf_order_id,
        paymentUrl: responseData.payment_session_id,
        requiresAction: true,
        actionData: {
          paymentSessionId: responseData.payment_session_id,
          orderId: responseData.cf_order_id,
        },
      };
    } catch (error) {
      logger.error("Error creating payment:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Payment creation failed",
      );
    }
  },
);

// Verify Payment
export const verifyPayment = paymentRuntime.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated",
      );
    }

    const { paymentId } = data;
    initializeCashfree();

    try {
      // Get payment order from Firestore
      const orderDoc = await admin
        .firestore()
        .collection("payment_orders")
        .doc(paymentId)
        .get();

      if (!orderDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Payment order not found",
        );
      }

      const orderData = orderDoc.data()!;

      // Check payment status with Cashfree
      const response = await Cashfree.PGFetchOrder("2025-01-01", paymentId);
      const responseData = response.data;

      // Update payment order status
      await admin
        .firestore()
        .collection("payment_orders")
        .doc(paymentId)
        .update({
          status: responseData.order_status,
          cashfreeStatus: responseData.order_status,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      // If payment is successful, create/update listing purchase record
      if (responseData.order_status === "PAID") {
        await admin.firestore().collection("purchases").add({
          userId: context.auth.uid,
          listingId: orderData.listingId,
          paymentId,
          amount: orderData.amount,
          status: "completed",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Update listing status
        await admin
          .firestore()
          .collection("listings")
          .doc(orderData.listingId)
          .update({
            status: "sold",
            soldTo: context.auth.uid,
            soldAt: admin.firestore.FieldValue.serverTimestamp(),
          });
      }

      return {
        success: responseData.order_status === "PAID",
        paymentId,
        status: responseData.order_status,
      };
    } catch (error) {
      logger.error("Error verifying payment:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Payment verification failed",
      );
    }
  },
);

// Cashfree Webhook Handler
export const cashfreeWebhook = paymentRuntime.https.onRequest(
  async (req, res) => {
    const signature = req.headers["x-cashfree-signature"];
    const payload = JSON.stringify(req.body);

    // Verify webhook signature
    const isValidSignature = await verifyWebhookSignature(
      payload,
      signature as string,
    );

    if (!isValidSignature) {
      logger.error("Invalid webhook signature");
      res.status(401).send("Unauthorized");
      return;
    }

    const { order_id, order_status, transaction_id } = req.body;

    try {
      // Get payment order
      const orderDoc = await admin
        .firestore()
        .collection("payment_orders")
        .doc(order_id)
        .get();

      if (!orderDoc.exists) {
        logger.error("Order not found:", order_id);
        res.status(404).send("Order not found");
        return;
      }

      const orderData = orderDoc.data()!;

      // Update payment status
      await admin
        .firestore()
        .collection("payment_orders")
        .doc(order_id)
        .update({
          status: order_status,
          transactionId: transaction_id,
          cashfreeStatus: order_status,
          webhookProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      // If payment is successful, process the purchase
      if (order_status === "PAID") {
        await admin.firestore().collection("purchases").add({
          userId: orderData.userId,
          listingId: orderData.listingId,
          paymentId: order_id,
          amount: orderData.amount,
          status: "completed",
          transactionId: transaction_id,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Update listing status
        await admin
          .firestore()
          .collection("listings")
          .doc(orderData.listingId)
          .update({
            status: "sold",
            soldTo: orderData.userId,
            soldAt: admin.firestore.FieldValue.serverTimestamp(),
          });

        // Send notification to seller
        // TODO: Implement notification system
      }

      res.status(200).send("Webhook processed successfully");
    } catch (error) {
      logger.error("Error processing webhook:", error);
      res.status(500).send("Webhook processing failed");
    }
  },
);

// Helper function to verify webhook signature
// v2025-01-01: Uses CASHFREE_SECRET_KEY (client secret); new integrations should use cashfreeWebhook.ts
async function verifyWebhookSignature(
  payload: string,
  signature: string,
): Promise<boolean> {
  const crypto = require("crypto");
  const secretKey = getRequiredEnv(SECRET_NAMES.CASHFREE_SECRET_KEY);

  const expectedSignature = crypto
    .createHmac("sha256", secretKey)
    .update(payload)
    .digest("base64");

  return signature === expectedSignature;
}

// Refund Payment
export const refundPayment = paymentRuntime.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated",
      );
    }

    const { paymentId, reason } = data;
    initializeCashfree();

    try {
      // Check if user owns this payment
      const orderDoc = await admin
        .firestore()
        .collection("payment_orders")
        .doc(paymentId)
        .get();

      if (!orderDoc.exists || orderDoc.data()!.userId !== context.auth.uid) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Access denied",
        );
      }

      const orderData = orderDoc.data()!;

      // Process refund with Cashfree
      const response = await Cashfree.PGOrderCreateRefund(
        "2025-01-01",
        paymentId,
        {
          refund_amount: orderData.amount,
          refund_id: `refund_${paymentId}_${Date.now()}`,
          refund_note: reason || "Customer requested refund",
        },
      );
      const responseData = response.data;

      // Update payment order
      await admin
        .firestore()
        .collection("payment_orders")
        .doc(paymentId)
        .update({
          refundId: responseData.cf_refund_id,
          refundStatus: responseData.refund_status,
          refundReason: reason,
          refundedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      return {
        success: true,
        refundId: responseData.cf_refund_id,
        refundStatus: responseData.refund_status,
      };
    } catch (error) {
      logger.error("Error processing refund:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Refund processing failed",
      );
    }
  },
);

// Get Payment History
export const getPaymentHistory = paymentRuntime.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated",
      );
    }

    const { limit = 10, startAfter } = data;

    try {
      let query = admin
        .firestore()
        .collection("payment_orders")
        .where("userId", "==", context.auth.uid)
        .orderBy("createdAt", "desc")
        .limit(limit);

      if (startAfter) {
        query = query.startAfter(startAfter);
      }

      const snapshot = await query.get();
      const payments = snapshot.docs.map((doc) => ({
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
      logger.error("Error getting payment history:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to get payment history",
      );
    }
  },
);
