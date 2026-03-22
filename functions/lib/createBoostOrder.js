"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBoostOrder = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const cashfree_pg_1 = require("cashfree-pg");
// Ensure Firebase is initialized
if (!admin.apps.length) {
    admin.initializeApp();
}
const TIERS = {
    spark: { amount_inr: 49, duration_days: 3, label: "Spark ⚡" },
    boost: { amount_inr: 99, duration_days: 7, label: "Boost 🚀" },
    power: { amount_inr: 199, duration_days: 30, label: "Power 💎" },
};
exports.createBoostOrder = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated to create a boost order.");
    }
    const uid = request.auth.uid;
    const { listing_id, tier: tierKey } = request.data;
    if (!listing_id || !tierKey) {
        throw new https_1.HttpsError("invalid-argument", "listing_id and tier are required.");
    }
    const tier = TIERS[tierKey];
    if (!tier) {
        throw new https_1.HttpsError("invalid-argument", "Invalid tier. Choose: spark, boost, or power.");
    }
    const db = admin.firestore();
    // 1. Verify listing ownership
    const listingRef = db.collection("listings").doc(listing_id);
    const listingDoc = await listingRef.get();
    if (!listingDoc.exists) {
        throw new https_1.HttpsError("not-found", "Listing not found.");
    }
    const listing = listingDoc.data();
    if (listing?.user_id !== uid) {
        throw new https_1.HttpsError("permission-denied", "You can only boost your own listings.");
    }
    if (listing?.status !== "active") {
        throw new https_1.HttpsError("failed-precondition", "Only active listings can be boosted.");
    }
    // 2. Check for existing pending boost
    const userDoc = await db.collection("profiles").doc(uid).get();
    const user = userDoc.data();
    const existingBoostsSnapshot = await db.collection("listing_boosts")
        .where("listing_id", "==", listing_id)
        .where("status", "==", "pending")
        .limit(1)
        .get();
    if (!existingBoostsSnapshot.empty) {
        // Expire old ones to avoid duplicates or issues
        const oldBoost = existingBoostsSnapshot.docs[0];
        await oldBoost.ref.update({ status: "failed", updated_at: new Date().toISOString() });
    }
    // 3. Generate a unique order ID
    const orderId = `AB_BOOST_${listing_id.substring(0, 8)}_${Date.now()}`;
    // 4. Create listing_boosts record
    const boostData = {
        listing_id,
        user_id: uid,
        tier: tierKey,
        amount_inr: tier.amount_inr,
        duration_days: tier.duration_days,
        status: "pending",
        cashfree_order_id: orderId,
        payment_method: "upi",
        created_at: new Date().toISOString()
    };
    const boostDocRef = await db.collection("listing_boosts").add(boostData);
    // 5. Initialize Cashfree
    cashfree_pg_1.Cashfree.XClientId = process.env.CASHFREE_APP_ID || "";
    cashfree_pg_1.Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY || "";
    cashfree_pg_1.Cashfree.XEnvironment = process.env.CASHFREE_ENV === "production"
        ? cashfree_pg_1.Cashfree.Environment.PRODUCTION
        : cashfree_pg_1.Cashfree.Environment.SANDBOX;
    // 6. Create Cashfree Order
    const APP_URL = process.env.FRONTEND_ORIGIN || "https://www.andamanbazaar.in";
    const returnUrl = `${APP_URL}/boost-success?order_id=${orderId}&boost_id=${boostDocRef.id}`;
    const webhookUrl = `${process.env.FUNCTIONS_WEBHOOK_URL || "https://us-central1-" + process.env.GCLOUD_PROJECT + ".cloudfunctions.net/cashfreeWebhook"}`;
    const customerPhone = user?.phone || "9999999999";
    const cashfreePayload = {
        order_id: orderId,
        order_amount: tier.amount_inr,
        order_currency: "INR",
        customer_details: {
            customer_id: uid.substring(0, 50),
            customer_name: user?.name || "AndamanBazaar User",
            customer_email: user?.email || "user@andamanbazaar.in",
            customer_phone: customerPhone,
        },
        order_meta: {
            return_url: returnUrl,
            notify_url: webhookUrl,
            payment_methods: "upi",
        },
        order_note: `${tier.label} boost for "${listing?.title}"`,
        order_tags: {
            listing_id,
            boost_id: boostDocRef.id,
            tier: tierKey,
        },
    };
    let cashfreeData;
    try {
        const response = await cashfree_pg_1.Cashfree.PGCreateOrder("2023-08-01", cashfreePayload);
        cashfreeData = response.data;
    }
    catch (error) {
        console.error("Cashfree order creation failed:", error.response?.data || error);
        // Mark the boost as failed
        await boostDocRef.update({ status: "failed", updated_at: new Date().toISOString() });
        throw new https_1.HttpsError("internal", "Payment gateway error. Please try again.");
    }
    // 8. Update boost record with payment session ID
    await boostDocRef.update({
        cashfree_payment_id: cashfreeData.cf_order_id?.toString(),
        updated_at: new Date().toISOString(),
    });
    // 9. Audit log
    await db.collection("payment_audit_log").add({
        boost_id: boostDocRef.id,
        event_type: "order_created",
        cashfree_order_id: orderId,
        raw_payload: cashfreeData,
        created_at: admin.firestore.FieldValue.serverTimestamp()
    });
    // 10. Return payment link to frontend
    return {
        success: true,
        boost_id: boostDocRef.id,
        order_id: orderId,
        payment_session_id: cashfreeData.payment_session_id,
        payment_link: cashfreeData.payment_link,
        cf_order_id: cashfreeData.cf_order_id,
        tier: tier,
    };
});
//# sourceMappingURL=createBoostOrder.js.map