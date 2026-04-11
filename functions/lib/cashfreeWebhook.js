"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cashfreeWebhook = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const cashfree_pg_1 = require("cashfree-pg");
const generateInvoice_1 = require("./generateInvoice");
const sendInvoiceEmail_1 = require("./sendInvoiceEmail");
// Ensure Firebase is initialized
if (!admin.apps.length) {
    admin.initializeApp();
}
// Cashfree needs to be configured dynamically inside the function
// to ensure environment variables are available when it runs.
const corsHeaders = {
    "Access-Control-Allow-Origin": process.env.FRONTEND_ORIGIN || "https://www.andamanbazaar.in",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-signature, x-webhook-timestamp, x-webhook-id",
};
exports.cashfreeWebhook = (0, https_1.onRequest)(async (req, res) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        res.set(corsHeaders);
        res.status(200).send("ok");
        return;
    }
    // Set default response headers
    res.set(corsHeaders);
    // Only accept POST
    if (req.method !== "POST") {
        res.status(405).send("Method not allowed");
        return;
    }
    const db = admin.firestore();
    // Ensure Cashfree environment is fresh
    cashfree_pg_1.Cashfree.XClientId = process.env.CASHFREE_APP_ID || '';
    cashfree_pg_1.Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY || '';
    cashfree_pg_1.Cashfree.XEnvironment = process.env.CASHFREE_ENV === "production"
        ? cashfree_pg_1.Cashfree.Environment.PRODUCTION
        : cashfree_pg_1.Cashfree.Environment.SANDBOX;
    try {
        // rawBody is provided by Express (which Firebase uses)
        const rawBody = req.rawBody?.toString("utf8") || JSON.stringify(req.body);
        const timestamp = req.get("x-webhook-timestamp") || "";
        const signature = req.get("x-webhook-signature") || "";
        // 1. Verify webhook signature
        try {
            cashfree_pg_1.Cashfree.PGVerifyWebhookSignature(signature, rawBody, timestamp);
        }
        catch (err) {
            console.warn("Invalid webhook signature received:", err);
            // Still log the attempt for debugging
            await db.collection("payment_audit_log").add({
                event_type: "webhook_signature_invalid",
                raw_payload: { body: rawBody.substring(0, 500), timestamp },
                created_at: admin.firestore.FieldValue.serverTimestamp()
            });
            res.status(401).json({ error: "Invalid signature" });
            return;
        }
        // 2. Parse the payload
        const payload = req.body;
        const eventType = payload.type;
        const orderData = payload.data?.order;
        const paymentData = payload.data?.payment;
        console.log(`Webhook received: ${eventType}`, {
            order_id: orderData?.order_id,
            order_status: orderData?.order_status,
        });
        // 3. Audit log every webhook
        await db.collection("payment_audit_log").add({
            event_type: `webhook_${eventType}`,
            cashfree_order_id: orderData?.order_id || null,
            raw_payload: payload,
            created_at: admin.firestore.FieldValue.serverTimestamp()
        });
        // 4. Only process PAYMENT_SUCCESS_WEBHOOK
        if (eventType === "PAYMENT_SUCCESS_WEBHOOK" && orderData?.order_status === "PAID") {
            const orderId = orderData.order_id;
            if (!orderId) {
                console.error("No order_id in webhook payload");
                res.status(400).json({ error: "Missing order_id" });
                return;
            }
            // 5. Find the boost record (Assume "listing_boosts" has been ported to Firestore)
            // We will query listing_boosts by cashfree_order_id
            const boostsQuery = await db.collection("listing_boosts")
                .where("cashfree_order_id", "==", orderId)
                .limit(1)
                .get();
            // Wait, is there a create_booking_order too? What if order ID belongs to a booking?
            // Supabase Edge Function previously only updated "listing_boosts".
            // We'll mimic the exact behavior first, or check both collections.
            // Let's assume orderId prefix tells us if it's booking vs boost, or check both.
            const isBoost = !boostsQuery.empty;
            let bookingQuery;
            let isBooking = false;
            if (!isBoost) {
                bookingQuery = await db.collection("bookings")
                    .where("cashfree_order_id", "==", orderId)
                    .limit(1)
                    .get();
                isBooking = !bookingQuery.empty;
            }
            if (!isBoost && !isBooking) {
                console.error("Order record not found for:", orderId);
                res.status(404).json({ error: "Order record not found" });
                return;
            }
            if (isBoost) {
                const boostDoc = boostsQuery.docs[0];
                const boost = boostDoc.data();
                // 6. Prevent double-processing (idempotency)
                if (boost.status === "paid") {
                    console.log("Boost already marked as paid, skipping:", boostDoc.id);
                    res.status(200).json({ message: "Already processed" });
                    return;
                }
                // 7. Calculate featured dates
                const now = new Date();
                const featuredUntil = new Date(now.getTime() + (boost.duration_days || 0) * 24 * 60 * 60 * 1000);
                // 8. Update listing_boosts: mark as paid
                await boostDoc.ref.update({
                    status: "paid",
                    cashfree_payment_id: paymentData?.cf_payment_id?.toString() || null,
                    featured_from: now.toISOString(),
                    featured_until: featuredUntil.toISOString(),
                    updated_at: now.toISOString(),
                });
                // 9. Update listing: set is_featured, featured_until, and featured_tier
                if (boost.listing_id) {
                    await db.collection("listings").doc(boost.listing_id).update({
                        is_featured: true,
                        featured_until: featuredUntil.toISOString(),
                        featured_tier: boost.tier,
                        updated_at: now.toISOString(),
                    });
                }
                // 10. Audit log: payment confirmed
                await db.collection("payment_audit_log").add({
                    boost_id: boostDoc.id,
                    event_type: "payment_confirmed",
                    cashfree_order_id: orderId,
                    raw_payload: {
                        tier: boost.tier,
                        amount: boost.amount_inr,
                        listing_id: boost.listing_id,
                        featured_from: now.toISOString(),
                        featured_until: featuredUntil.toISOString(),
                        payment_method: paymentData?.payment_group || "upi",
                    },
                    created_at: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log(`✅ Boost activated: listing ${boost.listing_id}, tier ${boost.tier}, until ${featuredUntil.toISOString()}`);
                // 11. Generate invoice and send email 
                try {
                    const invoiceResult = await (0, generateInvoice_1.processInvoiceGeneration)(boostDoc.id);
                    if (invoiceResult.success && invoiceResult.invoice_id) {
                        await (0, sendInvoiceEmail_1.processSendInvoiceEmail)(invoiceResult.invoice_id);
                    }
                }
                catch (invoiceError) {
                    console.error("Failed to process invoice via helpers:", invoiceError);
                    // Don't fail the webhook if invoice fails
                }
                res.status(200).json({ success: true, message: "Boost activated" });
                return;
            }
            if (isBooking) {
                // Need to handle booking (create-booking-order processing)
                const bookingDoc = bookingQuery.docs[0];
                const booking = bookingDoc.data();
                if (booking.booking_status === "confirmed") {
                    res.status(200).json({ message: "Already processed" });
                    return;
                }
                await bookingDoc.ref.update({
                    booking_status: "confirmed",
                    status: "confirmed",
                    payment_status: "paid",
                    cashfree_payment_id: paymentData?.cf_payment_id?.toString() || null,
                    updated_at: new Date().toISOString()
                });
                // Audit log
                await db.collection("payment_audit_log").add({
                    booking_id: bookingDoc.id,
                    event_type: "booking_payment_confirmed",
                    cashfree_order_id: orderId,
                    raw_payload: { amount: booking.total_amount, listing_id: booking.listing_id },
                    created_at: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log(`✅ Booking confirmed: ${bookingDoc.id}`);
                res.status(200).json({ success: true, message: "Booking confirmed" });
                return;
            }
        }
        // 5b. Handle PAYMENT_FAILED_WEBHOOK
        if (eventType === "PAYMENT_FAILED_WEBHOOK" ||
            (eventType === "PAYMENT_SUCCESS_WEBHOOK" && orderData?.order_status !== "PAID")) {
            const orderId = orderData?.order_id;
            if (orderId) {
                // Find boost and update
                const boostsQuery = await db.collection("listing_boosts").where("cashfree_order_id", "==", orderId).where("status", "==", "pending").limit(1).get();
                if (!boostsQuery.empty) {
                    await boostsQuery.docs[0].ref.update({ status: "failed", updated_at: new Date().toISOString() });
                }
                // Find booking and update
                const bookingQuery = await db.collection("bookings").where("cashfree_order_id", "==", orderId).where("booking_status", "==", "pending").limit(1).get();
                if (!bookingQuery.empty) {
                    await bookingQuery.docs[0].ref.update({ booking_status: "failed", status: "failed", payment_status: "failed", updated_at: new Date().toISOString() });
                }
                console.log(`❌ Payment failed for order: ${orderId}`);
            }
            res.status(200).json({ message: "Payment failure acknowledged" });
            return;
        }
        // 6. Unknown event type
        console.log(`Unhandled webhook event type: ${eventType}`);
        res.status(200).json({ message: "Event acknowledged" });
        return;
    }
    catch (err) {
        console.error("Webhook processing error:", err);
        res.status(500).json({ error: "Internal server error" });
        return;
    }
});
//# sourceMappingURL=cashfreeWebhook.js.map