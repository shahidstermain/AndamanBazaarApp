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
exports.createBookingOrder = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const cashfree_pg_1 = require("cashfree-pg");
// Ensure Firebase is initialized
if (!admin.apps.length) {
  admin.initializeApp();
}
exports.createBookingOrder = (0, https_1.onCall)(async (request) => {
  if (!request.auth) {
    throw new https_1.HttpsError(
      "unauthenticated",
      "User must be authenticated to create a booking order.",
    );
  }
  const uid = request.auth.uid;
  // Validate that request.data is a non-null object before destructuring
  if (!request.data || typeof request.data !== "object") {
    throw new https_1.HttpsError(
      "invalid-argument",
      "Invalid request payload.",
    );
  }
  const {
    listing_id,
    booking_date,
    guest_details,
    contact_number,
    special_requests,
  } = request.data;
  if (!listing_id || typeof listing_id !== "string") {
    throw new https_1.HttpsError(
      "invalid-argument",
      "listing_id must be a non-empty string.",
    );
  }
  if (!booking_date || typeof booking_date !== "string") {
    throw new https_1.HttpsError(
      "invalid-argument",
      "booking_date must be a non-empty string.",
    );
  }
  if (!Array.isArray(guest_details) || guest_details.length === 0) {
    throw new https_1.HttpsError(
      "invalid-argument",
      "guest_details must be a non-empty array.",
    );
  }
  for (const g of guest_details) {
    if (!g.tier_id || typeof g.tier_id !== "string") {
      throw new https_1.HttpsError(
        "invalid-argument",
        "Each guest entry must have a valid tier_id.",
      );
    }
    const count = Number(g.count);
    if (!Number.isInteger(count) || count <= 0) {
      throw new https_1.HttpsError(
        "invalid-argument",
        "Each guest entry count must be a positive integer.",
      );
    }
  }
  const db = admin.firestore();
  // 1. Fetch Listing & Tiers & Availability
  const listingRef = db.collection("listings").doc(listing_id);
  const listingDoc = await listingRef.get();
  if (!listingDoc.exists) {
    throw new https_1.HttpsError("not-found", "Experience listing not found");
  }
  const listing = listingDoc.data();
  if (!listing?.is_experience) {
    throw new https_1.HttpsError(
      "failed-precondition",
      "This listing is not an experience",
    );
  }
  const tiersSnapshot = await db
    .collection("pricing_tiers")
    .where("listing_id", "==", listing_id)
    .get();
  if (tiersSnapshot.empty) {
    throw new https_1.HttpsError(
      "not-found",
      "No pricing tiers found for this experience",
    );
  }
  const tiers = tiersSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  const availabilitySnapshot = await db
    .collection("experience_availability")
    .where("listing_id", "==", listing_id)
    .where("slot_date", "==", booking_date)
    .limit(1)
    .get();
  // 3. Calculate Total & Advance (15%)
  let totalAmount = 0;
  guest_details.forEach((g) => {
    const tier = tiers.find((t) => t.id === g.tier_id);
    if (!tier)
      throw new https_1.HttpsError(
        "invalid-argument",
        "Invalid pricing tier ID",
      );
    totalAmount += (tier.price || 0) * (g.count || 0);
  });
  const advanceAmount = Math.round(totalAmount * 0.15); // 15% Marketplace Advance
  const commissionAmount = advanceAmount; // Since the advance IS the commission in this model
  // 4. Create Pending Booking atomically (reserve slots in the same transaction)
  const orderId = `AB_BOOK_${listing_id.substring(0, 8)}_${Date.now()}`;
  const userDoc = await db.collection("profiles").doc(uid).get();
  const user = userDoc.data();
  const availabilityRef = availabilitySnapshot.empty
    ? null
    : availabilitySnapshot.docs[0].ref;
  let bookingRef;
  await db.runTransaction(async (transaction) => {
    // Re-read availability inside the transaction to avoid race conditions
    let currentSlots;
    if (availabilityRef) {
      const availDoc = await transaction.get(availabilityRef);
      currentSlots = availDoc.exists
        ? availDoc.data()?.slots_available || 0
        : 0;
    } else {
      currentSlots = listing?.inventory_per_slot || 0;
    }
    const totalGuests = guest_details.reduce(
      (sum, g) => sum + (g.count || 0),
      0,
    );
    if (currentSlots < totalGuests) {
      throw new https_1.HttpsError(
        "failed-precondition",
        `Only ${currentSlots} slots available for this date.`,
      );
    }
    const newBookingRef = db.collection("bookings").doc();
    bookingRef = newBookingRef;
    const bookingData = {
      user_id: uid,
      listing_id,
      booking_date,
      booking_status: "pending",
      status: "pending",
      total_amount: totalAmount,
      advance_amount: advanceAmount,
      commission_amount: commissionAmount,
      cashfree_order_id: orderId,
      guest_details,
      contact_number: contact_number || null,
      special_requests: special_requests || null,
      created_at: new Date().toISOString(),
    };
    transaction.set(newBookingRef, bookingData);
    // Atomically decrement slots_available
    if (availabilityRef) {
      transaction.update(availabilityRef, {
        slots_available: currentSlots - totalGuests,
        updated_at: new Date().toISOString(),
      });
    }
  });
  // 5. Initialize Cashfree
  cashfree_pg_1.Cashfree.XClientId = process.env.CASHFREE_APP_ID || "";
  cashfree_pg_1.Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY || "";
  cashfree_pg_1.Cashfree.XEnvironment =
    process.env.CASHFREE_ENV === "production"
      ? cashfree_pg_1.Cashfree.Environment.PRODUCTION
      : cashfree_pg_1.Cashfree.Environment.SANDBOX;
  // 6. Create Cashfree Order
  const APP_URL = process.env.FRONTEND_ORIGIN || "https://www.andamanbazaar.in";
  const returnUrl = `${APP_URL}/booking-success?booking_id=${bookingRef.id}`;
  const webhookUrl = `${process.env.FUNCTIONS_WEBHOOK_URL || "https://us-central1-" + process.env.GCLOUD_PROJECT + ".cloudfunctions.net/cashfreeWebhook"}`;
  const customerPhone = contact_number || user?.phone || "9999999999";
  const cashfreePayload = {
    order_id: orderId,
    order_amount: advanceAmount,
    order_currency: "INR",
    customer_details: {
      customer_id: uid.substring(0, 50),
      customer_name: user?.name || "Customer",
      customer_email: user?.email || "guest@andamanbazaar.in",
      customer_phone: customerPhone,
    },
    order_meta: {
      return_url: returnUrl,
      notify_url: webhookUrl,
      payment_methods: "upi,cc,dc,nb", // Full stack for bookings
    },
    order_note: `Booking Advance for "${listing?.title}" on ${booking_date}`,
    order_tags: {
      booking_id: bookingRef.id,
      listing_id: listing_id,
    },
  };
  let cashfreeData;
  try {
    const response = await cashfree_pg_1.Cashfree.PGCreateOrder(
      "2023-08-01",
      cashfreePayload,
    );
    cashfreeData = response.data;
  } catch (error) {
    console.error(
      "Cashfree order creation failed:",
      error.response?.data || error,
    );
    // Mark the booking as failed
    await bookingRef.update({
      booking_status: "failed",
      status: "failed",
      payment_status: "failed",
      updated_at: new Date().toISOString(),
    });
    throw new https_1.HttpsError(
      "internal",
      "Payment gateway error. Please try again.",
    );
  }
  // 8. Update booking record with payment session ID
  await bookingRef.update({
    cashfree_order_token: cashfreeData.cf_order_id?.toString(),
    payment_session_id: cashfreeData.payment_session_id?.toString(),
    updated_at: new Date().toISOString(),
  });
  // 9. Return payment link to frontend
  return {
    success: true,
    booking_id: bookingRef.id,
    order_id: orderId,
    payment_session_id: cashfreeData.payment_session_id,
    payment_link: cashfreeData.payment_link,
  };
});
//# sourceMappingURL=createBookingOrder.js.map
