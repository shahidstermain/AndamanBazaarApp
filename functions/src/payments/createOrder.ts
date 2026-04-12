import * as functions from "firebase-functions";
import { logger } from "firebase-functions/v2";
import {
  createCashfreeOrder,
  CreateOrderRequest,
} from "../utils/cashfreeClient";
import { admin } from "../utils/admin";
import { CASHFREE_SECRET_BINDINGS } from "../utils/secrets";

const paymentsRuntime = functions.runWith({
  secrets: CASHFREE_SECRET_BINDINGS,
});

// Payment order interface for Firestore
interface PaymentOrder {
  orderId: string;
  cfOrderId: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  orderAmount: number;
  orderCurrency: string;
  orderStatus: "ACTIVE" | "PAID" | "EXPIRED" | "CANCELLED";
  paymentStatus: "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED";
  customerEmail: string;
  customerPhone?: string;
  paymentSessionId: string;
  orderToken: string;
  orderExpiryTime: string;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
  listingTitle?: string;
  listingPrice?: number;
  duplicatePreventionKey?: string;
}

// Request data interface for createOrder function
interface CreateOrderRequestData {
  listingId: string;
  customerEmail: string;
  customerPhone?: string;
  orderNotes?: string;
  duplicatePreventionKey?: string;
}

// Response interface
interface CreateOrderResponse {
  success: boolean;
  orderId: string;
  paymentSessionId: string;
  cfOrderId: string;
  orderExpiryTime: string;
  error?: string;
}

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
export const createOrder = paymentsRuntime.https.onCall(
  async (data: CreateOrderRequestData, context) => {
    // Validate authentication
    if (!context.auth) {
      logger.warn("Unauthorized attempt to create payment order");
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
        const existingOrderQuery = await admin
          .firestore()
          .collection("payments")
          .where("duplicatePreventionKey", "==", duplicatePreventionKey)
          .where("buyerId", "==", buyerId)
          .where("orderStatus", "==", "ACTIVE")
          .limit(1)
          .get();

        if (!existingOrderQuery.empty) {
          const existingOrder =
            existingOrderQuery.docs[0].data() as PaymentOrder;
          logger.info(`Duplicate order prevented: ${duplicatePreventionKey}`, {
            existingOrderId: existingOrder.orderId,
          });

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
      const listingDoc = await admin
        .firestore()
        .collection("listings")
        .doc(listingId)
        .get();

      if (!listingDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Listing not found");
      }

      const listing = listingDoc.data()!;

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
      const cashfreeRequest: CreateOrderRequest = {
        orderId,
        orderAmount: listing.price,
        orderCurrency: "INR", // Fixed to INR for AndamanBazaar
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
      const cashfreeResponse = await createCashfreeOrder(cashfreeRequest);

      // Store payment order in Firestore
      const paymentOrder: PaymentOrder = {
        orderId: cashfreeResponse.orderId,
        cfOrderId: cashfreeResponse.cfOrderId,
        listingId,
        buyerId,
        sellerId: listing.userId,
        orderAmount: cashfreeResponse.orderAmount,
        orderCurrency: cashfreeResponse.orderCurrency,
        orderStatus: cashfreeResponse.orderStatus as
          | "ACTIVE"
          | "PAID"
          | "EXPIRED"
          | "CANCELLED",
        paymentStatus: "PENDING",
        customerEmail,
        customerPhone,
        paymentSessionId: cashfreeResponse.paymentSessionId,
        orderToken: cashfreeResponse.orderToken,
        orderExpiryTime: cashfreeResponse.orderExpiryTime,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        listingTitle: listing.title,
        listingPrice: listing.price,
        duplicatePreventionKey,
      };

      // Save to Firestore
      await admin
        .firestore()
        .collection("payments")
        .doc(orderId)
        .set(paymentOrder);

      // Log order creation for audit
      await admin.firestore().collection("paymentEvents").add({
        type: "ORDER_CREATED",
        orderId,
        cfOrderId: cashfreeResponse.cfOrderId,
        listingId,
        buyerId,
        sellerId: listing.userId,
        orderAmount: listing.price,
        customerEmail,
        timestamp: admin.firestore.Timestamp.now(),
        userAgent: context.rawRequest.headers["user-agent"],
        ip: context.rawRequest.ip,
      });

      // Create a reservation on the listing (optional - prevents double purchase)
      await admin
        .firestore()
        .collection("listings")
        .doc(listingId)
        .update({
          status: "reserved",
          reservedBy: buyerId,
          reservedAt: admin.firestore.Timestamp.now(),
          reservationExpiresAt: admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + 15 * 60 * 1000),
          ), // 15 minutes
        });

      logger.info(`Payment order created successfully: ${orderId}`, {
        cfOrderId: cashfreeResponse.cfOrderId,
        listingId,
        buyerId,
        orderAmount: listing.price,
      });

      const response: CreateOrderResponse = {
        success: true,
        orderId: cashfreeResponse.orderId,
        paymentSessionId: cashfreeResponse.paymentSessionId,
        cfOrderId: cashfreeResponse.cfOrderId,
        orderExpiryTime: cashfreeResponse.orderExpiryTime,
      };

      return response;
    } catch (error) {
      logger.error("Failed to create payment order", {
        buyerId,
        listingId: data.listingId,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Clean up any reservation if order creation failed
      if (data.listingId) {
        try {
          await admin
            .firestore()
            .collection("listings")
            .doc(data.listingId)
            .update({
              status: "active",
              reservedBy: admin.firestore.FieldValue.delete(),
              reservedAt: admin.firestore.FieldValue.delete(),
              reservationExpiresAt: admin.firestore.FieldValue.delete(),
            });
        } catch (cleanupError) {
          logger.error("Failed to cleanup listing reservation", cleanupError);
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
  },
);

// Helper function to clean up expired reservations (can be called by scheduled function)
export const cleanupExpiredReservations = paymentsRuntime.https.onRequest(
  async (req, res) => {
    try {
      const now = admin.firestore.Timestamp.now();

      // Find expired reservations
      const expiredReservations = await admin
        .firestore()
        .collection("listings")
        .where("status", "==", "reserved")
        .where("reservationExpiresAt", "<", now)
        .get();

      const batch = admin.firestore().batch();

      expiredReservations.docs.forEach((doc) => {
        batch.update(doc.ref, {
          status: "active",
          reservedBy: admin.firestore.FieldValue.delete(),
          reservedAt: admin.firestore.FieldValue.delete(),
          reservationExpiresAt: admin.firestore.FieldValue.delete(),
        });
      });

      await batch.commit();

      logger.info(
        `Cleaned up ${expiredReservations.size} expired reservations`,
      );

      res.status(200).json({
        success: true,
        cleanedReservations: expiredReservations.size,
      });
    } catch (error) {
      logger.error("Failed to cleanup expired reservations", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);
