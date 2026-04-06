import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the external dependencies that are not available in the root node_modules
vi.mock('cashfree-pg', () => ({
  Cashfree: vi.fn(),
}));

vi.mock('firebase-admin', () => ({
  default: {
    initializeApp: vi.fn(),
    firestore: vi.fn(),
  },
  initializeApp: vi.fn(),
  firestore: vi.fn(),
}));

vi.mock('firebase-functions/v2', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

import { verifyWebhookSignature, parseWebhookEvent } from '../functions/src/utils/webhookUtils';

describe('Webhook Signature Validation', () => {
  const testSecretKey = 'test_webhook_secret_key_12345';
  const testPayload = JSON.stringify({
    type: 'PAYMENT_SUCCESS',
    timestamp: '2024-01-01T12:00:00Z',
    orderId: 'order_123456',
    orderAmount: 10000,
    orderCurrency: 'INR',
    orderStatus: 'PAID',
    paymentId: 'pay_789012',
    paymentAmount: 10000,
    paymentStatus: 'SUCCESS',
  });

  beforeEach(() => {
    // Reset environment variables
    delete process.env.CASHFREE_SECRET_KEY;
  });

  describe('verifyWebhookSignature', () => {
    it('should validate correct signature', () => {
      const crypto = require('crypto');
      const correctSignature = crypto
        .createHmac('sha256', testSecretKey)
        .update(testPayload)
        .digest('base64');

      const result = verifyWebhookSignature(testPayload, correctSignature, testSecretKey);
      expect(result).toBe(true);
    });

    it('should reject incorrect signature', () => {
      const incorrectSignature = 'invalid_signature_12345';
      
      const result = verifyWebhookSignature(testPayload, incorrectSignature, testSecretKey);
      expect(result).toBe(false);
    });

    it('should use environment secret when not provided', () => {
      process.env.CASHFREE_SECRET_KEY = testSecretKey;
      
      const crypto = require('crypto');
      const correctSignature = crypto
        .createHmac('sha256', testSecretKey)
        .update(testPayload)
        .digest('base64');

      const result = verifyWebhookSignature(testPayload, correctSignature);
      expect(result).toBe(true);
    });

    it('should reject when no secret available', () => {
      const signature = 'some_signature';
      
      const result = verifyWebhookSignature(testPayload, signature);
      expect(result).toBe(false);
    });

    it('should handle empty payload', () => {
      const emptyPayload = '';
      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', testSecretKey)
        .update(emptyPayload)
        .digest('base64');

      const result = verifyWebhookSignature(emptyPayload, signature, testSecretKey);
      expect(result).toBe(true);
    });

    it('should handle special characters in payload', () => {
      const specialPayload = JSON.stringify({
        type: 'PAYMENT_SUCCESS',
        message: 'Payment with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?',
        orderId: 'order_123',
      });
      
      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', testSecretKey)
        .update(specialPayload)
        .digest('base64');

      const result = verifyWebhookSignature(specialPayload, signature, testSecretKey);
      expect(result).toBe(true);
    });

    it('should be case-sensitive', () => {
      const crypto = require('crypto');
      const correctSignature = crypto
        .createHmac('sha256', testSecretKey)
        .update(testPayload)
        .digest('base64');

      // Base64 can contain non-alphabetic characters at the start.
      // To ensure it's different and test case sensitivity, we'll swap a letter
      // or just flip the case of the whole string and ensure it's different.
      const incorrectCaseSignature = correctSignature.toLowerCase() === correctSignature 
        ? correctSignature.toUpperCase() 
        : correctSignature.toLowerCase();
      
      // If by some miracle they are still the same (e.g. no letters), append one
      const finalIncorrectSignature = incorrectCaseSignature === correctSignature 
        ? correctSignature + 'a' 
        : incorrectCaseSignature;

      const result = verifyWebhookSignature(testPayload, finalIncorrectSignature, testSecretKey);
      expect(result).toBe(false);
    });

    it('should handle different payload formats', () => {
      const jsonPayload = JSON.stringify({ test: 'value' });
      const stringPayload = 'plain string payload';
      
      const crypto = require('crypto');
      const jsonSignature = crypto
        .createHmac('sha256', testSecretKey)
        .update(jsonPayload)
        .digest('base64');
      
      const stringSignature = crypto
        .createHmac('sha256', testSecretKey)
        .update(stringPayload)
        .digest('base64');

      expect(verifyWebhookSignature(jsonPayload, jsonSignature, testSecretKey)).toBe(true);
      expect(verifyWebhookSignature(stringPayload, stringSignature, testSecretKey)).toBe(true);
      expect(verifyWebhookSignature(jsonPayload, stringSignature, testSecretKey)).toBe(false);
    });
  });

  describe('parseWebhookEvent', () => {
    it('should parse valid JSON payload', () => {
      const event = parseWebhookEvent(testPayload);
      
      expect(event).toEqual({
        type: 'PAYMENT_SUCCESS',
        timestamp: '2024-01-01T12:00:00Z',
        orderId: 'order_123456',
        orderAmount: 10000,
        orderCurrency: 'INR',
        orderStatus: 'PAID',
        paymentId: 'pay_789012',
        paymentAmount: 10000,
        paymentStatus: 'SUCCESS',
      });
    });

    it('should handle payment success event', () => {
      const paymentSuccessPayload = JSON.stringify({
        type: 'PAYMENT_SUCCESS',
        timestamp: '2024-01-01T12:00:00Z',
        orderId: 'order_123',
        orderAmount: 5000,
        orderCurrency: 'INR',
        orderStatus: 'PAID',
        paymentId: 'pay_456',
        paymentAmount: 5000,
        paymentCurrency: 'INR',
        paymentStatus: 'SUCCESS',
        paymentTime: '2024-01-01T12:05:00Z',
      });

      const event = parseWebhookEvent(paymentSuccessPayload);
      
      expect(event.type).toBe('PAYMENT_SUCCESS');
      expect(event.orderStatus).toBe('PAID');
      expect(event.paymentStatus).toBe('SUCCESS');
      expect(event.paymentAmount).toBe(5000);
    });

    it('should handle payment failed event', () => {
      const paymentFailedPayload = JSON.stringify({
        type: 'PAYMENT_FAILED',
        timestamp: '2024-01-01T12:00:00Z',
        orderId: 'order_123',
        orderAmount: 5000,
        orderCurrency: 'INR',
        orderStatus: 'ACTIVE',
        paymentId: 'pay_456',
        paymentAmount: 0,
        paymentCurrency: 'INR',
        paymentStatus: 'FAILED',
        paymentTime: '2024-01-01T12:05:00Z',
      });

      const event = parseWebhookEvent(paymentFailedPayload);
      
      expect(event.type).toBe('PAYMENT_FAILED');
      expect(event.orderStatus).toBe('ACTIVE');
      expect(event.paymentStatus).toBe('FAILED');
      expect(event.paymentAmount).toBe(0);
    });

    it('should handle order cancelled event', () => {
      const orderCancelledPayload = JSON.stringify({
        type: 'ORDER_CANCELLED',
        timestamp: '2024-01-01T12:00:00Z',
        orderId: 'order_123',
        orderAmount: 5000,
        orderCurrency: 'INR',
        orderStatus: 'CANCELLED',
      });

      const event = parseWebhookEvent(orderCancelledPayload);
      
      expect(event.type).toBe('ORDER_CANCELLED');
      expect(event.orderStatus).toBe('CANCELLED');
      expect(event.paymentStatus).toBeUndefined();
    });

    it('should handle order expired event', () => {
      const orderExpiredPayload = JSON.stringify({
        type: 'ORDER_EXPIRED',
        timestamp: '2024-01-01T12:00:00Z',
        orderId: 'order_123',
        orderAmount: 5000,
        orderCurrency: 'INR',
        orderStatus: 'EXPIRED',
      });

      const event = parseWebhookEvent(orderExpiredPayload);
      
      expect(event.type).toBe('ORDER_EXPIRED');
      expect(event.orderStatus).toBe('EXPIRED');
      expect(event.paymentStatus).toBeUndefined();
    });

    it('should throw error for invalid JSON', () => {
      const invalidPayload = 'invalid json payload';
      
      expect(() => {
        parseWebhookEvent(invalidPayload);
      }).toThrow('Webhook event parsing failed');
    });

    it('should handle empty JSON object', () => {
      const emptyPayload = '{}';
      
      const event = parseWebhookEvent(emptyPayload);
      expect(event).toEqual({});
    });

    it('should handle additional fields', () => {
      const payloadWithExtraFields = JSON.stringify({
        type: 'PAYMENT_SUCCESS',
        timestamp: '2024-01-01T12:00:00Z',
        orderId: 'order_123',
        orderAmount: 5000,
        orderCurrency: 'INR',
        orderStatus: 'PAID',
        customField1: 'custom_value_1',
        customField2: 123,
        nestedObject: {
          field1: 'value1',
          field2: 'value2',
        },
      });

      const event = parseWebhookEvent(payloadWithExtraFields);
      
      expect(event.type).toBe('PAYMENT_SUCCESS');
      expect(event.customField1).toBe('custom_value_1');
      expect(event.customField2).toBe(123);
      expect(event.nestedObject).toEqual({
        field1: 'value1',
        field2: 'value2',
      });
    });

    it('should handle null and undefined values', () => {
      const payloadWithNulls = JSON.stringify({
        type: 'PAYMENT_SUCCESS',
        timestamp: '2024-01-01T12:00:00Z',
        orderId: 'order_123',
        orderAmount: 5000,
        orderCurrency: 'INR',
        orderStatus: 'PAID',
        paymentId: null,
        paymentAmount: undefined,
        paymentStatus: 'SUCCESS',
      });

      const event = parseWebhookEvent(payloadWithNulls);
      
      expect(event.paymentId).toBe(null);
      expect(event.paymentAmount).toBe(undefined);
      expect(event.paymentStatus).toBe('SUCCESS');
    });
  });

  describe('Integration Tests', () => {
    it('should validate signature and parse event together', () => {
      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', testSecretKey)
        .update(testPayload)
        .digest('base64');

      // First validate signature
      const isValidSignature = verifyWebhookSignature(testPayload, signature, testSecretKey);
      expect(isValidSignature).toBe(true);

      // Then parse event
      const event = parseWebhookEvent(testPayload);
      expect(event.type).toBe('PAYMENT_SUCCESS');
      expect(event.orderId).toBe('order_123456');
    });

    it('should handle complete webhook flow', () => {
      // Simulate webhook processing flow
      const crypto = require('crypto');
      
      const webhookPayload = JSON.stringify({
        type: 'PAYMENT_SUCCESS',
        timestamp: new Date().toISOString(),
        orderId: 'order_integration_test',
        orderAmount: 7500,
        orderCurrency: 'INR',
        orderStatus: 'PAID',
        paymentId: 'pay_integration_123',
        paymentAmount: 7500,
        paymentStatus: 'SUCCESS',
      });

      const signature = crypto
        .createHmac('sha256', testSecretKey)
        .update(webhookPayload)
        .digest('base64');

      // Step 1: Verify signature
      const isSignatureValid = verifyWebhookSignature(webhookPayload, signature, testSecretKey);
      expect(isSignatureValid).toBe(true);

      // Step 2: Parse event
      const event = parseWebhookEvent(webhookPayload);
      expect(event.type).toBe('PAYMENT_SUCCESS');
      expect(event.orderId).toBe('order_integration_test');
      expect(event.orderAmount).toBe(7500);

      // Step 3: Validate required fields
      expect(event.orderId).toBeDefined();
      expect(event.orderStatus).toBeDefined();
      expect(event.timestamp).toBeDefined();
    });
  });

  describe('Security Tests', () => {
    it('should reject tampered payload', () => {
      const originalPayload = JSON.stringify({
        type: 'PAYMENT_SUCCESS',
        orderId: 'order_123',
        amount: 10000,
      });

      const tamperedPayload = JSON.stringify({
        type: 'PAYMENT_SUCCESS',
        orderId: 'order_123',
        amount: 1, // Tampered amount
      });

      const crypto = require('crypto');
      const originalSignature = crypto
        .createHmac('sha256', testSecretKey)
        .update(originalPayload)
        .digest('base64');

      // Use original signature with tampered payload
      const result = verifyWebhookSignature(tamperedPayload, originalSignature, testSecretKey);
      expect(result).toBe(false);
    });

    it('should reject signature with wrong secret', () => {
      const wrongSecret = 'wrong_secret_key';
      const crypto = require('crypto');
      
      const signature = crypto
        .createHmac('sha256', wrongSecret)
        .update(testPayload)
        .digest('base64');

      const result = verifyWebhookSignature(testPayload, signature, testSecretKey);
      expect(result).toBe(false);
    });

    it('should handle timing attack resistance', () => {
      const crypto = require('crypto');
      const correctSignature = crypto
        .createHmac('sha256', testSecretKey)
        .update(testPayload)
        .digest('base64');

      const incorrectSignature = 'incorrect_signature';

      // Both should complete quickly (no early exit)
      const start1 = Date.now();
      const result1 = verifyWebhookSignature(testPayload, correctSignature, testSecretKey);
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      const result2 = verifyWebhookSignature(testPayload, incorrectSignature, testSecretKey);
      const time2 = Date.now() - start2;

      expect(result1).toBe(true);
      expect(result2).toBe(false);
      
      // Both should take similar time (within reasonable margin)
      expect(Math.abs(time1 - time2)).toBeLessThan(100); // 100ms margin
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long payloads', () => {
      const longPayload = JSON.stringify({
        type: 'PAYMENT_SUCCESS',
        orderId: 'order_123',
        data: 'x'.repeat(10000), // Long string
      });

      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', testSecretKey)
        .update(longPayload)
        .digest('base64');

      const result = verifyWebhookSignature(longPayload, signature, testSecretKey);
      expect(result).toBe(true);
    });

    it('should handle unicode characters', () => {
      const unicodePayload = JSON.stringify({
        type: 'PAYMENT_SUCCESS',
        orderId: 'order_123',
        message: 'Payment with unicode: 🚀 💳 ₹₹₹',
        customer: 'नमस्ते 世界',
      });

      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', testSecretKey)
        .update(unicodePayload)
        .digest('base64');

      const result = verifyWebhookSignature(unicodePayload, signature, testSecretKey);
      expect(result).toBe(true);

      const event = parseWebhookEvent(unicodePayload);
      expect(event.message).toBe('Payment with unicode: 🚀 💳 ₹₹₹');
      expect(event.customer).toBe('नमस्ते 世界');
    });

    it('should handle malformed JSON gracefully', () => {
      const malformedPayloads = [
        '{"type": "PAYMENT_SUCCESS"', // Missing closing brace
        '{"type": "PAYMENT_SUCCESS",}', // Extra comma
        'null',
        'undefined',
        '""',
        '{"nested": {"incomplete": true', // Nested incomplete
      ];

      malformedPayloads.forEach(payload => {
        expect(() => {
          parseWebhookEvent(payload);
        }).toThrow();
      });
    });
  });
});
