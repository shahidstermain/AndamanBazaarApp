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
exports.cleanupExpiredReservations = exports.createOrder = void 0;
const functions = __importStar(require("firebase-functions"));
const v2_1 = require("firebase-functions/v2");
const cashfreeClient_1 = require("../utils/cashfreeClient");
const admin_1 = require("../utils/admin");
const secrets_1 = require("../utils/secrets");
const paymentsRuntime = functions.runWith({
  secrets: secrets_1.CASHFREE_SECRET_BINDINGS,
});
/**
 * Creates a new payment order with Cashfree and stores it in Firestore
 *
 * Security considerations:
 * - Validates Firebase Auth token
 * - Never trusts frontend for amount or listing details
 * - Validates listing exists and is available
 * - Prevents duplicate orders with idempotency key
 * - All sensitive operations server-side only
 */
exports.createOrder = paymentsRuntime.https.onCall(async (data, context) => {
  // Validate authentication
  if (!context.auth) {
    v2_1.logger.warn("Unauthorized attempt to create payment order");
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Authentication required",
    );
  }
  const buyerId = context.auth.uid;
  try {
    // Validate input data
    const {
      listingId,
      customerEmail,
      customerPhone,
      orderNotes,
      duplicatePreventionKey,
    } = data;
    if (!listingId || !customerEmail) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "listingId and customerEmail are required",
      );
    }
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid email format",
      );
    }
    // Check for duplicate order (idempotency)
    if (duplicatePreventionKey) {
      const existingOrderQuery = await admin_1.admin
        .firestore()
        .collection("payments")
        .where("duplicatePreventionKey", "==", duplicatePreventionKey)
        .where("buyerId", "==", buyerId)
        .where("orderStatus", "==", "ACTIVE")
        .limit(1)
        .get();
      if (!existingOrderQuery.empty) {
        const existingOrder = existingOrderQuery.docs[0].data();
        v2_1.logger.info(
          `Duplicate order prevented: ${duplicatePreventionKey}`,
          {
            existingOrderId: existingOrder.orderId,
          },
        );
        return {
          success: true,
          orderId: existingOrder.orderId,
          paymentSessionId: existingOrder.paymentSessionId,
          cfOrderId: existingOrder.cfOrderId,
          orderExpiryTime: existingOrder.orderExpiryTime,
        };
      }
    }
    // Fetch and validate listing
    const listingDoc = await admin_1.admin
      .firestore()
      .collection("listings")
      .doc(listingId)
      .get();
    if (!listingDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Listing not found");
    }
    const listing = listingDoc.data();
    // Validate listing is available for purchase
    if (listing.status !== "active" || !listing.isActive) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Listing is not available for purchase",
      );
    }
    // Prevent self-purchase
    if (listing.userId === buyerId) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Cannot purchase your own listing",
      );
    }
    // Generate unique order ID
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    // Prepare Cashfree order request
    const cashfreeRequest = {
      orderId,
      orderAmount: listing.price,
      orderCurrency: "INR",
      customerDetails: {
        customerId: buyerId,
        customerEmail,
        customerPhone,
      },
      orderNotes: orderNotes || `Payment for listing: ${listing.title}`,
      orderMeta: {
        return_url: `${process.env.FRONTEND_URL}/payment/success`,
        notify_url: `${process.env.FUNCTIONS_URL}/payments/cashfreeWebhook`,
        payment_methods: "upi,netbanking,card,wallet", // Enable all payment methods
      },
    };
    // Create order with Cashfree
    const cashfreeResponse = await (0, cashfreeClient_1.createCashfreeOrder)(
      cashfreeRequest,
    );
    // Store payment order in Firestore
    const paymentOrder = {
      orderId: cashfreeResponse.orderId,
      cfOrderId: cashfreeResponse.cfOrderId,
      listingId,
      buyerId,
      sellerId: listing.userId,
      orderAmount: cashfreeResponse.orderAmount,
      orderCurrency: cashfreeResponse.orderCurrency,
      orderStatus: cashfreeResponse.orderStatus,
      paymentStatus: "PENDING",
      customerEmail,
      customerPhone,
      paymentSessionId: cashfreeResponse.paymentSessionId,
      orderToken: cashfreeResponse.orderToken,
      orderExpiryTime: cashfreeResponse.orderExpiryTime,
      createdAt: admin_1.admin.firestore.Timestamp.now(),
      updatedAt: admin_1.admin.firestore.Timestamp.now(),
      listingTitle: listing.title,
      listingPrice: listing.price,
      duplicatePreventionKey,
    };
    // Save to Firestore
    await admin_1.admin
      .firestore()
      .collection("payments")
      .doc(orderId)
      .set(paymentOrder);
    // Log order creation for audit
    await admin_1.admin.firestore().collection("paymentEvents").add({
      type: "ORDER_CREATED",
      orderId,
      cfOrderId: cashfreeResponse.cfOrderId,
      listingId,
      buyerId,
      sellerId: listing.userId,
      orderAmount: listing.price,
      customerEmail,
      timestamp: admin_1.admin.firestore.Timestamp.now(),
      userAgent: context.rawRequest.headers["user-agent"],
      ip: context.rawRequest.ip,
    });
    // Create a reservation on the listing (optional - prevents double purchase)
    await admin_1.admin
      .firestore()
      .collection("listings")
      .doc(listingId)
      .update({
        status: "reserved",
        reservedBy: buyerId,
        reservedAt: admin_1.admin.firestore.Timestamp.now(),
        reservationExpiresAt: admin_1.admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + 15 * 60 * 1000),
        ), // 15 minutes
      });
    v2_1.logger.info(`Payment order created successfully: ${orderId}`, {
      cfOrderId: cashfreeResponse.cfOrderId,
      listingId,
      buyerId,
      orderAmount: listing.price,
    });
    const response = {
      success: true,
      orderId: cashfreeResponse.orderId,
      paymentSessionId: cashfreeResponse.paymentSessionId,
      cfOrderId: cashfreeResponse.cfOrderId,
      orderExpiryTime: cashfreeResponse.orderExpiryTime,
    };
    return response;
  } catch (error) {
    v2_1.logger.error("Failed to create payment order", {
      buyerId,
      listingId: data.listingId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Clean up any reservation if order creation failed
    if (data.listingId) {
      try {
        await admin_1.admin
          .firestore()
          .collection("listings")
          .doc(data.listingId)
          .update({
            status: "active",
            reservedBy: admin_1.admin.firestore.FieldValue.delete(),
            reservedAt: admin_1.admin.firestore.FieldValue.delete(),
            reservationExpiresAt: admin_1.admin.firestore.FieldValue.delete(),
          });
      } catch (cleanupError) {
        v2_1.logger.error(
          "Failed to cleanup listing reservation",
          cleanupError,
        );
      }
    }
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      "internal",
      `Failed to create payment order: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
});
// Helper function to clean up expired reservations (can be called by scheduled function)
exports.cleanupExpiredReservations = paymentsRuntime.https.onRequest(
  async (req, res) => {
    try {
      const now = admin_1.admin.firestore.Timestamp.now();
      // Find expired reservations
      const expiredReservations = await admin_1.admin
        .firestore()
        .collection("listings")
        .where("status", "==", "reserved")
        .where("reservationExpiresAt", "<", now)
        .get();
      const batch = admin_1.admin.firestore().batch();
      expiredReservations.docs.forEach((doc) => {
        batch.update(doc.ref, {
          status: "active",
          reservedBy: admin_1.admin.firestore.FieldValue.delete(),
          reservedAt: admin_1.admin.firestore.FieldValue.delete(),
          reservationExpiresAt: admin_1.admin.firestore.FieldValue.delete(),
        });
      });
      await batch.commit();
      v2_1.logger.info(
        `Cleaned up ${expiredReservations.size} expired reservations`,
      );
      res.status(200).json({
        success: true,
        cleanedReservations: expiredReservations.size,
      });
    } catch (error) {
      v2_1.logger.error("Failed to cleanup expired reservations", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);
//# sourceMappingURL=createOrder.js.map
