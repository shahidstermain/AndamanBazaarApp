import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Cashfree } from "npm:cashfree-pg";

// ============================================================
// Edge Function: cashfree-webhook
// Receives Cashfree payment notifications, verifies signature,
// and activates the listing boost on successful payment.
// ============================================================

const CASHFREE_APP_ID = Deno.env.get("CASHFREE_APP_ID")!;
const CASHFREE_SECRET_KEY = Deno.env.get("CASHFREE_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;

// Initialize Cashfree SDK
const CASHFREE_ENV = Deno.env.get("CASHFREE_ENV") || "sandbox";
Cashfree.XClientId = CASHFREE_APP_ID;
Cashfree.XClientSecret = CASHFREE_SECRET_KEY;
Cashfree.XEnvironment = CASHFREE_ENV === "production"
    ? (Cashfree.Environment?.PRODUCTION || "PRODUCTION" as any)
    : (Cashfree.Environment?.SANDBOX || "SANDBOX" as any);

const corsHeaders = {
    "Access-Control-Allow-Origin": Deno.env.get("FRONTEND_ORIGIN") || "https://www.andamanbazaar.in",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, x-webhook-signature, x-webhook-timestamp, x-webhook-id",
};

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    // Only accept POST
    if (req.method !== "POST") {
        return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    try {
        const rawBody = await req.text();
        const timestamp = req.headers.get("x-webhook-timestamp") || "";
        const signature = req.headers.get("x-webhook-signature") || "";

        // Enforce timestamp freshness (5-minute replay window)
        const tsSeconds = Number(timestamp);
        const nowSeconds = Math.floor(Date.now() / 1000);
        if (!Number.isFinite(tsSeconds) || Math.abs(nowSeconds - tsSeconds) > 300) {
            await supabaseAdmin.from("payment_audit_log").insert({
                event_type: "webhook_timestamp_invalid",
                raw_payload: { body: rawBody.substring(0, 500), timestamp },
            });

            return new Response(
                JSON.stringify({ error: "Invalid or stale timestamp" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // 1. Verify webhook signature
        try {
            Cashfree.PGVerifyWebhookSignature(signature, rawBody, timestamp);
        } catch (err) {
            console.warn("Invalid webhook signature received:", err);

            // Still log the attempt for debugging
            await supabaseAdmin.from("payment_audit_log").insert({
                event_type: "webhook_signature_invalid",
                raw_payload: { body: rawBody.substring(0, 500), timestamp },
            });

            return new Response(
                JSON.stringify({ error: "Invalid signature" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // 2. Parse the payload
        const payload = JSON.parse(rawBody);
        const eventType = payload.type;
        const orderData = payload.data?.order;
        const paymentData = payload.data?.payment;

        console.log(`Webhook received: ${eventType}`, {
            order_id: orderData?.order_id,
            order_status: orderData?.order_status,
        });

        // 3. Audit log every webhook
        await supabaseAdmin.from("payment_audit_log").insert({
            event_type: `webhook_${eventType}`,
            cashfree_order_id: orderData?.order_id,
            raw_payload: payload,
        });

        // 4. Only process PAYMENT_SUCCESS_WEBHOOK
        if (eventType === "PAYMENT_SUCCESS_WEBHOOK" && orderData?.order_status === "PAID") {
            const orderId = orderData.order_id;

            if (!orderId) {
                console.error("No order_id in webhook payload");
                return new Response(
                    JSON.stringify({ error: "Missing order_id" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            // 5. Find the boost record
            const { data: boost, error: boostError } = await supabaseAdmin
                .from("listing_boosts")
                .select("*")
                .eq("cashfree_order_id", orderId)
                .single();

            if (boostError || !boost) {
                console.error("Boost record not found for order:", orderId, boostError);
                return new Response(
                    JSON.stringify({ error: "Boost record not found" }),
                    { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            // 6. Prevent double-processing (idempotency)
            if (boost.status === "paid") {
                console.log("Boost already marked as paid, skipping:", boost.id);
                return new Response(
                    JSON.stringify({ message: "Already processed" }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            // 7. Calculate featured dates
            const now = new Date();
            const featuredUntil = new Date(now.getTime() + boost.duration_days * 24 * 60 * 60 * 1000);

            // 8. Update listing_boosts: mark as paid
            const { error: updateBoostError } = await supabaseAdmin
                .from("listing_boosts")
                .update({
                    status: "paid",
                    cashfree_payment_id: paymentData?.cf_payment_id?.toString() || null,
                    featured_from: now.toISOString(),
                    featured_until: featuredUntil.toISOString(),
                    updated_at: now.toISOString(),
                })
                .eq("id", boost.id);

            if (updateBoostError) {
                console.error("Failed to update boost record:", updateBoostError);
                return new Response(
                    JSON.stringify({ error: "Failed to update boost" }),
                    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            // 9. Update listing: set is_featured, featured_until, and featured_tier
            const { error: updateListingError } = await supabaseAdmin
                .from("listings")
                .update({
                    is_featured: true,
                    featured_until: featuredUntil.toISOString(),
                    featured_tier: boost.tier,
                    updated_at: now.toISOString(),
                })
                .eq("id", boost.listing_id);

            if (updateListingError) {
                console.error("Failed to update listing:", updateListingError);
                return new Response(
                    JSON.stringify({ error: "Failed to feature listing" }),
                    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            // 10. Audit log: payment confirmed
            await supabaseAdmin.from("payment_audit_log").insert({
                boost_id: boost.id,
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
            });

            console.log(
                `✅ Boost activated: listing ${boost.listing_id}, tier ${boost.tier}, until ${featuredUntil.toISOString()}`
            );

            // 11. Generate invoice and send email (non-blocking)
            try {
                await fetch(`${SUPABASE_URL}/functions/v1/generate-invoice`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                    },
                    body: JSON.stringify({ boost_id: boost.id }),
                });
                console.log(`📄 Invoice generation triggered for boost ${boost.id}`);
            } catch (invoiceErr) {
                console.error("Invoice generation trigger failed (non-blocking):", invoiceErr);
            }

            return new Response(
                JSON.stringify({ success: true, message: "Boost activated" }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // 5b. Handle PAYMENT_FAILED_WEBHOOK
        if (
            eventType === "PAYMENT_FAILED_WEBHOOK" ||
            (eventType === "PAYMENT_SUCCESS_WEBHOOK" && orderData?.order_status !== "PAID")
        ) {
            const orderId = orderData?.order_id;

            if (orderId) {
                await supabaseAdmin
                    .from("listing_boosts")
                    .update({ status: "failed", updated_at: new Date().toISOString() })
                    .eq("cashfree_order_id", orderId)
                    .eq("status", "pending");

                console.log(`❌ Payment failed for order: ${orderId}`);
            }

            return new Response(
                JSON.stringify({ message: "Payment failure acknowledged" }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // 6. Unknown event type — acknowledge gracefully
        console.log(`Unhandled webhook event type: ${eventType}`);
        return new Response(
            JSON.stringify({ message: "Event acknowledged" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (err) {
        console.error("Webhook processing error:", err);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
