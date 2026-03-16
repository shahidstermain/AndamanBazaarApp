
/**
 * Utility functions for webhook processing that don't depend on heavy backend libraries.
 * This allows them to be easily tested in frontend environments.
 */

import crypto from 'node:crypto';

/**
 * Interface for Cashfree webhook events
 */
export interface CashfreeWebhookEvent {
  type: string;
  timestamp: string;
  orderId: string;
  orderAmount: number;
  orderCurrency: string;
  orderStatus: string;
  paymentId?: string;
  paymentAmount?: number;
  paymentCurrency?: string;
  paymentStatus?: string;
  paymentTime?: string;
  signature?: string;
  [key: string]: any;
}

/**
 * Verify webhook signature using HMAC SHA256
 */
export const verifyWebhookSignature = (payload: string, signature: string, secretKey?: string): boolean => {
  try {
    const webhookSecret = secretKey || process.env.CASHFREE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('base64');

    return signature === expectedSignature;
  } catch (error) {
    console.error('Webhook signature verification failed', error);
    return false;
  }
};

/**
 * Parse webhook event payload
 */
export const parseWebhookEvent = (payload: string): CashfreeWebhookEvent => {
  try {
    if (!payload || typeof payload !== 'string' || payload.trim() === '') {
      throw new Error('Empty payload');
    }
    const event = JSON.parse(payload);
    if (!event || typeof event !== 'object' || Array.isArray(event)) {
      throw new Error('Payload must be a JSON object');
    }
    return event as CashfreeWebhookEvent;
  } catch (error) {
    throw new Error(`Webhook event parsing failed: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
  }
};
