/**
 * Utility functions for webhook processing that don't depend on heavy backend libraries.
 * This allows them to be easily tested in frontend environments.
 */

import crypto from "node:crypto";

/**
 * Interface for Cashfree webhook events (v2025-01-01)
 */
export interface CashfreeWebhookEvent {
  type: string;
  event_time: string;
  data: {
    order: {
      order_id: string;
      order_amount: number;
      order_currency: string;
      order_tags?: any;
    };
    payment?: {
      cf_payment_id: string;
      payment_status: string;
      payment_amount: number;
      payment_currency: string;
      payment_message?: string;
      payment_time?: string;
      bank_reference?: string;
      auth_id?: string;
      payment_method?: any;
      payment_group?: string;
    };
    customer_details?: {
      customer_name?: string;
      customer_id: string;
      customer_email: string;
      customer_phone: string;
    };
    payment_gateway_details?: any;
    payment_offers?: any[];
  };
  // Legacy fields for backward compatibility
  timestamp?: string;
  orderId?: string;
  orderAmount?: number;
  orderCurrency?: string;
  orderStatus?: string;
  paymentId?: string;
  paymentAmount?: number;
  paymentStatus?: string;
  paymentTime?: string;
  paymentCompletionTime?: string;
}

/**
 * Verify webhook signature using HMAC SHA256
 *
 * Per Cashfree v2025-01-01 API:
 * - Signature header: x-webhook-signature
 * - Timestamp header: x-webhook-ts
 * - Signature = base64(HMAC-SHA256(timestamp + rawBody, clientSecret))
 * - Use Client Secret Key (CASHFREE_SECRET_KEY)
 */
export const verifyWebhookSignature = (
  payload: string,
  signature: string,
  secretKey?: string,
  timestamp?: string,
): boolean => {
  try {
    const clientSecret = secretKey || process.env.CASHFREE_SECRET_KEY;

    if (!clientSecret) {
      console.error("CASHFREE_SECRET_KEY not found for webhook verification");
      return false;
    }

    // v2025-01-01: signature = HMAC-SHA256(timestamp + rawBody)
    const signatureData = timestamp ? `${timestamp}${payload}` : payload;

    const expectedSignature = crypto
      .createHmac("sha256", clientSecret)
      .update(signatureData)
      .digest("base64");

    return signature === expectedSignature;
  } catch (error) {
    console.error("Webhook signature verification failed", error);
    return false;
  }
};

/**
 * Parse webhook event payload
 */
export const parseWebhookEvent = (payload: string): CashfreeWebhookEvent => {
  try {
    if (!payload || typeof payload !== "string" || payload.trim() === "") {
      throw new Error("Empty payload");
    }
    const event = JSON.parse(payload);
    if (!event || typeof event !== "object" || Array.isArray(event)) {
      throw new Error("Payload must be a JSON object");
    }

    // Normalize v2025-01-01 format to include legacy fields for backward compatibility
    const normalizedEvent = normalizeWebhookEvent(event);
    return normalizedEvent as CashfreeWebhookEvent;
  } catch (error) {
    throw new Error(
      `Webhook event parsing failed: ${error instanceof Error ? error.message : "Invalid JSON"}`,
    );
  }
};

/**
 * Normalize v2025-01-01 webhook event to include legacy fields
 */
const normalizeWebhookEvent = (event: any): any => {
  // If already has legacy fields, return as is
  if (event.orderId) {
    return event;
  }

  // v2025-01-01 format has nested data structure
  if (event.data && event.data.order) {
    const normalized = {
      ...event,
      timestamp: event.event_time,
      orderId: event.data.order.order_id,
      orderAmount: event.data.order.order_amount,
      orderCurrency: event.data.order.order_currency,
      orderStatus: deriveOrderStatus(
        event.type,
        event.data.payment?.payment_status,
      ),
    };

    // Add payment fields if present
    if (event.data.payment) {
      normalized.paymentId = event.data.payment.cf_payment_id;
      normalized.paymentAmount = event.data.payment.payment_amount;
      normalized.paymentCurrency = event.data.payment.payment_currency;
      normalized.paymentStatus = event.data.payment.payment_status;
      normalized.paymentTime = event.data.payment.payment_time;
      normalized.paymentCompletionTime = event.data.payment.payment_time;
    }

    return normalized;
  }

  return event;
};

/**
 * Derive order status from event type and payment status
 */
const deriveOrderStatus = (
  eventType: string,
  paymentStatus?: string,
): string => {
  if (eventType === "PAYMENT_SUCCESS_WEBHOOK" || paymentStatus === "SUCCESS") {
    return "PAID";
  }
  if (eventType === "PAYMENT_FAILED_WEBHOOK" || paymentStatus === "FAILED") {
    return "ACTIVE";
  }
  if (eventType === "PAYMENT_USER_DROPPED_WEBHOOK") {
    return "ACTIVE";
  }
  return "ACTIVE";
};
