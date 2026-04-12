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
exports.verifyBoostPayment = void 0;
const functions = __importStar(require("firebase-functions"));
const v2_1 = require("firebase-functions/v2");
const cashfreeClient_1 = require("../utils/cashfreeClient");
const admin_1 = require("../utils/admin");
const secrets_1 = require("../utils/secrets");
const paymentsRuntime = functions.runWith({
  secrets: secrets_1.CASHFREE_SECRET_BINDINGS,
});
/**
 * Verifies a boost payment status.
 * Called by the frontend after redirect from Cashfree.
 *
 * Security:
 * - Auth required
 * - User can only verify their own orders
 * - Status is fetched from Cashfree (server-side) — never trusted from client
 * - Firestore is synced with the latest status
 */
exports.verifyBoostPayment = paymentsRuntime.https.onRequest(
  async (req, res) => {
    // CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "GET") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }
    // ── Auth ──────────────────────────────────────────────────
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res
        .status(401)
        .json({ error: "Missing or invalid Authorization header" });
      return;
    }
    let uid;
    try {
      const token = authHeader.split("Bearer ")[1];
      const decoded = await admin_1.admin.auth().verifyIdToken(token);
      uid = decoded.uid;
    } catch (err) {
      v2_1.logger.warn("Invalid auth token on verifyBoostPayment", err);
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    try {
      const orderId = req.query.orderId;
      if (!orderId || typeof orderId !== "string") {
        res.status(400).json({ error: "orderId query parameter is required" });
        return;
      }
      // ── Find the boost record ───────────────────────────────
      const boostSnap = await admin_1.admin
        .firestore()
        .collection("listingBoosts")
        .where("orderId", "==", orderId)
        .limit(1)
        .get();
      if (boostSnap.empty) {
        // Also check cashfreeOrderId
        const byCfId = await admin_1.admin
          .firestore()
          .collection("listingBoosts")
          .where("cashfreeOrderId", "==", orderId)
          .limit(1)
          .get();
        if (byCfId.empty) {
          res.status(404).json({ error: "Boost order not found" });
          return;
        }
        // Use this result
        const boostDoc = byCfId.docs[0];
        await processVerification(boostDoc, uid, res);
        return;
      }
      const boostDoc = boostSnap.docs[0];
      await processVerification(boostDoc, uid, res);
    } catch (error) {
      v2_1.logger.error("verifyBoostPayment failed", {
        uid,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      res.status(500).json({
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  },
);
async function processVerification(boostDoc, uid, res) {
  const boost = boostDoc.data();
  // ── Authorization: only owner can verify ────────────────
  if (boost.userId !== uid) {
    v2_1.logger.warn("Unauthorized verify attempt", {
      uid,
      boostOwner: boost.userId,
    });
    res.status(403).json({ error: "Access denied" });
    return;
  }
  // If already in a terminal state, return immediately
  if (["paid", "failed", "refunded"].includes(boost.status)) {
    res.status(200).json({
      success: true,
      status: boost.status,
      order: {
        orderId: boost.orderId,
        status: boost.status,
        amount: boost.amount,
        currency: boost.currency,
        tier: boost.tier,
        tierName: boost.tierName,
        listingId: boost.listingId,
        boostStartsAt: boost.boostStartsAt?.toDate?.()?.toISOString() || null,
        boostExpiresAt: boost.boostExpiresAt?.toDate?.()?.toISOString() || null,
        invoiceId: boost.invoiceId || null,
        createdAt: boost.createdAt.toDate().toISOString(),
        updatedAt: boost.updatedAt.toDate().toISOString(),
      },
    });
    return;
  }
  // ── Fetch latest status from Cashfree ─────────────────
  try {
    const cfStatus = await (0, cashfreeClient_1.getCashfreeOrderStatus)(
      boost.orderId,
    );
    let newStatus = boost.status;
    const latestPayment = cfStatus.payments?.[0];
    if (
      cfStatus.orderStatus === "PAID" ||
      latestPayment?.paymentStatus === "SUCCESS"
    ) {
      newStatus = "paid";
    } else if (cfStatus.orderStatus === "EXPIRED") {
      newStatus = "expired";
    } else if (latestPayment?.paymentStatus === "FAILED") {
      newStatus = "failed";
    }
    // ── Update Firestore if status changed ──────────────
    if (newStatus !== boost.status) {
      const updateData = {
        status: newStatus,
        updatedAt: admin_1.admin.firestore.Timestamp.now(),
        cashfreeResponse: cfStatus,
      };
      if (newStatus === "paid" && latestPayment) {
        updateData.paymentId = latestPayment.cfPaymentId;
        updateData.paymentMethod = "cashfree";
        // Set boost activation window
        const now = new Date();
        const expiresAt = new Date(
          now.getTime() + boost.durationDays * 24 * 60 * 60 * 1000,
        );
        updateData.boostStartsAt =
          admin_1.admin.firestore.Timestamp.fromDate(now);
        updateData.boostExpiresAt =
          admin_1.admin.firestore.Timestamp.fromDate(expiresAt);
        // Also update the listing's boost flags
        await admin_1.admin
          .firestore()
          .collection("listings")
          .doc(boost.listingId)
          .update({
            isBoosted: true,
            boostTier: boost.tier,
            boostExpiresAt:
              admin_1.admin.firestore.Timestamp.fromDate(expiresAt),
            updatedAt: admin_1.admin.firestore.Timestamp.now(),
          });
        // Generate invoice
        await generateBoostInvoice(boostDoc.id, boost, latestPayment);
      }
      if (newStatus === "failed") {
        updateData.failureReason =
          latestPayment?.paymentStatus || "Payment failed at gateway";
      }
      await admin_1.admin
        .firestore()
        .collection("listingBoosts")
        .doc(boostDoc.id)
        .update(updateData);
      // Audit log
      await admin_1.admin
        .firestore()
        .collection("paymentAuditLog")
        .add({
          type: `BOOST_PAYMENT_${newStatus.toUpperCase()}`,
          orderId: boost.orderId,
          boostId: boostDoc.id,
          listingId: boost.listingId,
          userId: boost.userId,
          tier: boost.tier,
          amount: boost.amount,
          previousStatus: boost.status,
          newStatus,
          source: "verify_endpoint",
          timestamp: admin_1.admin.firestore.Timestamp.now(),
        });
      v2_1.logger.info("Boost status updated via verification", {
        boostId: boostDoc.id,
        previousStatus: boost.status,
        newStatus,
      });
    }
    res.status(200).json({
      success: true,
      status: newStatus,
      order: {
        orderId: boost.orderId,
        status: newStatus,
        amount: boost.amount,
        currency: boost.currency,
        tier: boost.tier,
        tierName: boost.tierName,
        listingId: boost.listingId,
        paymentId: latestPayment?.cfPaymentId || null,
        createdAt: boost.createdAt.toDate().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (cfError) {
    v2_1.logger.error("Cashfree status check failed during verify", {
      orderId: boost.orderId,
      error: cfError instanceof Error ? cfError.message : "Unknown",
    });
    // Return the Firestore status as fallback
    res.status(200).json({
      success: true,
      status: boost.status,
      order: {
        orderId: boost.orderId,
        status: boost.status,
        amount: boost.amount,
        currency: boost.currency,
        tier: boost.tier,
        tierName: boost.tierName,
        listingId: boost.listingId,
        createdAt: boost.createdAt.toDate().toISOString(),
        updatedAt: boost.updatedAt.toDate().toISOString(),
      },
      note: "Status from local records; gateway check failed",
    });
  }
}
// ============================================================
// Invoice Generation
// ============================================================
async function generateBoostInvoice(boostId, boost, paymentInfo) {
  try {
    const invoiceId = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const invoiceNumber = `AB-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    // Fetch listing title
    let listingTitle = "Listing";
    try {
      const listingDoc = await admin_1.admin
        .firestore()
        .collection("listings")
        .doc(boost.listingId)
        .get();
      if (listingDoc.exists) {
        listingTitle = listingDoc.data().title || "Listing";
      }
    } catch {
      /* ignore */
    }
    // Fetch user profile
    let userName = "";
    let userPhone = "";
    try {
      const userDoc = await admin_1.admin
        .firestore()
        .collection("users")
        .doc(boost.userId)
        .get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        userName = userData.name || userData.displayName || "";
        userPhone = userData.phone || "";
      }
    } catch {
      /* ignore */
    }
    const invoiceDoc = {
      invoiceId,
      invoiceNumber,
      type: "boost",
      boostId,
      orderId: boost.orderId,
      cashfreeOrderId: boost.cashfreeOrderId,
      paymentId: paymentInfo?.cfPaymentId || null,
      // Customer
      userId: boost.userId,
      customerName: userName,
      customerEmail: boost.customerEmail,
      customerPhone: userPhone,
      // Seller (platform = AndamanBazaar)
      sellerName: "SHAHID MOOSA",
      sellerType: "Sole Proprietor",
      platform: "AndamanBazaar",
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
      currency: "INR",
      amountPaise: boost.amountPaise,
      // Dates
      invoiceDate: admin_1.admin.firestore.Timestamp.now(),
      dueDate: admin_1.admin.firestore.Timestamp.now(),
      paidAt: admin_1.admin.firestore.Timestamp.now(),
      boostStartsAt: admin_1.admin.firestore.Timestamp.now(),
      boostExpiresAt: admin_1.admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + boost.durationDays * 24 * 60 * 60 * 1000),
      ),
      // Status
      status: "paid",
      paymentMethod: "Cashfree",
      createdAt: admin_1.admin.firestore.Timestamp.now(),
      updatedAt: admin_1.admin.firestore.Timestamp.now(),
    };
    await admin_1.admin
      .firestore()
      .collection("invoices")
      .doc(invoiceId)
      .set(invoiceDoc);
    // Link invoice to boost
    await admin_1.admin
      .firestore()
      .collection("listingBoosts")
      .doc(boostId)
      .update({
        invoiceId,
      });
    v2_1.logger.info("Invoice generated", {
      invoiceId,
      boostId,
      orderId: boost.orderId,
    });
    return invoiceId;
  } catch (error) {
    v2_1.logger.error("Invoice generation failed", {
      boostId,
      error: error instanceof Error ? error.message : "Unknown",
    });
    // Non-blocking — invoice failure should not break payment flow
    return "";
  }
}
//# sourceMappingURL=verifyBoostPayment.js.map
