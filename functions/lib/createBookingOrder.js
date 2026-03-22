"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBookingOrder = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const cashfree_pg_1 = require("cashfree-pg");
// Ensure Firebase is initialized
if (!admin.apps.length) {
    admin.initializeApp();
}
exports.createBookingOrder = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated to create a booking order.");
    }
    const uid = request.auth.uid;
    const { listing_id, booking_date, guest_details, contact_number, special_requests } = request.data;
    if (!listing_id || !booking_date || !guest_details) {
        throw new https_1.HttpsError("invalid-argument", "Missing required booking fields");
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
        throw new https_1.HttpsError("failed-precondition", "This listing is not an experience");
    }
    const tiersSnapshot = await db.collection("pricing_tiers")
        .where("listing_id", "==", listing_id)
        .get();
    if (tiersSnapshot.empty) {
        throw new https_1.HttpsError("not-found", "No pricing tiers found for this experience");
    }
    const tiers = tiersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const availabilitySnapshot = await db.collection("experience_availability")
        .where("listing_id", "==", listing_id)
        .where("slot_date", "==", booking_date)
        .limit(1)
        .get();
    // 2. Validate Availability
    const totalGuests = guest_details.reduce((sum, g) => sum + (g.count || 0), 0);
    const slotsAvailable = availabilitySnapshot.empty
        ? (listing.inventory_per_slot || 0)
        : (availabilitySnapshot.docs[0].data().slots_available || 0);
    if (slotsAvailable < totalGuests) {
        throw new https_1.HttpsError("failed-precondition", `Only ${slotsAvailable} slots available for this date.`);
    }
    // 3. Calculate Total & Advance (15%)
    let totalAmount = 0;
    guest_details.forEach((g) => {
        const tier = tiers.find(t => t.id === g.tier_id);
        if (!tier)
            throw new https_1.HttpsError("invalid-argument", "Invalid pricing tier ID");
        totalAmount += (tier.price || 0) * (g.count || 0);
    });
    const advanceAmount = Math.round(totalAmount * 0.15); // 15% Marketplace Advance
    const commissionAmount = advanceAmount; // Since the advance IS the commission in this model
    // 4. Create Pending Booking
    const orderId = `AB_BOOK_${listing_id.substring(0, 8)}_${Date.now()}`;
    const userDoc = await db.collection("profiles").doc(uid).get();
    const user = userDoc.data();
    const bookingData = {
        user_id: uid,
        listing_id,
        booking_date,
        booking_status: "pending",
        total_amount: totalAmount,
        advance_amount: advanceAmount,
        commission_amount: commissionAmount,
        cashfree_order_id: orderId,
        guest_details,
        contact_number: contact_number || null,
        special_requests: special_requests || null,
        created_at: new Date().toISOString()
    };
    const bookingRef = await db.collection("bookings").add(bookingData);
    // 5. Initialize Cashfree
    cashfree_pg_1.Cashfree.XClientId = process.env.CASHFREE_APP_ID || "";
    cashfree_pg_1.Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY || "";
    cashfree_pg_1.Cashfree.XEnvironment = process.env.CASHFREE_ENV === "production"
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
        const response = await cashfree_pg_1.Cashfree.PGCreateOrder("2023-08-01", cashfreePayload);
        cashfreeData = response.data;
    }
    catch (error) {
        console.error("Cashfree order creation failed:", error.response?.data || error);
        // Mark the booking as failed
        await bookingRef.update({
            booking_status: "failed",
            payment_status: "failed",
            updated_at: new Date().toISOString()
        });
        throw new https_1.HttpsError("internal", "Payment gateway error. Please try again.");
    }
    // 8. Update booking record with payment session ID
    await bookingRef.update({
        cashfree_payment_id: cashfreeData.cf_order_id?.toString(),
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