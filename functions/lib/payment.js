"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null)
      for (var k in mod)
        if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaymentHistory =
  exports.refundPayment =
  exports.cashfreeWebhook =
  exports.verifyPayment =
  exports.createPayment =
    void 0;
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
const functions = __importStar(require("firebase-functions"));
const v2_1 = require("firebase-functions/v2");
const cashfree_pg_1 = require("cashfree-pg");
const admin_1 = require("./utils/admin");
const secrets_1 = require("./utils/secrets");
const paymentRuntime = functions.runWith({
  secrets: secrets_1.CASHFREE_SECRET_BINDINGS,
});
const initializeCashfree = () => {
  cashfree_pg_1.Cashfree.XClientId = (0, secrets_1.getRequiredEnv)(
    secrets_1.SECRET_NAMES.CASHFREE_APP_ID,
  );
  cashfree_pg_1.Cashfree.XClientSecret = (0, secrets_1.getRequiredEnv)(
    secrets_1.SECRET_NAMES.CASHFREE_SECRET_KEY,
  );
  cashfree_pg_1.Cashfree.XEnvironment =
    process.env.CASHFREE_ENV === "production"
      ? cashfree_pg_1.Cashfree.Environment.PRODUCTION
      : cashfree_pg_1.Cashfree.Environment.SANDBOX;
  cashfree_pg_1.Cashfree.XApiVersion = "2025-01-01";
};
// Create Payment Intent
exports.createPayment = paymentRuntime.https.onCall(async (data, context) => {
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
    const response = await cashfree_pg_1.Cashfree.PGCreateOrder(
      "2025-01-01",
      orderRequest,
    );
    const responseData = response.data;
    // Store payment order in Firestore
    await admin_1.admin
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
        createdAt: admin_1.admin.firestore.FieldValue.serverTimestamp(),
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
    v2_1.logger.error("Error creating payment:", error);
    throw new functions.https.HttpsError("internal", "Payment creation failed");
  }
});
// Verify Payment
exports.verifyPayment = paymentRuntime.https.onCall(async (data, context) => {
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
    const orderDoc = await admin_1.admin
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
    const orderData = orderDoc.data();
    // Check payment status with Cashfree
    const response = await cashfree_pg_1.Cashfree.PGFetchOrder(
      "2025-01-01",
      paymentId,
    );
    const responseData = response.data;
    // Update payment order status
    await admin_1.admin
      .firestore()
      .collection("payment_orders")
      .doc(paymentId)
      .update({
        status: responseData.order_status,
        cashfreeStatus: responseData.order_status,
        updatedAt: admin_1.admin.firestore.FieldValue.serverTimestamp(),
      });
    // If payment is successful, create/update listing purchase record
    if (responseData.order_status === "PAID") {
      await admin_1.admin.firestore().collection("purchases").add({
        userId: context.auth.uid,
        listingId: orderData.listingId,
        paymentId,
        amount: orderData.amount,
        status: "completed",
        createdAt: admin_1.admin.firestore.FieldValue.serverTimestamp(),
      });
      // Update listing status
      await admin_1.admin
        .firestore()
        .collection("listings")
        .doc(orderData.listingId)
        .update({
          status: "sold",
          soldTo: context.auth.uid,
          soldAt: admin_1.admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    return {
      success: responseData.order_status === "PAID",
      paymentId,
      status: responseData.order_status,
    };
  } catch (error) {
    v2_1.logger.error("Error verifying payment:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Payment verification failed",
    );
  }
});
// Cashfree Webhook Handler
exports.cashfreeWebhook = paymentRuntime.https.onRequest(async (req, res) => {
  const signature = req.headers["x-cashfree-signature"];
  const payload = JSON.stringify(req.body);
  // Verify webhook signature
  const isValidSignature = await verifyWebhookSignature(payload, signature);
  if (!isValidSignature) {
    v2_1.logger.error("Invalid webhook signature");
    res.status(401).send("Unauthorized");
    return;
  }
  const { order_id, order_status, transaction_id } = req.body;
  try {
    // Get payment order
    const orderDoc = await admin_1.admin
      .firestore()
      .collection("payment_orders")
      .doc(order_id)
      .get();
    if (!orderDoc.exists) {
      v2_1.logger.error("Order not found:", order_id);
      res.status(404).send("Order not found");
      return;
    }
    const orderData = orderDoc.data();
    // Update payment status
    await admin_1.admin
      .firestore()
      .collection("payment_orders")
      .doc(order_id)
      .update({
        status: order_status,
        transactionId: transaction_id,
        cashfreeStatus: order_status,
        webhookProcessedAt:
          admin_1.admin.firestore.FieldValue.serverTimestamp(),
      });
    // If payment is successful, process the purchase
    if (order_status === "PAID") {
      await admin_1.admin.firestore().collection("purchases").add({
        userId: orderData.userId,
        listingId: orderData.listingId,
        paymentId: order_id,
        amount: orderData.amount,
        status: "completed",
        transactionId: transaction_id,
        createdAt: admin_1.admin.firestore.FieldValue.serverTimestamp(),
      });
      // Update listing status
      await admin_1.admin
        .firestore()
        .collection("listings")
        .doc(orderData.listingId)
        .update({
          status: "sold",
          soldTo: orderData.userId,
          soldAt: admin_1.admin.firestore.FieldValue.serverTimestamp(),
        });
      // Send notification to seller
      // TODO: Implement notification system
    }
    res.status(200).send("Webhook processed successfully");
  } catch (error) {
    v2_1.logger.error("Error processing webhook:", error);
    res.status(500).send("Webhook processing failed");
  }
});
// Helper function to verify webhook signature
// v2025-01-01: Uses CASHFREE_SECRET_KEY (client secret); new integrations should use cashfreeWebhook.ts
async function verifyWebhookSignature(payload, signature) {
  const crypto = require("crypto");
  const secretKey = (0, secrets_1.getRequiredEnv)(
    secrets_1.SECRET_NAMES.CASHFREE_SECRET_KEY,
  );
  const expectedSignature = crypto
    .createHmac("sha256", secretKey)
    .update(payload)
    .digest("base64");
  return signature === expectedSignature;
}
// Refund Payment
exports.refundPayment = paymentRuntime.https.onCall(async (data, context) => {
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
    const orderDoc = await admin_1.admin
      .firestore()
      .collection("payment_orders")
      .doc(paymentId)
      .get();
    if (!orderDoc.exists || orderDoc.data().userId !== context.auth.uid) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Access denied",
      );
    }
    const orderData = orderDoc.data();
    // Process refund with Cashfree
    const response = await cashfree_pg_1.Cashfree.PGOrderCreateRefund(
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
    await admin_1.admin
      .firestore()
      .collection("payment_orders")
      .doc(paymentId)
      .update({
        refundId: responseData.cf_refund_id,
        refundStatus: responseData.refund_status,
        refundReason: reason,
        refundedAt: admin_1.admin.firestore.FieldValue.serverTimestamp(),
      });
    return {
      success: true,
      refundId: responseData.cf_refund_id,
      refundStatus: responseData.refund_status,
    };
  } catch (error) {
    v2_1.logger.error("Error processing refund:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Refund processing failed",
    );
  }
});
// Get Payment History
exports.getPaymentHistory = paymentRuntime.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated",
      );
    }
    const { limit = 10, startAfter } = data;
    try {
      let query = admin_1.admin
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
      v2_1.logger.error("Error getting payment history:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to get payment history",
      );
    }
  },
);
//# sourceMappingURL=payment.js.map
