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
exports.createBoostOrder = void 0;
const functions = __importStar(require("firebase-functions"));
const v2_1 = require("firebase-functions/v2");
const cashfreeClient_1 = require("../utils/cashfreeClient");
const admin_1 = require("../utils/admin");
const secrets_1 = require("../utils/secrets");
const paymentsRuntime = functions.runWith({
  secrets: secrets_1.CASHFREE_SECRET_BINDINGS,
});
const BOOST_TIERS = {
  spark: {
    key: "spark",
    name: "Spark",
    durationDays: 3,
    priceInr: 49,
    pricePaise: 4900,
  },
  boost: {
    key: "boost",
    name: "Boost",
    durationDays: 7,
    priceInr: 99,
    pricePaise: 9900,
  },
  power: {
    key: "power",
    name: "Power",
    durationDays: 30,
    priceInr: 199,
    pricePaise: 19900,
  },
};
/**
 * Creates a boost order for a listing.
 *
 * Security:
 * - Auth required (Firebase ID token)
 * - Price is resolved server-side from tier key — never trusted from client
 * - Listing ownership validated
 * - Duplicate boost prevention (no active boost for same listing+tier)
 * - All Cashfree secrets server-side only
 */
exports.createBoostOrder = paymentsRuntime.https.onRequest(async (req, res) => {
  // CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  // ── Auth ──────────────────────────────────────────────────
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }
  let uid;
  let email;
  try {
    const token = authHeader.split("Bearer ")[1];
    const decoded = await admin_1.admin.auth().verifyIdToken(token);
    uid = decoded.uid;
    email = decoded.email || "";
  } catch (err) {
    v2_1.logger.warn("Invalid auth token on createBoostOrder", err);
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  try {
    const { listing_id, tier } = req.body;
    // ── Input validation ────────────────────────────────────
    if (!listing_id || typeof listing_id !== "string") {
      res.status(400).json({ error: "listing_id is required" });
      return;
    }
    if (!tier || !BOOST_TIERS[tier]) {
      res.status(400).json({
        error: `Invalid tier. Must be one of: ${Object.keys(BOOST_TIERS).join(", ")}`,
      });
      return;
    }
    const tierConfig = BOOST_TIERS[tier];
    // ── Validate listing ────────────────────────────────────
    const listingDoc = await admin_1.admin
      .firestore()
      .collection("listings")
      .doc(listing_id)
      .get();
    if (!listingDoc.exists) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const listing = listingDoc.data();
    // Only listing owner can boost
    if (listing.userId !== uid) {
      v2_1.logger.warn("Non-owner attempted to boost listing", {
        uid,
        listingOwner: listing.userId,
        listing_id,
      });
      res
        .status(403)
        .json({ error: "Only the listing owner can boost this listing" });
      return;
    }
    // Listing must be active
    if (listing.status !== "active") {
      res.status(400).json({ error: "Only active listings can be boosted" });
      return;
    }
    // ── Anti-abuse: rate limit (max 5 orders per hour per user) ─
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentOrdersSnap = await admin_1.admin
      .firestore()
      .collection("listingBoosts")
      .where("userId", "==", uid)
      .where(
        "createdAt",
        ">=",
        admin_1.admin.firestore.Timestamp.fromDate(oneHourAgo),
      )
      .get();
    if (recentOrdersSnap.size >= 5) {
      v2_1.logger.warn("Rate limit hit on boost orders", {
        uid,
        count: recentOrdersSnap.size,
      });
      res.status(429).json({
        error: "Too many boost attempts. Please try again in an hour.",
      });
      return;
    }
    // ── Anti-abuse: max 3 active boosts per user globally ────
    const activeBoostsGlobalSnap = await admin_1.admin
      .firestore()
      .collection("listingBoosts")
      .where("userId", "==", uid)
      .where("status", "==", "paid")
      .where("boostExpiresAt", ">", admin_1.admin.firestore.Timestamp.now())
      .get();
    if (activeBoostsGlobalSnap.size >= 3) {
      res.status(400).json({
        error:
          "You can have at most 3 active boosts at a time. Wait for one to expire.",
      });
      return;
    }
    // ── Anti-abuse: 24h cooldown after failed/expired boost ──
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentFailedSnap = await admin_1.admin
      .firestore()
      .collection("listingBoosts")
      .where("listingId", "==", listing_id)
      .where("userId", "==", uid)
      .where("status", "in", ["failed", "expired"])
      .where(
        "updatedAt",
        ">=",
        admin_1.admin.firestore.Timestamp.fromDate(oneDayAgo),
      )
      .limit(1)
      .get();
    if (!recentFailedSnap.empty) {
      res.status(400).json({
        error:
          "Please wait 24 hours after a failed/expired boost before trying again on this listing.",
      });
      return;
    }
    // ── Duplicate boost check ───────────────────────────────
    const existingBoostSnap = await admin_1.admin
      .firestore()
      .collection("listingBoosts")
      .where("listingId", "==", listing_id)
      .where("userId", "==", uid)
      .where("status", "==", "pending")
      .limit(1)
      .get();
    if (!existingBoostSnap.empty) {
      const existing = existingBoostSnap.docs[0].data();
      v2_1.logger.info("Returning existing pending boost order", {
        boostId: existing.boostId,
      });
      res.status(200).json({
        success: true,
        order_id: existing.orderId,
        payment_session_id: existing.paymentSessionId,
        payment_link: existing.paymentLink || null,
        amount: existing.amount,
        currency: existing.currency,
        existing: true,
      });
      return;
    }
    // ── Also check for currently-active boost ───────────────
    const activeBoostSnap = await admin_1.admin
      .firestore()
      .collection("listingBoosts")
      .where("listingId", "==", listing_id)
      .where("status", "==", "paid")
      .where("boostExpiresAt", ">", admin_1.admin.firestore.Timestamp.now())
      .limit(1)
      .get();
    if (!activeBoostSnap.empty) {
      res.status(409).json({
        error:
          "This listing already has an active boost. Wait until it expires or choose a different listing.",
      });
      return;
    }
    // ── Generate order ID ───────────────────────────────────
    const orderId =
      `BOOST_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
    const boostId = admin_1.admin
      .firestore()
      .collection("listingBoosts")
      .doc().id;
    // ── Build return URL ────────────────────────────────────
    const frontendUrl = process.env.FRONTEND_URL || "https://andamanbazaar.in";
    const returnUrl = `${frontendUrl}/boost-success?order_id=${orderId}`;
    const functionsUrl =
      process.env.FUNCTIONS_URL ||
      `https://us-central1-${process.env.GCLOUD_PROJECT}.cloudfunctions.net`;
    const notifyUrl = `${functionsUrl}/cashfreeWebhookV2`;
    // ── Create Cashfree order (amount in INR, not paise) ────
    const cashfreeReq = {
      orderId,
      orderAmount: tierConfig.priceInr,
      orderCurrency: "INR",
      customerDetails: {
        customerId: uid,
        customerEmail: email,
      },
      orderNotes: `Boost (${tierConfig.name}) for listing "${listing.title}"`,
      orderMeta: {
        return_url: returnUrl,
        notify_url: notifyUrl,
        payment_methods: "upi,netbanking,card,wallet",
      },
    };
    const cfResponse = await (0, cashfreeClient_1.createCashfreeOrder)(
      cashfreeReq,
    );
    // ── Persist to Firestore ────────────────────────────────
    const boostDoc = {
      boostId,
      orderId: cfResponse.orderId,
      cashfreeOrderId: cfResponse.cfOrderId,
      listingId: listing_id,
      userId: uid,
      tier,
      tierName: tierConfig.name,
      durationDays: tierConfig.durationDays,
      amount: tierConfig.priceInr,
      amountPaise: tierConfig.pricePaise,
      currency: "INR",
      status: "pending",
      paymentSessionId: cfResponse.paymentSessionId,
      customerEmail: email,
      createdAt: admin_1.admin.firestore.Timestamp.now(),
      updatedAt: admin_1.admin.firestore.Timestamp.now(),
    };
    await admin_1.admin
      .firestore()
      .collection("listingBoosts")
      .doc(boostId)
      .set(boostDoc);
    // ── Audit log ───────────────────────────────────────────
    await admin_1.admin.firestore().collection("paymentAuditLog").add({
      type: "BOOST_ORDER_CREATED",
      orderId: cfResponse.orderId,
      cashfreeOrderId: cfResponse.cfOrderId,
      boostId,
      listingId: listing_id,
      userId: uid,
      tier,
      amount: tierConfig.priceInr,
      currency: "INR",
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      timestamp: admin_1.admin.firestore.Timestamp.now(),
    });
    v2_1.logger.info("Boost order created", {
      boostId,
      orderId: cfResponse.orderId,
      listingId: listing_id,
      tier,
      amount: tierConfig.priceInr,
    });
    // ── Build payment link ──────────────────────────────────
    const cashfreeEnv = process.env.CASHFREE_ENV || "sandbox";
    const paymentBaseUrl =
      cashfreeEnv === "production"
        ? "https://payments.cashfree.com/pg/view/order"
        : "https://sandbox.cashfree.com/pg/view/order";
    const paymentLink = `${paymentBaseUrl}/${cfResponse.paymentSessionId}`;
    // Store payment link
    await admin_1.admin
      .firestore()
      .collection("listingBoosts")
      .doc(boostId)
      .update({ paymentLink });
    res.status(200).json({
      success: true,
      order_id: cfResponse.orderId,
      payment_session_id: cfResponse.paymentSessionId,
      payment_link: paymentLink,
      amount: tierConfig.priceInr,
      currency: "INR",
    });
  } catch (error) {
    v2_1.logger.error("createBoostOrder failed", {
      uid,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});
//# sourceMappingURL=createBoostOrder.js.map
