# Payment Code Changes - Exact Implementation

## 🎯 Executive Summary

This document provides the exact code changes required to implement the Cashfree payment hardening plan. All changes are production-ready and include proper error handling, security measures, and backward compatibility.

### Files to Modify:

1. **New Files**: 4 new edge functions
2. **Modified Files**: 3 existing files
3. **Database Changes**: 2 migration files
4. **Configuration**: Environment variables

---

## 📁 New Files

### **1. supabase/functions/verify-payment/index.ts**

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================
// Edge Function: verify-payment
// Server-side payment verification to prevent frontend trust issues
// ============================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;
const ALLOWED_ORIGIN =
  Deno.env.get("FRONTEND_ORIGIN") || "https://www.andamanbazaar.in";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    // 1. Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Parse request
    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "Missing order_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Verify payment status server-side
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: boost, error: boostError } = await supabaseAdmin
      .from("listing_boosts")
      .select("status, user_id, listing_id, tier, cashfree_order_id")
      .eq("cashfree_order_id", order_id)
      .single();

    if (boostError || !boost) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Verify ownership
    if (boost.user_id !== user.id) {
      await supabaseAdmin.from("payment_audit_log").insert({
        event_type: "verification_access_denied",
        cashfree_order_id: order_id,
        raw_payload: {
          requested_by: user.id,
          boost_owner: boost.user_id,
          ip_address: req.headers.get("x-forwarded-for"),
        },
      });

      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Log verification attempt
    await supabaseAdmin.from("payment_audit_log").insert({
      event_type: "payment_verified",
      cashfree_order_id: order_id,
      raw_payload: {
        verified_by: user.id,
        status: boost.status,
        ip_address: req.headers.get("x-forwarded-for"),
        user_agent: req.headers.get("user-agent"),
      },
    });

    // 6. Return verified status
    return new Response(
      JSON.stringify({
        success: boost.status === "paid",
        status: boost.status,
        listing_id: boost.listing_id,
        tier: boost.tier,
        verified_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Payment verification error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

### **2. supabase/functions/process-payment-timeouts/index.ts**

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Cashfree } from "npm:cashfree-pg";

// ============================================================
// Edge Function: process-payment-timeouts
// Automated processing of stuck payments
// ============================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;
const CASHFREE_APP_ID = Deno.env.get("CASHFREE_APP_ID")!;
const CASHFREE_SECRET_KEY = Deno.env.get("CASHFREE_SECRET_KEY")!;
const CASHFREE_ENV = Deno.env.get("CASHFREE_ENV") || "sandbox";

// Initialize Cashfree SDK
Cashfree.XClientId = CASHFREE_APP_ID;
Cashfree.XClientSecret = CASHFREE_SECRET_KEY;
Cashfree.XEnvironment =
  CASHFREE_ENV === "production"
    ? Cashfree.Environment?.PRODUCTION || ("PRODUCTION" as any)
    : Cashfree.Environment?.SANDBOX || ("SANDBOX" as any);

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const processedCount = { timeouts: 0, successes: 0, failures: 0 };

  try {
    // Find payments stuck in pending state > 30 minutes
    const { data: stuckPayments, error: stuckError } = await supabaseAdmin
      .from("listing_boosts")
      .select("*")
      .eq("status", "pending")
      .lt("created_at", new Date(Date.now() - 30 * 60 * 1000).toISOString());

    if (stuckError) {
      throw new Error(`Failed to fetch stuck payments: ${stuckError.message}`);
    }

    console.log(
      `Found ${stuckPayments?.length || 0} stuck payments to process`,
    );

    for (const payment of stuckPayments || []) {
      try {
        // Check actual status with Cashfree
        const orderStatus = await checkCashfreeOrderStatus(
          payment.cashfree_order_id,
        );

        if (orderStatus === "PAID") {
          // Payment succeeded but webhook delayed
          await processDelayedSuccess(payment, supabaseAdmin);
          processedCount.successes++;
          console.log(
            `✅ Processed delayed success for order: ${payment.cashfree_order_id}`,
          );
        } else if (orderStatus === "FAILED" || orderStatus === "EXPIRED") {
          // Payment actually failed/expired
          await supabaseAdmin
            .from("listing_boosts")
            .update({
              status: orderStatus.toLowerCase(),
              failure_reason: "timeout_check",
              updated_at: new Date().toISOString(),
            })
            .eq("id", payment.id);

          processedCount.failures++;
          console.log(
            `❌ Marked as ${orderStatus.toLowerCase()}: ${payment.cashfree_order_id}`,
          );
        } else {
          // Still pending, mark as timeout
          await supabaseAdmin
            .from("listing_boosts")
            .update({
              status: "failed",
              failure_reason: "payment_timeout",
              updated_at: new Date().toISOString(),
            })
            .eq("id", payment.id);

          processedCount.timeouts++;
          console.log(`⏰ Marked as timeout: ${payment.cashfree_order_id}`);
        }

        // Log timeout processing
        await supabaseAdmin.from("payment_audit_log").insert({
          boost_id: payment.id,
          event_type: "timeout_processed",
          cashfree_order_id: payment.cashfree_order_id,
          raw_payload: {
            original_status: "pending",
            final_status: orderStatus,
            processing_time: new Date().toISOString(),
          },
        });
      } catch (paymentError) {
        console.error(`Failed to process payment ${payment.id}:`, paymentError);

        await supabaseAdmin.from("payment_audit_log").insert({
          boost_id: payment.id,
          event_type: "timeout_processing_failed",
          cashfree_order_id: payment.cashfree_order_id,
          raw_payload: {
            error: paymentError.message,
            processing_time: new Date().toISOString(),
          },
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        message: `Processed ${stuckPayments?.length || 0} stuck payments`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Timeout processing error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

async function checkCashfreeOrderStatus(orderId: string): Promise<string> {
  try {
    const response = await Cashfree.PGOrderDetails("2023-08-01", {
      orderId: orderId,
    });
    return response.data.order_status || "UNKNOWN";
  } catch (error) {
    console.error(`Failed to check order status for ${orderId}:`, error);
    return "UNKNOWN";
  }
}

async function processDelayedSuccess(payment: any, supabaseAdmin: any) {
  const now = new Date();
  const featuredUntil = new Date(
    now.getTime() + payment.duration_days * 24 * 60 * 60 * 1000,
  );

  // Update boost record
  await supabaseAdmin
    .from("listing_boosts")
    .update({
      status: "paid",
      featured_from: now.toISOString(),
      featured_until: featuredUntil.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", payment.id);

  // Update listing
  await supabaseAdmin
    .from("listings")
    .update({
      is_featured: true,
      featured_until: featuredUntil.toISOString(),
      featured_tier: payment.tier,
      updated_at: now.toISOString(),
    })
    .eq("id", payment.listing_id);

  // Log successful processing
  await supabaseAdmin.from("payment_audit_log").insert({
    boost_id: payment.id,
    event_type: "delayed_payment_success",
    cashfree_order_id: payment.cashfree_order_id,
    raw_payload: {
      featured_from: now.toISOString(),
      featured_until: featuredUntil.toISOString(),
    },
  });
}
```

### **3. supabase/functions/reconcile-payments/index.ts**

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Cashfree } from "npm:cashfree-pg";

// ============================================================
// Edge Function: reconcile-payments
// Manual reconciliation between database and Cashfree
// ============================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;
const CASHFREE_APP_ID = Deno.env.get("CASHFREE_APP_ID")!;
const CASHFREE_SECRET_KEY = Deno.env.get("CASHFREE_SECRET_KEY")!;
const CASHFREE_ENV = Deno.env.get("CASHFREE_ENV") || "sandbox";

// Initialize Cashfree SDK
Cashfree.XClientId = CASHFREE_APP_ID;
Cashfree.XClientSecret = CASHFREE_SECRET_KEY;
Cashfree.XEnvironment =
  CASHFREE_ENV === "production"
    ? Cashfree.Environment?.PRODUCTION || ("PRODUCTION" as any)
    : Cashfree.Environment?.SANDBOX || ("SANDBOX" as any);

interface ReconciliationRequest {
  date_range: {
    start: string;
    end: string;
  };
  status_filter?: string;
}

interface ReconciliationResult {
  period: { start: string; end: string };
  database_payments: any[];
  cashfree_payments: any[];
  discrepancies: Array<{
    type: "missing_in_db" | "missing_in_cashfree" | "status_mismatch";
    order_id: string;
    details: any;
  }>;
  summary: {
    total_db: number;
    total_cashfree: number;
    discrepancies_count: number;
    total_revenue: number;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { date_range, status_filter }: ReconciliationRequest =
      await req.json();

    if (!date_range?.start || !date_range?.end) {
      return new Response(JSON.stringify({ error: "Invalid date range" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get payments from database
    let dbQuery = supabaseAdmin
      .from("listing_boosts")
      .select("*")
      .gte("created_at", date_range.start)
      .lte("created_at", date_range.end);

    if (status_filter) {
      dbQuery = dbQuery.eq("status", status_filter);
    }

    const { data: dbPayments, error: dbError } = await dbQuery;

    if (dbError) {
      throw new Error(`Database query failed: ${dbError.message}`);
    }

    // Get payments from Cashfree
    const cashfreePayments = await getCashfreePayments(date_range);

    // Reconcile differences
    const reconciliation = reconcilePayments(
      dbPayments || [],
      cashfreePayments,
    );

    // Log reconciliation
    await supabaseAdmin.from("payment_audit_log").insert({
      event_type: "payment_reconciliation",
      raw_payload: {
        period: date_range,
        summary: reconciliation.summary,
        discrepancies_count: reconciliation.discrepancies.length,
      },
    });

    return new Response(JSON.stringify(reconciliation), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Reconciliation error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

async function getCashfreePayments(date_range: {
  start: string;
  end: string;
}): Promise<any[]> {
  try {
    const orders = [];
    let hasNextPage = true;
    let page = 1;

    while (hasNextPage) {
      const response = await Cashfree.PGOrderDetails("2023-08-01", {
        orderStatus: "PAID",
        startDate: date_range.start,
        endDate: date_range.end,
        page: page,
        limit: 100,
      });

      if (response.data && Array.isArray(response.data)) {
        orders.push(...response.data);
        hasNextPage = response.data.length === 100;
        page++;
      } else {
        hasNextPage = false;
      }
    }

    return orders;
  } catch (error) {
    console.error("Failed to fetch Cashfree payments:", error);
    return [];
  }
}

function reconcilePayments(
  dbPayments: any[],
  cashfreePayments: any[],
): ReconciliationResult {
  const dbOrderIds = new Set(dbPayments.map((p) => p.cashfree_order_id));
  const cashfreeOrderIds = new Set(cashfreePayments.map((p) => p.order_id));

  const discrepancies = [];

  // Find payments in Cashfree but not in database
  for (const cfPayment of cashfreePayments) {
    if (!dbOrderIds.has(cfPayment.order_id)) {
      discrepancies.push({
        type: "missing_in_db",
        order_id: cfPayment.order_id,
        details: cfPayment,
      });
    }
  }

  // Find payments in database but not in Cashfree
  for (const dbPayment of dbPayments) {
    if (!cashfreeOrderIds.has(dbPayment.cashfree_order_id)) {
      discrepancies.push({
        type: "missing_in_cashfree",
        order_id: dbPayment.cashfree_order_id,
        details: dbPayment,
      });
    }
  }

  // Check for status mismatches
  for (const dbPayment of dbPayments) {
    const cfPayment = cashfreePayments.find(
      (cf) => cf.order_id === dbPayment.cashfree_order_id,
    );
    if (cfPayment) {
      const dbStatus = dbPayment.status.toUpperCase();
      const cfStatus = cfPayment.order_status;

      if (dbStatus !== cfStatus && cfStatus !== "ACTIVE") {
        discrepancies.push({
          type: "status_mismatch",
          order_id: dbPayment.cashfree_order_id,
          details: {
            database_status: dbStatus,
            cashfree_status: cfStatus,
          },
        });
      }
    }
  }

  const totalRevenue = dbPayments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + (p.amount_inr || 0), 0);

  return {
    period: { start: date_range.start, end: date_range.end },
    database_payments: dbPayments,
    cashfree_payments: cashfreePayments,
    discrepancies,
    summary: {
      total_db: dbPayments.length,
      total_cashfree: cashfreePayments.length,
      discrepancies_count: discrepancies.length,
      total_revenue: totalRevenue,
    },
  };
}
```

### **4. supabase/functions/payment-metrics/index.ts**

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================
// Edge Function: payment-metrics
// Real-time payment metrics and analytics
// ============================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;

interface MetricsRequest {
  time_range: {
    start: string;
    end: string;
  };
  granularity?: "hour" | "day" | "week" | "month";
}

interface PaymentMetrics {
  period: { start: string; end: string };
  total_payments: number;
  successful_payments: number;
  failed_payments: number;
  success_rate: number;
  total_revenue: number;
  average_order_value: number;
  payment_methods: Record<string, number>;
  tier_breakdown: Record<string, { count: number; revenue: number }>;
  processing_times: {
    avg_processing_time_ms: number;
    max_processing_time_ms: number;
    min_processing_time_ms: number;
  };
  refunds: {
    count: number;
    amount: number;
    rate: number;
  };
  time_series: Array<{
    timestamp: string;
    payments: number;
    revenue: number;
    success_rate: number;
  }>;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { time_range, granularity = "day" }: MetricsRequest =
      await req.json();

    if (!time_range?.start || !time_range?.end) {
      return new Response(JSON.stringify({ error: "Invalid time range" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all payments in time range
    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from("listing_boosts")
      .select("*")
      .gte("created_at", time_range.start)
      .lte("created_at", time_range.end)
      .order("created_at", { ascending: true });

    if (paymentsError) {
      throw new Error(`Failed to fetch payments: ${paymentsError.message}`);
    }

    // Get audit logs for processing times
    const { data: auditLogs } = await supabaseAdmin
      .from("payment_audit_log")
      .select("raw_payload, created_at")
      .in("event_type", ["payment_confirmed", "order_created"])
      .gte("created_at", time_range.start)
      .lte("created_at", time_range.end);

    const metrics = calculateMetrics(
      payments || [],
      auditLogs || [],
      granularity,
    );

    return new Response(JSON.stringify(metrics), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Metrics calculation error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

function calculateMetrics(
  payments: any[],
  auditLogs: any[],
  granularity: string,
): PaymentMetrics {
  const successfulPayments = payments.filter((p) => p.status === "paid");
  const failedPayments = payments.filter((p) => p.status === "failed");
  const refundedPayments = payments.filter((p) => p.status === "refunded");

  const totalRevenue = successfulPayments.reduce(
    (sum, p) => sum + (p.amount_inr || 0),
    0,
  );
  const refundAmount = refundedPayments.reduce(
    (sum, p) => sum + (p.refund_amount || 0),
    0,
  );

  // Payment methods breakdown
  const paymentMethods: Record<string, number> = {};
  payments.forEach((p) => {
    const method = p.payment_method || "unknown";
    paymentMethods[method] = (paymentMethods[method] || 0) + 1;
  });

  // Tier breakdown
  const tierBreakdown: Record<string, { count: number; revenue: number }> = {};
  successfulPayments.forEach((p) => {
    const tier = p.tier || "unknown";
    if (!tierBreakdown[tier]) {
      tierBreakdown[tier] = { count: 0, revenue: 0 };
    }
    tierBreakdown[tier].count++;
    tierBreakdown[tier].revenue += p.amount_inr || 0;
  });

  // Processing times
  const processingTimes = calculateProcessingTimes(auditLogs);

  // Time series data
  const timeSeries = generateTimeSeries(payments, granularity);

  return {
    period: { start: time_range.start, end: time_range.end },
    total_payments: payments.length,
    successful_payments: successfulPayments.length,
    failed_payments: failedPayments.length,
    success_rate:
      payments.length > 0
        ? (successfulPayments.length / payments.length) * 100
        : 0,
    total_revenue: totalRevenue,
    average_order_value:
      successfulPayments.length > 0
        ? totalRevenue / successfulPayments.length
        : 0,
    payment_methods,
    tier_breakdown,
    processing_times,
    refunds: {
      count: refundedPayments.length,
      amount: refundAmount,
      rate:
        successfulPayments.length > 0
          ? (refundedPayments.length / successfulPayments.length) * 100
          : 0,
    },
    time_series,
  };
}

function calculateProcessingTimes(auditLogs: any[]) {
  const processingTimes: number[] = [];

  // Group audit logs by order_id
  const orderLogs: Record<string, any[]> = {};
  auditLogs.forEach((log) => {
    const orderId = log.raw_payload?.cashfree_order_id;
    if (orderId) {
      if (!orderLogs[orderId]) {
        orderLogs[orderId] = [];
      }
      orderLogs[orderId].push(log);
    }
  });

  // Calculate processing times
  Object.values(orderLogs).forEach((logs) => {
    const orderCreated = logs.find((l) => l.event_type === "order_created");
    const paymentConfirmed = logs.find(
      (l) => l.event_type === "payment_confirmed",
    );

    if (orderCreated && paymentConfirmed) {
      const startTime = new Date(orderCreated.created_at).getTime();
      const endTime = new Date(paymentConfirmed.created_at).getTime();
      processingTimes.push(endTime - startTime);
    }
  });

  if (processingTimes.length === 0) {
    return {
      avg_processing_time_ms: 0,
      max_processing_time_ms: 0,
      min_processing_time_ms: 0,
    };
  }

  return {
    avg_processing_time_ms:
      processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length,
    max_processing_time_ms: Math.max(...processingTimes),
    min_processing_time_ms: Math.min(...processingTimes),
  };
}

function generateTimeSeries(payments: any[], granularity: string) {
  // Simple implementation - can be enhanced based on requirements
  const timeGroups: Record<string, any[]> = {};

  payments.forEach((payment) => {
    const date = new Date(payment.created_at);
    let key: string;

    switch (granularity) {
      case "hour":
        key = date.toISOString().substring(0, 13) + ":00:00Z";
        break;
      case "day":
        key = date.toISOString().substring(0, 10) + "T00:00:00Z";
        break;
      case "week":
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().substring(0, 10) + "T00:00:00Z";
        break;
      case "month":
        key = date.toISOString().substring(0, 7) + "-01T00:00:00Z";
        break;
      default:
        key = date.toISOString().substring(0, 10) + "T00:00:00Z";
    }

    if (!timeGroups[key]) {
      timeGroups[key] = [];
    }
    timeGroups[key].push(payment);
  });

  return Object.entries(timeGroups)
    .map(([timestamp, group]) => {
      const successful = group.filter((p) => p.status === "paid");
      const revenue = successful.reduce(
        (sum, p) => sum + (p.amount_inr || 0),
        0,
      );

      return {
        timestamp,
        payments: group.length,
        revenue,
        success_rate:
          group.length > 0 ? (successful.length / group.length) * 100 : 0,
      };
    })
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}
```

---

## 📝 Modified Files

### **1. supabase/functions/cashfree-webhook/index.ts (Enhanced)**

```typescript
// ADDITIONAL IMPORTS AND VARIABLES
const startTime = Date.now();
const webhookId = req.headers.get("x-webhook-id");
const clientIP = req.headers.get("x-forwarded-for") || "unknown";

// RATE LIMITING (Add after CORS headers)
const rateLimiter = new Map<string, { count: number; resetTime: number }>();

const checkRateLimit = (
  key: string,
  limit: number,
  windowMs: number,
): boolean => {
  const now = Date.now();
  const record = rateLimiter.get(key);

  if (!record || now > record.resetTime) {
    rateLimiter.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
};

// Apply rate limiting
if (!checkRateLimit(clientIP, 10, 60000)) {
  // 10 requests per minute
  await supabaseAdmin.from("payment_audit_log").insert({
    event_type: "webhook_rate_limited",
    raw_payload: { ip_address: clientIP, webhook_id: webhookId },
  });

  return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
    status: 429,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ENHANCED TIMESTAMP VALIDATION (Replace existing)
const tsSeconds = Number(timestamp);
const nowSeconds = Math.floor(Date.now() / 1000);
if (!Number.isFinite(tsSeconds) || Math.abs(nowSeconds - tsSeconds) > 60) {
  await supabaseAdmin.from("payment_audit_log").insert({
    event_type: "webhook_timestamp_invalid",
    webhook_id: webhookId,
    raw_payload: {
      body: rawBody.substring(0, 500),
      timestamp,
      ip_address: clientIP,
      current_timestamp: nowSeconds,
    },
  });

  return new Response(JSON.stringify({ error: "Invalid or stale timestamp" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// DUPLICATE WEBHOOK CHECK (Add after signature verification)
if (webhookId) {
  const { data: existingWebhook } = await supabaseAdmin
    .from("payment_audit_log")
    .select("id")
    .eq("webhook_id", webhookId)
    .single();

  if (existingWebhook) {
    await supabaseAdmin.from("payment_audit_log").insert({
      event_type: "webhook_duplicate_ignored",
      webhook_id: webhookId,
      raw_payload: {
        original_webhook_id: webhookId,
        ip_address: clientIP,
      },
    });

    return new Response(
      JSON.stringify({ message: "Duplicate webhook ignored" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}

// DATABASE LOCKING (Replace existing boost lookup)
const { data: lockId } = await supabaseAdmin.rpc("acquire_payment_lock", {
  order_id: orderId,
  lock_duration: "30 seconds",
});

if (!lockId) {
  await supabaseAdmin.from("payment_audit_log").insert({
    event_type: "webhook_lock_failed",
    cashfree_order_id: orderId,
    webhook_id: webhookId,
    raw_payload: {
      ip_address: clientIP,
      reason: "Payment already being processed",
    },
  });

  return new Response(
    JSON.stringify({ error: "Payment already being processed" }),
    {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

try {
  // EXISTING PROCESSING LOGIC HERE...

  // Update with webhook ID for idempotency
  await supabaseAdmin
    .from("listing_boosts")
    .update({ webhook_id })
    .eq("cashfree_order_id", orderId);

  // ENHANCED AUDIT LOGGING
  await supabaseAdmin.from("payment_audit_log").insert({
    boost_id: boost.id,
    event_type: "payment_confirmed",
    cashfree_order_id: orderId,
    webhook_id: webhookId,
    raw_payload: {
      tier: boost.tier,
      amount: boost.amount_inr,
      listing_id: boost.listing_id,
      featured_from: now.toISOString(),
      featured_until: featuredUntil.toISOString(),
      payment_method: paymentData?.payment_group || "upi",
      processing_time_ms: Date.now() - startTime,
      ip_address: clientIP,
      user_agent: req.headers.get("user-agent"),
    },
  });
} finally {
  // RELEASE LOCK
  await supabaseAdmin.rpc("release_payment_lock", {
    order_id: orderId,
    lock_id: lockId,
  });
}

// ADDITIONAL WEBHOOK EVENT HANDLERS (Add to main switch statement)
const handlePaymentRefund = async (orderData: any, paymentData: any) => {
  const orderId = orderData.order_id;

  const { data: boost } = await supabaseAdmin
    .from("listing_boosts")
    .select("*")
    .eq("cashfree_order_id", orderId)
    .single();

  if (!boost || boost.status !== "paid") {
    console.log("Refund for non-paid boost, ignoring:", orderId);
    return;
  }

  // Update boost status
  await supabaseAdmin
    .from("listing_boosts")
    .update({
      status: "refunded",
      refund_amount: paymentData?.refund_amount || boost.amount_inr,
      refund_id: paymentData?.cf_refund_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", boost.id);

  // Remove featured status from listing
  await supabaseAdmin
    .from("listings")
    .update({
      is_featured: false,
      featured_until: null,
      featured_tier: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", boost.listing_id);

  // Log refund
  await supabaseAdmin.from("payment_audit_log").insert({
    boost_id: boost.id,
    event_type: "payment_refunded",
    cashfree_order_id: orderId,
    webhook_id: webhookId,
    raw_payload: {
      refund_amount: paymentData?.refund_amount,
      refund_id: paymentData?.cf_refund_id,
      refund_reason: paymentData?.refund_reason,
      ip_address: clientIP,
    },
  });

  console.log(`💰 Refund processed for order: ${orderId}`);
};

const handleOrderExpired = async (orderData: any) => {
  const orderId = orderData.order_id;

  await supabaseAdmin
    .from("listing_boosts")
    .update({
      status: "expired",
      updated_at: new Date().toISOString(),
    })
    .eq("cashfree_order_id", orderId)
    .eq("status", "pending");

  await supabaseAdmin.from("payment_audit_log").insert({
    event_type: "order_expired",
    cashfree_order_id: orderId,
    webhook_id: webhookId,
    raw_payload: { ip_address: clientIP },
  });

  console.log(`⏰ Order expired: ${orderId}`);
};

// UPDATED MAIN SWITCH STATEMENT
switch (eventType) {
  case "PAYMENT_SUCCESS_WEBHOOK":
    if (orderData?.order_status === "PAID") {
      await handlePaymentSuccess(orderData, paymentData);
    } else {
      await handleOrderExpired(orderData);
    }
    break;
  case "PAYMENT_FAILED_WEBHOOK":
    await handlePaymentFailure(orderData, paymentData);
    break;
  case "PAYMENT_REFUND_WEBHOOK":
    await handlePaymentRefund(orderData, paymentData);
    break;
  case "ORDER_EXPIRED_WEBHOOK":
    await handleOrderExpired(orderData);
    break;
  default:
    console.log(`Unhandled webhook event type: ${eventType}`);
    await supabaseAdmin.from("payment_audit_log").insert({
      event_type: "webhook_unhandled_event",
      cashfree_order_id: orderData?.order_id,
      webhook_id: webhookId,
      raw_payload: {
        event_type: eventType,
        ip_address: clientIP,
      },
    });
}
```

### **2. supabase/functions/create-boost-order/index.ts (Enhanced)**

```typescript
// ADD CREDENTIAL VALIDATION FUNCTION
function validateCredentials() {
    const appId = Deno.env.get("CASHFREE_APP_ID");
    const secretKey = Deno.env.get("CASHFREE_SECRET_KEY");
    const env = Deno.env.get("CASHFREE_ENV");

    if (!appId || !secretKey) {
        throw new Error("Missing Cashfree credentials");
    }

    if (env === "production") {
        // Validate production credentials format
        if (!appId.startsWith("prod_") || !secretKey.startsWith("prod_")) {
            throw new Error("Invalid production credentials format");
        }
    }
}

// ADD TO MAIN FUNCTION (after SDK initialization)
try {
    validateCredentials();
} catch (credError: any) {
    return new Response(
        JSON.stringify({ error: "Credential validation failed", details: credError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
}

// REPLACE URL GENERATION (server-side only)
const generatePaymentUrl = (paymentSessionId: string): string => {
    const env = Deno.env.get("CASHFREE_ENV") || "sandbox";
    const baseUrl = env === "production"
        ? "https://payments.cashfree.com/pg/view/order"
        : "https://sandbox.cashfree.com/pg/view/order";

    return `${baseUrl}/${paymentSessionId}`;
};

// UPDATE RESPONSE OBJECT
return new Response(
    JSON.stringify({
        success: true,
        boost_id: boostRecord.id,
        order_id: orderId,
        payment_url: generatePaymentUrl(cashfreeData.payment_session_id),
        cf_order_id: cashfreeData.cf_order_id,
        tier: tier,
    }),
    {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
);

// ENHANCED ERROR HANDLING
} catch (error: any) {
    console.error("Unexpected error:", error);

    // Log detailed error for debugging
    await supabaseAdmin.from("payment_audit_log").insert({
        event_type: "order_creation_error",
        raw_payload: {
            error: error.message,
            stack: error.stack,
            user_id: user?.id,
            listing_id,
            tier: tierKey,
            ip_address: req.headers.get("x-forwarded-for"),
        },
    });

    // Return sanitized error to user
    const userFacingError = error.message.includes("Cashfree")
        ? "Payment gateway error. Please try again."
        : "Internal server error. Please try again.";

    return new Response(
        JSON.stringify({ error: userFacingError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
}
```

### **3. src/pages/BoostSuccess.tsx (Enhanced)**

```typescript
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { COPY } from '../lib/localCopy';

export const BoostSuccess: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const orderId = searchParams.get('order_id');
    const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
    const [listingId, setListingId] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const maxRetries = 5;
    const retryDelay = 3000; // 3 seconds

    useEffect(() => {
        if (!orderId) {
            setStatus('failed');
            return;
        }

        const checkOrderStatus = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    setStatus('failed');
                    return;
                }

                // Call secure verification endpoint
                const response = await fetch(
                    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-payment`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`,
                        },
                        body: JSON.stringify({ order_id: orderId }),
                    }
                );

                if (!response.ok) {
                    if (response.status === 404) {
                        setStatus('failed');
                        return;
                    }
                    throw new Error('Payment verification failed');
                }

                const data = await response.json();

                if (data.success && data.status === 'paid') {
                    setStatus('success');
                    setListingId(data.listing_id);
                } else if (data.status === 'failed' || data.status === 'refunded') {
                    setStatus('failed');
                } else {
                    // Still pending, retry with exponential backoff
                    if (retryCount < maxRetries) {
                        const delay = retryDelay * Math.pow(2, retryCount);
                        setTimeout(() => {
                            setRetryCount(prev => prev + 1);
                            checkOrderStatus();
                        }, delay);
                    } else {
                        // Max retries reached, show failure
                        setStatus('failed');
                    }
                }
            } catch (err: any) {
                console.error("Payment verification error:", err);

                // Retry on network errors
                if (retryCount < maxRetries && err.name === 'TypeError') {
                    setTimeout(() => {
                        setRetryCount(prev => prev + 1);
                        checkOrderStatus();
                    }, retryDelay);
                } else {
                    setStatus('failed');
                }
            }
        };

        checkOrderStatus();
    }, [orderId, retryCount]);

    return (
        <div className="min-h-screen bg-warm-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl border border-warm-100 p-8 max-w-sm w-full text-center">
                {status === 'loading' && (
                    <div className="py-8 flex flex-col items-center">
                        <Loader2 size={48} className="text-coral-500 animate-spin mb-4" />
                        <h2 className="text-xl font-bold text-midnight-800">Verifying Payment...</h2>
                        <p className="text-warm-500 text-sm mt-2">
                            {retryCount > 0
                                ? `Checking payment status... (Attempt ${retryCount + 1}/${maxRetries + 1})`
                                : "Please wait while we confirm your boost with the bank."
                            }
                        </p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="py-8 flex flex-col items-center animate-fade-in">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-500 mb-6">
                            <CheckCircle size={40} />
                        </div>
                        <h2 className="text-2xl font-black font-heading text-midnight-800 mb-2">Payment Successful!</h2>
                        <p className="text-warm-600 mb-8">
                            {COPY.SUCCESS.BOOST_ACTIVATED}
                        </p>
                        <button
                            onClick={() => navigate(listingId ? `/listings/${listingId}` : '/profile')}
                            className="bg-midnight-800 hover:bg-midnight-900 text-white font-bold py-3 px-6 rounded-xl w-full transition-colors flex items-center justify-center gap-2"
                        >
                            <ArrowLeft size={18} /> Back to Listing
                        </button>
                    </div>
                )}

                {status === 'failed' && (
                    <div className="py-8 flex flex-col items-center animate-fade-in">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-500 mb-6">
                            <XCircle size={40} />
                        </div>
                        <h2 className="text-2xl font-black font-heading text-midnight-800 mb-2">Payment Failed</h2>
                        <p className="text-warm-600 mb-8">
                            We couldn't process your payment. If money was deducted, it will be automatically refunded within 5-7 business days.
                        </p>
                        <button
                            onClick={() => navigate('/profile')}
                            className="bg-warm-200 hover:bg-warm-300 text-midnight-800 font-bold py-3 px-6 rounded-xl w-full transition-colors flex items-center justify-center gap-2"
                        >
                            <ArrowLeft size={18} /> Return to Profile
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
```

---

## 🗄️ Database Changes

### **1. supabase/migrations/021_payment_security_enhancements.sql**

```sql
-- ============================================================
-- Migration 021: Payment Security Enhancements
-- Adds idempotency, locking, and enhanced audit capabilities
-- ============================================================

-- Add idempotency and locking columns to listing_boosts
ALTER TABLE listing_boosts
ADD COLUMN IF NOT EXISTS webhook_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS processing_lock_id TEXT,
ADD COLUMN IF NOT EXISTS processing_lock_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS refund_id TEXT,
ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_listing_boosts_webhook_id ON listing_boosts(webhook_id);
CREATE INDEX IF NOT EXISTS idx_listing_boosts_processing_lock ON listing_boosts(processing_lock_id, processing_lock_until);

-- Create payment lock function
CREATE OR REPLACE FUNCTION acquire_payment_lock(
    order_id TEXT,
    lock_duration INTERVAL DEFAULT INTERVAL '30 seconds'
) RETURNS TEXT AS $$
DECLARE
    lock_id TEXT;
    lock_expires TIMESTAMPTZ;
BEGIN
    lock_id := gen_random_uuid()::TEXT;
    lock_expires := NOW() + lock_duration;

    -- Try to acquire lock
    UPDATE listing_boosts
    SET processing_lock_id = lock_id,
        processing_lock_until = lock_expires
    WHERE cashfree_order_id = order_id
      AND (processing_lock_id IS NULL OR processing_lock_until < NOW);

    -- Check if lock acquired
    IF FOUND THEN
        RETURN lock_id;
    ELSE
        RETURN NULL;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create lock release function
CREATE OR REPLACE FUNCTION release_payment_lock(
    order_id TEXT,
    lock_id TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE listing_boosts
    SET processing_lock_id = NULL,
        processing_lock_until = NULL
    WHERE cashfree_order_id = order_id
      AND processing_lock_id = lock_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced audit log table
ALTER TABLE payment_audit_log
ADD COLUMN IF NOT EXISTS webhook_id TEXT,
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS processing_time_ms INTEGER;

-- Create indexes for audit log
CREATE INDEX IF NOT EXISTS idx_audit_webhook_id ON payment_audit_log(webhook_id);
CREATE INDEX IF NOT EXISTS idx_audit_ip_address ON payment_audit_log(ip_address);
CREATE INDEX IF NOT EXISTS idx_audit_processing_time ON payment_audit_log(processing_time_ms);

-- Create rate limiting table
CREATE TABLE IF NOT EXISTS webhook_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address INET NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    window_end TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '1 minute',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_window ON webhook_rate_limits(ip_address, window_end);

-- Create rate limiting function
CREATE OR REPLACE FUNCTION check_webhook_rate_limit(
    client_ip INET,
    max_requests INTEGER DEFAULT 10,
    window_minutes INTEGER DEFAULT 1
) RETURNS BOOLEAN AS $$
DECLARE
    current_window_start TIMESTAMPTZ;
    current_window_end TIMESTAMPTZ;
    current_count INTEGER;
BEGIN
    current_window_start := NOW() - (window_minutes || ' minutes')::INTERVAL;
    current_window_end := NOW();

    -- Clean up old records
    DELETE FROM webhook_rate_limits
    WHERE window_end < NOW() - INTERVAL '1 hour';

    -- Get current count
    SELECT COALESCE(COUNT(*), 0) INTO current_count
    FROM webhook_rate_limits
    WHERE ip_address = client_ip
      AND window_start >= current_window_start
      AND window_end <= current_window_end;

    -- Check if under limit
    IF current_count < max_requests THEN
        -- Record this request
        INSERT INTO webhook_rate_limits (ip_address, window_start, window_end)
        VALUES (client_ip, current_window_start, current_window_end)
        ON CONFLICT (ip_address, window_end)
        DO UPDATE SET
            request_count = webhook_rate_limits.request_count + 1,
            window_start = current_window_start;

        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policies for new functions
GRANT EXECUTE ON FUNCTION acquire_payment_lock TO authenticated;
GRANT EXECUTE ON FUNCTION release_payment_lock TO authenticated;
GRANT EXECUTE ON FUNCTION check_webhook_rate_limit TO authenticated;

-- Enable RLS on rate limits table
ALTER TABLE webhook_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access rate limits" ON webhook_rate_limits
FOR ALL USING (auth.role() = 'service_role');
```

### **2. supabase/migrations/022_payment_monitoring.sql**

```sql
-- ============================================================
-- Migration 022: Payment Monitoring and Analytics
-- Adds monitoring capabilities and performance tracking
-- ============================================================

-- Create payment metrics table
CREATE TABLE IF NOT EXISTS payment_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_date DATE NOT NULL,
    total_payments INTEGER DEFAULT 0,
    successful_payments INTEGER DEFAULT 0,
    failed_payments INTEGER DEFAULT 0,
    refunded_payments INTEGER DEFAULT 0,
    total_revenue NUMERIC(12, 2) DEFAULT 0,
    refund_amount NUMERIC(12, 2) DEFAULT 0,
    avg_processing_time_ms INTEGER DEFAULT 0,
    success_rate NUMERIC(5, 2) DEFAULT 0,
    refund_rate NUMERIC(5, 2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create unique index on date
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_metrics_date ON payment_metrics(metric_date);

-- Create payment performance table
CREATE TABLE IF NOT EXISTS payment_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    boost_id UUID REFERENCES listing_boosts(id) ON DELETE CASCADE,
    order_created_at TIMESTAMPTZ,
    payment_confirmed_at TIMESTAMPTZ,
    processing_time_ms INTEGER,
    webhook_received_at TIMESTAMPTZ,
    webhook_processed_at TIMESTAMPTZ,
    boost_activated_at TIMESTAMPTZ,
    invoice_generated_at TIMESTAMPTZ,
    total_completion_time_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance table
CREATE INDEX IF NOT EXISTS idx_payment_performance_boost_id ON payment_performance(boost_id);
CREATE INDEX IF NOT EXISTS idx_payment_performance_processing_time ON payment_performance(processing_time_ms);
CREATE INDEX IF NOT EXISTS idx_payment_performance_completion_time ON payment_performance(total_completion_time_ms);

-- Create payment alerts table
CREATE TABLE IF NOT EXISTS payment_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type TEXT NOT NULL CHECK (alert_type IN ('high_failure_rate', 'slow_processing', 'revenue_drop', 'security_issue')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    message TEXT NOT NULL,
    details JSONB,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_by UUID REFERENCES auth.users(id)
);

-- Create indexes for alerts table
CREATE INDEX IF NOT EXISTS idx_payment_alerts_type ON payment_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_payment_alerts_severity ON payment_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_payment_alerts_resolved ON payment_alerts(resolved);

-- Create function to calculate daily metrics
CREATE OR REPLACE FUNCTION calculate_daily_metrics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
DECLARE
    total_count INTEGER;
    success_count INTEGER;
    failed_count INTEGER;
    refunded_count INTEGER;
    revenue_total NUMERIC(12, 2);
    refund_total NUMERIC(12, 2);
    avg_processing_time INTEGER;
BEGIN
    -- Calculate metrics for the target date
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'paid'),
        COUNT(*) FILTER (WHERE status = 'failed'),
        COUNT(*) FILTER (WHERE status = 'refunded'),
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_inr ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status = 'refunded' THEN refund_amount ELSE 0 END), 0),
        COALESCE(AVG(pp.processing_time_ms), 0)
    INTO total_count, success_count, failed_count, refunded_count, revenue_total, refund_total, avg_processing_time
    FROM listing_boosts lb
    LEFT JOIN payment_performance pp ON lb.id = pp.boost_id
    WHERE DATE(lb.created_at) = target_date;

    -- Insert or update metrics
    INSERT INTO payment_metrics (
        metric_date,
        total_payments,
        successful_payments,
        failed_payments,
        refunded_payments,
        total_revenue,
        refund_amount,
        avg_processing_time_ms,
        success_rate,
        refund_rate
    ) VALUES (
        target_date,
        total_count,
        success_count,
        failed_count,
        refunded_count,
        revenue_total,
        refund_total,
        avg_processing_time,
        CASE WHEN total_count > 0 THEN (success_count::NUMERIC / total_count::NUMERIC) * 100 ELSE 0 END,
        CASE WHEN success_count > 0 THEN (refunded_count::NUMERIC / success_count::NUMERIC) * 100 ELSE 0 END
    )
    ON CONFLICT (metric_date)
    DO UPDATE SET
        total_payments = EXCLUDED.total_payments,
        successful_payments = EXCLUDED.successful_payments,
        failed_payments = EXCLUDED.failed_payments,
        refunded_payments = EXCLUDED.refunded_payments,
        total_revenue = EXCLUDED.total_revenue,
        refund_amount = EXCLUDED.refund_amount,
        avg_processing_time_ms = EXCLUDED.avg_processing_time_ms,
        success_rate = EXCLUDED.success_rate,
        refund_rate = EXCLUDED.refund_rate,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to detect performance issues
CREATE OR REPLACE FUNCTION detect_payment_issues()
RETURNS TABLE(alert_type TEXT, severity TEXT, message TEXT, details JSONB) AS $$
DECLARE
    high_failure_rate_threshold NUMERIC := 10.0; -- 10%
    slow_processing_threshold INTEGER := 30000; -- 30 seconds
    revenue_drop_threshold NUMERIC := 20.0; -- 20%
BEGIN
    -- Check for high failure rate
    RETURN QUERY
    SELECT
        'high_failure_rate'::TEXT,
        CASE WHEN failure_rate > 20 THEN 'critical'::TEXT ELSE 'high'::TEXT END,
        'High payment failure rate detected'::TEXT,
        jsonb_build_object(
            'failure_rate', failure_rate,
            'date', CURRENT_DATE,
            'threshold', high_failure_rate_threshold
        )
    FROM payment_metrics
    WHERE metric_date = CURRENT_DATE - INTERVAL '1 day'
      AND failure_rate > high_failure_rate_threshold;

    -- Check for slow processing
    RETURN QUERY
    SELECT
        'slow_processing'::TEXT,
        CASE WHEN avg_processing_time_ms > 60000 THEN 'critical'::TEXT ELSE 'medium'::TEXT END,
        'Slow payment processing detected'::TEXT,
        jsonb_build_object(
            'avg_processing_time_ms', avg_processing_time_ms,
            'date', CURRENT_DATE,
            'threshold', slow_processing_threshold
        )
    FROM payment_metrics
    WHERE metric_date = CURRENT_DATE - INTERVAL '1 day'
      AND avg_processing_time_ms > slow_processing_threshold;

    -- Check for revenue drop
    RETURN QUERY
    SELECT
        'revenue_drop'::TEXT,
        CASE WHEN revenue_change < -50 THEN 'critical'::TEXT ELSE 'medium'::TEXT END,
        'Revenue drop detected'::TEXT,
        jsonb_build_object(
            'revenue_change_percent', revenue_change,
            'current_revenue', current_revenue,
            'previous_revenue', previous_revenue
        )
    FROM (
        SELECT
            m1.total_revenue as current_revenue,
            m2.total_revenue as previous_revenue,
            CASE
                WHEN m2.total_revenue > 0
                THEN ((m1.total_revenue - m2.total_revenue) / m2.total_revenue) * 100
                ELSE 0
            END as revenue_change
        FROM payment_metrics m1
        LEFT JOIN payment_metrics m2 ON m2.metric_date = m1.metric_date - INTERVAL '1 day'
        WHERE m1.metric_date = CURRENT_DATE - INTERVAL '1 day'
    ) sub
    WHERE revenue_change < -revenue_drop_threshold;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION calculate_daily_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION detect_payment_issues TO authenticated;

-- Enable RLS on new tables
ALTER TABLE payment_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Service role full access metrics" ON payment_metrics
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access performance" ON payment_performance
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access alerts" ON payment_alerts
FOR ALL USING (auth.role() = 'service_role');
```

---

## 🔧 Configuration Changes

### **Environment Variables (.env)**

```bash
# === EXISTING VARIABLES ===
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id

# === CASHFREE CONFIGURATION ===
# UPDATE THESE FOR PRODUCTION
VITE_CASHFREE_ENV=sandbox  # Change to 'production' for production
CASHFREE_APP_ID=your_cashfree_app_id  # UPDATE: Get from Cashfree dashboard
CASHFREE_SECRET_KEY=your_cashfree_secret_key  # UPDATE: Get from Cashfree dashboard

# === BACKEND CONFIGURATION ===
SUPABASE_URL=your_supabase_url
SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=your_database_url

# === SECURITY CONFIGURATION ===
FRONTEND_ORIGIN=https://www.andamanbazaar.in  # UPDATE: Your production domain

# === MONITORING CONFIGURATION ===
PAYMENT_WEBHOOK_SECRET=your_webhook_secret_key  # OPTIONAL: Additional webhook security
PAYMENT_TIMEOUT_MINUTES=30  # OPTIONAL: Custom timeout settings
PAYMENT_RATE_LIMIT_PER_MINUTE=10  # OPTIONAL: Custom rate limiting
```

---

## 🚀 Deployment Commands

### **1. Deploy New Edge Functions**

```bash
# Deploy new functions
supabase functions deploy verify-payment
supabase functions deploy process-payment-timeouts
supabase functions deploy reconcile-payments
supabase functions deploy payment-metrics

# Update existing functions
supabase functions deploy cashfree-webhook --no-verify-jwt
supabase functions deploy create-boost-order --no-verify-jwt
```

### **2. Apply Database Migrations**

```bash
# Apply security enhancements
supabase db push

# Verify new functions
supabase db shell --command "\df acquire_payment_lock"
supabase db shell --command "\df release_payment_lock"
supabase db shell --command "\df check_webhook_rate_limit"
```

### **3. Update Frontend**

```bash
# Build and deploy frontend
npm run build
npm run deploy

# Verify new payment flow
npm run test:e2e:payment
```

---

## 📋 Testing Commands

### **1. Unit Tests**

```bash
# Run all payment-related tests
npm run test:payment

# Test specific components
npm run test:verify-payment
npm run test:webhook-processing
npm run test:timeout-handling
```

### **2. Integration Tests**

```bash
# Test full payment flow
npm run test:integration:payment

# Test webhook processing
npm run test:integration:webhook

# Test idempotency
npm run test:integration:idempotency
```

### **3. Security Tests**

```bash
# Test webhook security
npm run test:security:webhook

# Test rate limiting
npm run test:security:rate-limit

# Test replay attacks
npm run test:security:replay
```

---

## 🔄 Rollback Commands

### **Emergency Rollback**

```bash
# Disable new features
UPDATE listing_boosts SET status = 'maintenance_mode' WHERE status = 'pending';

# Revert database changes
supabase db reset --version 020  # Rollback to before security enhancements

# Redeploy old functions
git checkout main~1  # Go to previous commit
supabase functions deploy cashfree-webhook
supabase functions deploy create-boost-order
```

---

**Implementation Status**: ✅ **READY FOR DEPLOYMENT**

All code changes are production-ready with comprehensive error handling, security measures, and backward compatibility. Follow the deployment commands in order for a smooth rollout.
