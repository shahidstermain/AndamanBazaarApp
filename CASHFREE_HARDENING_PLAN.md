# Cashfree Hardening Plan

## 🎯 Executive Summary

This document provides a comprehensive hardening plan for the Cashfree payment integration to address all critical security vulnerabilities identified in the payment risk audit. The plan focuses on **immediate security fixes**, **production readiness**, and **long-term maintainability**.

### Implementation Timeline:

- **Phase 1 (Critical)**: 24-48 hours
- **Phase 2 (Security Hardening)**: 1 week
- **Phase 3 (Production Readiness)**: 2 weeks
- **Phase 4 (Monitoring & Compliance)**: 1 month

---

## 🚨 Phase 1: Critical Security Fixes (24-48 hours)

### **Fix #1: Server-Side Payment Verification**

#### **Problem**: Frontend trusts payment success without server verification

#### **Solution**: Create secure payment verification endpoint

```typescript
// supabase/functions/verify-payment/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  // 1. Authenticate user
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 2. Parse request
  const { order_id } = await req.json();
  if (!order_id) {
    return new Response("Missing order_id", { status: 400 });
  }

  // 3. Verify payment status server-side
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SERVICE_ROLE_KEY")!,
  );

  const { data: boost, error: boostError } = await supabaseAdmin
    .from("listing_boosts")
    .select("status, user_id, listing_id, tier")
    .eq("cashfree_order_id", order_id)
    .single();

  if (boostError || !boost) {
    return new Response("Order not found", { status: 404 });
  }

  // 4. Verify ownership
  if (boost.user_id !== user.id) {
    return new Response("Access denied", { status: 403 });
  }

  // 5. Return verified status
  return new Response(
    JSON.stringify({
      success: boost.status === "paid",
      status: boost.status,
      listing_id: boost.listing_id,
      tier: boost.tier,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
});
```

#### **Frontend Updates**:

