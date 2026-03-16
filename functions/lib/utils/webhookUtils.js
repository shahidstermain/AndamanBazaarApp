"use strict";
/**
 * Utility functions for webhook processing that don't depend on heavy backend libraries.
 * This allows them to be easily tested in frontend environments.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseWebhookEvent = exports.verifyWebhookSignature = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
/**
 * Verify webhook signature using HMAC SHA256
 */
const verifyWebhookSignature = (payload, signature, secretKey) => {
    try {
        const webhookSecret = secretKey || process.env.CASHFREE_WEBHOOK_SECRET;
        if (!webhookSecret) {
            return false;
        }
        const expectedSignature = node_crypto_1.default
            .createHmac('sha256', webhookSecret)
            .update(payload)
            .digest('base64');
        return signature === expectedSignature;
    }
    catch (error) {
        console.error('Webhook signature verification failed', error);
        return false;
    }
};
exports.verifyWebhookSignature = verifyWebhookSignature;
/**
 * Parse webhook event payload
 */
const parseWebhookEvent = (payload) => {
    try {
        if (!payload || typeof payload !== 'string' || payload.trim() === '') {
            throw new Error('Empty payload');
        }
        const event = JSON.parse(payload);
        if (!event || typeof event !== 'object' || Array.isArray(event)) {
            throw new Error('Payload must be a JSON object');
        }
        return event;
    }
    catch (error) {
        throw new Error(`Webhook event parsing failed: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
    }
};
exports.parseWebhookEvent = parseWebhookEvent;
//# sourceMappingURL=webhookUtils.js.map