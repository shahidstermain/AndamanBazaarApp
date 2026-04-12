import {
  onCall,
  HttpsError,
  CallableRequest,
} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { Cashfree } from "cashfree-pg";

// Ensure Firebase is initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

export const createBookingOrder = onCall(async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated to create a booking order.",
    );
  }

  const uid = request.auth.uid;
  // Validate that request.data is a non-null object before destructuring
  if (!request.data || typeof request.data !== "object") {
    throw new HttpsError("invalid-argument", "Invalid request payload.");
  }

  const {
    listing_id,
    booking_date,
    guest_details,
    contact_number,
    special_requests,
  } = request.data;

  if (!listing_id || typeof listing_id !== "string") {
    throw new HttpsError(
      "invalid-argument",
      "listing_id must be a non-empty string.",
    );
  }
  if (!booking_date || typeof booking_date !== "string") {
    throw new HttpsError(
      "invalid-argument",
      "booking_date must be a non-empty string.",
    );
  }
  if (!Array.isArray(guest_details) || guest_details.length === 0) {
    throw new HttpsError(
      "invalid-argument",
      "guest_details must be a non-empty array.",
    );
  }
  for (const g of guest_details) {
    if (!g.tier_id || typeof g.tier_id !== "string") {
      throw new HttpsError(
        "invalid-argument",
        "Each guest entry must have a valid tier_id.",
      );
    }
    const count = Number(g.count);
    if (!Number.isInteger(count) || count <= 0) {
      throw new HttpsError(
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
    throw new HttpsError("not-found", "Experience listing not found");
  }

  const listing = listingDoc.data();
  if (!listing?.is_experience) {
    throw new HttpsError(
      "failed-precondition",
      "This listing is not an experience",
    );
  }

  const tiersSnapshot = await db
    .collection("pricing_tiers")
    .where("listing_id", "==", listing_id)
    .get();

  if (tiersSnapshot.empty) {
    throw new HttpsError(
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
  guest_details.forEach((g: any) => {
    const tier: any = tiers.find((t) => t.id === g.tier_id);
    if (!tier)
      throw new HttpsError("invalid-argument", "Invalid pricing tier ID");
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

  let bookingRef!: admin.firestore.DocumentReference;

  await db.runTransaction(async (transaction) => {
    // Re-read availability inside the transaction to avoid race conditions
    let currentSlots: number;
    if (availabilityRef) {
      const availDoc = await transaction.get(availabilityRef);
      currentSlots = availDoc.exists
        ? availDoc.data()?.slots_available || 0
        : 0;
    } else {
      currentSlots = listing?.inventory_per_slot || 0;
    }

    const totalGuests = guest_details.reduce(
      (sum: number, g: any) => sum + (g.count || 0),
      0,
    );
    if (currentSlots < totalGuests) {
      throw new HttpsError(
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
  (Cashfree as any).XClientId = process.env.CASHFREE_APP_ID || "";
  (Cashfree as any).XClientSecret = process.env.CASHFREE_SECRET_KEY || "";
  (Cashfree as any).XEnvironment =
    process.env.CASHFREE_ENV === "production"
      ? (Cashfree as any).Environment.PRODUCTION
      : (Cashfree as any).Environment.SANDBOX;

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

  let cashfreeData: any;
  try {
    const response = await (Cashfree as any).PGCreateOrder(
      "2023-08-01",
      cashfreePayload as any,
    );
    cashfreeData = response.data;
  } catch (error: any) {
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

    throw new HttpsError(
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