```typescript
// src/pages/BoostSuccess.tsx - FIXED VERSION
const checkOrderStatus = async () => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setStatus("failed");
      return;
    }

    // Call secure verification endpoint
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-payment`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ order_id: orderId }),
      },
    );

    if (!response.ok) {
      throw new Error("Payment verification failed");
    }

    const data = await response.json();

    if (data.success && data.status === "paid") {
      setStatus("success");
      setListingId(data.listing_id);
    } else {
      setStatus("failed");
    }
  } catch (err) {
    console.error("Payment verification error:", err);
    setStatus("failed");
  }
};
```

---

### **Fix #2: Reduce Webhook Replay Window**

#### **Problem**: 5-minute replay window too large

#### **Solution**: Reduce to 60 seconds and add additional protection

```typescript
// supabase/functions/cashfree-webhook/index.ts - FIXED VERSION
// Enforce timestamp freshness (1-minute replay window)
const tsSeconds = Number(timestamp);
const nowSeconds = Math.floor(Date.now() / 1000);
if (!Number.isFinite(tsSeconds) || Math.abs(nowSeconds - tsSeconds) > 60) {
  await supabaseAdmin.from("payment_audit_log").insert({
    event_type: "webhook_timestamp_invalid",
    raw_payload: { body: rawBody.substring(0, 500), timestamp },
  });

  return new Response(JSON.stringify({ error: "Invalid or stale timestamp" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Additional replay protection
const webhookId = req.headers.get("x-webhook-id");
if (webhookId) {
  const { data: existingWebhook } = await supabaseAdmin
    .from("payment_audit_log")
    .select("id")
    .eq("webhook_id", webhookId)
    .single();

  if (existingWebhook) {
    return new Response(JSON.stringify({ error: "Duplicate webhook" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
```

---

### **Fix #3: Production Credentials Configuration**

#### **Problem**: Missing production Cashfree credentials

#### **Solution**: Configure production credentials securely

```bash
# Production environment variables
CASHFREE_APP_ID=prod_your_actual_app_id
CASHFREE_SECRET_KEY=prod_your_actual_secret_key
CASHFREE_ENV=production

# Update webhook URL in Cashfree dashboard
# From: https://andamanbazaar.in/api/webhook/cashfree
# To: https://andamanbazaar.in/.netlify/functions/cashfree-webhook
```

#### **Credential Validation**:

```typescript
// supabase/functions/create-boost-order/index.ts - ADD VALIDATION
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
```

---

### **Fix #4: Database-Level Idempotency**

#### **Problem**: Insufficient protection against concurrent processing

#### **Solution**: Add database locks and comprehensive idempotency

```sql
-- Add idempotency tracking
ALTER TABLE listing_boosts ADD COLUMN webhook_id TEXT UNIQUE;
ALTER TABLE listing_boosts ADD COLUMN processing_lock_id TEXT;
ALTER TABLE listing_boosts ADD COLUMN processing_lock_until TIMESTAMPTZ;

-- Create processing lock function
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
$$ LANGUAGE plpgsql;

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
$$ LANGUAGE plpgsql;
```

#### **Webhook Processing with Locks**:

```typescript
// supabase/functions/cashfree-webhook/index.ts - ADD LOCKING
const orderId = orderData.order_id;
const webhookId = req.headers.get("x-webhook-id");

// Acquire processing lock
const { data: lockId } = await supabaseAdmin.rpc("acquire_payment_lock", {
  order_id: orderId,
  lock_duration: "30 seconds",
});

if (!lockId) {
  return new Response(
    JSON.stringify({ error: "Payment already being processed" }),
    {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

try {
  // Process payment with lock held
  // ... existing processing logic ...

  // Update with webhook ID for idempotency
  await supabaseAdmin
    .from("listing_boosts")
    .update({ webhook_id })
    .eq("cashfree_order_id", orderId);
} finally {
  // Release lock
  await supabaseAdmin.rpc("release_payment_lock", {
    order_id: orderId,
    lock_id,
  });
}
```

---

## 🔒 Phase 2: Security Hardening (1 week)

### **Enhancement #1: Server-Side URL Generation**

#### **Problem**: Payment URLs constructed client-side

#### **Solution**: Move URL generation to server-side

```typescript
// supabase/functions/create-boost-order/index.ts - ENHANCED
// Generate payment URL server-side
const generatePaymentUrl = (paymentSessionId: string): string => {
  const env = Deno.env.get("CASHFREE_ENV") || "sandbox";
  const baseUrl =
    env === "production"
      ? "https://payments.cashfree.com/pg/view/order"
      : "https://sandbox.cashfree.com/pg/view/order";

  return `${baseUrl}/${paymentSessionId}`;
};

// Return only the final URL to frontend
return new Response(
  JSON.stringify({
    success: true,
    boost_id: boostRecord.id,
    order_id: orderId,
    payment_url: generatePaymentUrl(cashfreeData.payment_session_id),
    tier: tier,
  }),
  {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  },
);
```

#### **Frontend Simplification**:

```typescript
// src/components/BoostListingModal.tsx - SIMPLIFIED
if (data.payment_url) {
  window.location.href = data.payment_url;
} else {
  throw new Error("No payment URL received");
}
```

---

### **Enhancement #2: Comprehensive Webhook Event Handling**

#### **Problem**: Missing refund and cancellation handling

#### **Solution**: Handle all webhook event types

```typescript
// supabase/functions/cashfree-webhook/index.ts - COMPREHENSIVE HANDLING
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
    raw_payload: {
      refund_amount: paymentData?.refund_amount,
      refund_id: paymentData?.cf_refund_id,
      refund_reason: paymentData?.refund_reason,
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

  console.log(`⏰ Order expired: ${orderId}`);
};

// Add to main webhook handler
switch (eventType) {
  case "PAYMENT_SUCCESS_WEBHOOK":
    await handlePaymentSuccess(orderData, paymentData);
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
}
```

---

### **Enhancement #3: Enhanced Audit Logging**

#### **Problem**: Limited audit information for security

#### **Solution**: Comprehensive audit logging

```typescript
// Enhanced audit logging function
const logPaymentEvent = async (
  eventType: string,
  orderId: string,
  additionalData: Record<string, any> = {},
) => {
  await supabaseAdmin.from("payment_audit_log").insert({
    event_type: eventType,
    cashfree_order_id: orderId,
    webhook_id: req.headers.get("x-webhook-id"),
    raw_payload: {
      ...additionalData,
      ip_address: req.headers.get("x-forwarded-for"),
      user_agent: req.headers.get("user-agent"),
      timestamp: new Date().toISOString(),
      processing_time_ms: additionalData.processing_time,
    },
  });
};

// Usage in webhook processing
const startTime = Date.now();
await logPaymentEvent("webhook_received", orderId, {
  event_type: eventType,
  processing_time: 0,
});

// After processing
await logPaymentEvent("payment_confirmed", orderId, {
  tier: boost.tier,
  amount: boost.amount_inr,
  listing_id: boost.listing_id,
  processing_time: Date.now() - startTime,
});
```

---

### **Enhancement #4: Rate Limiting & DDoS Protection**

#### **Problem**: No rate limiting on webhook endpoint

#### **Solution**: Implement rate limiting

```typescript
// Rate limiting middleware
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

// Apply to webhook endpoint
const clientIP = req.headers.get("x-forwarded-for") || "unknown";
if (!checkRateLimit(clientIP, 10, 60000)) {
  // 10 requests per minute
  return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
    status: 429,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

---

## 🚀 Phase 3: Production Readiness (2 weeks)

### **Feature #1: Payment Timeout Handling**

#### **Problem**: No timeout handling for stuck payments

#### **Solution**: Automated timeout processing

```typescript
// supabase/functions/process-payment-timeouts/index.ts
Deno.serve(async (req: Request) => {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SERVICE_ROLE_KEY")!,
  );

  // Find payments stuck in pending state > 30 minutes
  const { data: stuckPayments } = await supabaseAdmin
    .from("listing_boosts")
    .select("*")
    .eq("status", "pending")
    .lt("created_at", new Date(Date.now() - 30 * 60 * 1000).toISOString());

  for (const payment of stuckPayments || []) {
    // Check actual status with Cashfree
    try {
      const cashfreeStatus = await checkCashfreeOrderStatus(
        payment.cashfree_order_id,
      );

      if (cashfreeStatus === "PAID") {
        // Payment succeeded but webhook delayed
        await processDelayedSuccess(payment);
      } else {
        // Payment actually failed/timeout
        await supabaseAdmin
          .from("listing_boosts")
          .update({
            status: "failed",
            failure_reason: "timeout",
            updated_at: new Date().toISOString(),
          })
          .eq("id", payment.id);
      }
    } catch (error) {
      console.error(`Failed to check payment ${payment.id}:`, error);
    }
  }

  return new Response("Timeout processing completed", { status: 200 });
});
```

---

### **Feature #2: Payment Status Polling**

#### **Problem**: No real-time payment status updates

#### **Solution**: Server-side status polling

```typescript
// supabase/functions/poll-payment-status/index.ts
Deno.serve(async (req: Request) => {
  const { order_id } = await req.json();

  // Check payment status with Cashfree API
  const status = await checkCashfreeOrderStatus(order_id);

  // Update database if status changed
  if (status !== "pending") {
    await updatePaymentStatus(order_id, status);
  }

  return new Response(JSON.stringify({ status }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
```

---

### **Feature #3: Manual Reconciliation Interface**

#### **Problem**: No manual reconciliation capability

#### **Solution**: Admin reconciliation dashboard

```typescript
// supabase/functions/reconcile-payments/index.ts
Deno.serve(async (req: Request) => {
  const { date_range, status_filter } = await req.json();

  // Get payments from database
  const { data: dbPayments } = await supabaseAdmin
    .from("listing_boosts")
    .select("*")
    .gte("created_at", date_range.start)
    .lte("created_at", date_range.end)
    .eq("status", status_filter);

  // Get payments from Cashfree
  const cashfreePayments = await getCashfreePayments(date_range);

  // Reconcile differences
  const reconciliation = reconcilePayments(dbPayments, cashfreePayments);

  return new Response(JSON.stringify(reconciliation), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
```

---

## 📊 Phase 4: Monitoring & Compliance (1 month)

### **Monitoring #1: Payment Metrics Dashboard**

#### **Implementation**: Real-time payment monitoring

```typescript
// Payment metrics collection
interface PaymentMetrics {
  totalPayments: number;
  successRate: number;
  failureRate: number;
  averageProcessingTime: number;
  revenueTotal: number;
  refundsTotal: number;
  disputesCount: number;
}

const collectPaymentMetrics = async (
  timeRange: TimeRange,
): Promise<PaymentMetrics> => {
  const { data: payments } = await supabaseAdmin
    .from("listing_boosts")
    .select("*")
    .gte("created_at", timeRange.start)
    .lte("created_at", timeRange.end);

  const metrics = {
    totalPayments: payments?.length || 0,
    successRate: calculateSuccessRate(payments),
    failureRate: calculateFailureRate(payments),
    averageProcessingTime: calculateAverageProcessingTime(payments),
    revenueTotal: calculateRevenue(payments),
    refundsTotal: calculateRefunds(payments),
    disputesCount: calculateDisputes(payments),
  };

  return metrics;
};
```

---

### **Compliance #1: Financial Reporting**

#### **Implementation**: Automated compliance reports

```typescript
// Generate daily financial reports
const generateDailyReport = async (date: string) => {
  const report = {
    date,
    totalTransactions: 0,
    grossRevenue: 0,
    netRevenue: 0,
    refunds: 0,
    chargebacks: 0,
    paymentMethodBreakdown: {},
    tierBreakdown: {},
  };

  // Populate report data
  const payments = await getPaymentsForDate(date);

  payments.forEach((payment) => {
    report.totalTransactions++;
    report.grossRevenue += payment.amount_inr;

    if (payment.status === "refunded") {
      report.refunds += payment.refund_amount || 0;
    }

    // Break down by payment method
    const method = payment.payment_method || "unknown";
    report.paymentMethodBreakdown[method] =
      (report.paymentMethodBreakdown[method] || 0) + 1;

    // Break down by tier
    const tier = payment.tier || "unknown";
    report.tierBreakdown[tier] =
      (report.tierBreakdown[tier] || 0) + payment.amount_inr;
  });

  report.netRevenue = report.grossRevenue - report.refunds - report.chargebacks;

  // Save report
  await saveFinancialReport(report);

  return report;
};
```

---

### **Security #1: Automated Security Scanning**

#### **Implementation**: Continuous security monitoring

```typescript
// Security monitoring
const runSecurityChecks = async () => {
  const securityReport = {
    timestamp: new Date().toISOString(),
    checks: {
      webhookSignatureValidation: await checkWebhookSecurity(),
      rateLimitingEffectiveness: await checkRateLimiting(),
      credentialSecurity: await checkCredentialSecurity(),
      auditTrailIntegrity: await checkAuditIntegrity(),
      dataEncryption: await checkDataEncryption(),
    },
    alerts: [],
  };

  // Generate alerts for any issues
  Object.entries(securityReport.checks).forEach(([check, result]) => {
    if (!result.passed) {
      securityReport.alerts.push({
        type: "security_issue",
        check,
        severity: result.severity,
        message: result.message,
      });
    }
  });

  // Send alerts if critical issues found
  if (securityReport.alerts.some((a) => a.severity === "critical")) {
    await sendSecurityAlert(securityReport);
  }

  return securityReport;
};
```

---

## 📋 Implementation Checklist

### **Phase 1: Critical Fixes (24-48 hours)**

```bash
□ Create verify-payment endpoint
□ Update BoostSuccess.tsx with server verification
□ Reduce webhook replay window to 60 seconds
□ Add webhook ID tracking for idempotency
□ Configure production Cashfree credentials
□ Add database-level locking functions
□ Test all critical fixes in staging
□ Deploy to production with monitoring
```

### **Phase 2: Security Hardening (1 week)**

```bash
□ Move URL generation to server-side
□ Implement comprehensive webhook handling
□ Add refund and cancellation processing
□ Enhance audit logging with full context
□ Implement rate limiting on webhook endpoint
□ Add input validation and sanitization
□ Create error handling with sanitized messages
□ Test security improvements
```

### **Phase 3: Production Readiness (2 weeks)**

```bash
□ Implement payment timeout handling
□ Create payment status polling
□ Build manual reconciliation interface
□ Add payment retry logic
□ Create admin dashboard for payment management
□ Implement backup and recovery procedures
□ Add performance monitoring
□ Test production scenarios
```

### **Phase 4: Monitoring & Compliance (1 month)**

```bash
□ Implement payment metrics dashboard
□ Create automated financial reporting
□ Set up security monitoring and alerting
□ Add compliance checking and reporting
□ Implement log aggregation and analysis
□ Create disaster recovery procedures
□ Document all security procedures
□ Train team on new security measures
```

---

## 🧪 Testing Strategy

### **Security Testing**

```bash
# Webhook signature testing
curl -X POST https://your-app.com/functions/v1/cashfree-webhook \
  -H "x-webhook-signature: invalid_signature" \
  -H "x-webhook-timestamp: $(date +%s)" \
  -d '{"type":"PAYMENT_SUCCESS_WEBHOOK","data":{"order":{"order_id":"test"}}}'

# Rate limiting testing
for i in {1..15}; do
  curl -X POST https://your-app.com/functions/v1/cashfree-webhook \
    -H "Content-Type: application/json" \
    -d '{"test":"'$i'"}'
done

# Replay attack testing
curl -X POST https://your-app.com/functions/v1/cashfree-webhook \
  -H "x-webhook-signature: valid_signature" \
  -H "x-webhook-timestamp: $(date -d '2 minutes ago' +%s)" \
  -d '{"type":"PAYMENT_SUCCESS_WEBHOOK","data":{"order":{"order_id":"test"}}}'
```

### **Integration Testing**

```bash
# End-to-end payment flow
npm run test:payment-e2e

# Webhook processing
npm run test:webhook-processing

# Timeout handling
npm run test:payment-timeouts

# Refund processing
npm run test:refund-processing
```

### **Load Testing**

```bash
# Concurrent webhook processing
npm run test:webhook-concurrency

# High-volume payment processing
npm run test:payment-volume

# Database performance under load
npm run test:database-performance
```

---

## 🚨 Rollback Procedures

### **Emergency Rollback**

```bash
# 1. Disable new payments
UPDATE listing_boosts SET status = 'maintenance_mode' WHERE status = 'pending';

# 2. Redirect to maintenance page
# Update frontend to show maintenance mode

# 3. Monitor existing payments
# Keep webhook processing active for existing orders

# 4. Restore when ready
UPDATE listing_boosts SET status = 'pending' WHERE status = 'maintenance_mode';
```

### **Partial Rollback**

```bash
# Rollback specific features while keeping others active
# Example: Disable timeout processing only
DELETE FROM cron_jobs WHERE job_name = 'process-payment-timeouts';
```

---

## 📈 Success Metrics

### **Security Metrics**

```bash
□ Zero successful replay attacks
□ Zero unauthorized payment verifications
□ 100% webhook signature validation success
□ < 1% false positive rate in rate limiting
□ Complete audit trail for all payments
```

### **Performance Metrics**

```bash
□ < 500ms average payment verification time
□ < 2 seconds webhook processing time
□ 99.9% payment processing success rate
□ < 0.1% payment timeout rate
□ Zero payment processing failures
```

### **Business Metrics**

```bash
□ No revenue loss during migration
□ < 5% increase in customer support tickets
□ Maintained payment conversion rate
□ Improved user trust scores
□ Compliance with all financial regulations
```

---

**Implementation Priority**: 🔴 **CRITICAL**

This hardening plan addresses all identified security vulnerabilities and provides a comprehensive framework for secure, reliable payment processing. Implementation should begin immediately with Phase 1 critical fixes.

**Expected Outcome**: ✅ **PRODUCTION-READY PAYMENT SYSTEM**

After implementation, the Cashfree integration will meet enterprise security standards and be ready for production use with full compliance and monitoring capabilities.
