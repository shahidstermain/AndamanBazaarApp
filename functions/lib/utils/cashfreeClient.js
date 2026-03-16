"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCashfreeClient = exports.createRefund = exports.getCashfreeOrderStatus = exports.createCashfreeOrder = exports.parseWebhookEvent = exports.verifyWebhookSignature = void 0;
const cashfree_pg_1 = require("cashfree-pg");
const v2_1 = require("firebase-functions/v2");
const webhookUtils_1 = require("./webhookUtils");
Object.defineProperty(exports, "verifyWebhookSignature", { enumerable: true, get: function () { return webhookUtils_1.verifyWebhookSignature; } });
Object.defineProperty(exports, "parseWebhookEvent", { enumerable: true, get: function () { return webhookUtils_1.parseWebhookEvent; } });
const secrets_1 = require("./secrets");
// Initialize Cashfree client with environment-specific configuration
const getCashfreeClient = () => {
    const environment = process.env.CASHFREE_ENV || 'sandbox';
    const appId = (0, secrets_1.getRequiredEnv)(secrets_1.SECRET_NAMES.CASHFREE_APP_ID);
    const secretKey = (0, secrets_1.getRequiredEnv)(secrets_1.SECRET_NAMES.CASHFREE_SECRET_KEY);
    return new cashfree_pg_1.Cashfree({
        environment: environment,
        appId,
        secretKey,
    });
};
exports.getCashfreeClient = getCashfreeClient;
// Create order with Cashfree API
const createCashfreeOrder = async (request) => {
    try {
        const cashfree = getCashfreeClient();
        const orderRequest = {
            order_id: request.orderId,
            order_amount: request.orderAmount,
            order_currency: request.orderCurrency,
            customer_details: {
                customer_id: request.customerDetails.customerId,
                customer_email: request.customerDetails.customerEmail,
                customer_phone: request.customerDetails.customerPhone,
            },
            order_notes: request.orderNotes,
            order_meta: request.orderMeta,
        };
        v2_1.logger.info(`Creating Cashfree order: ${request.orderId}`, { orderRequest });
        const response = await cashfree.createOrder(orderRequest);
        v2_1.logger.info(`Cashfree order created successfully: ${response.order_id}`, {
            orderId: response.order_id,
            orderToken: response.order_token,
        });
        return {
            orderId: response.order_id,
            orderAmount: response.order_amount,
            orderCurrency: response.order_currency,
            orderStatus: response.order_status,
            orderToken: response.order_token,
            paymentSessionId: response.order_token,
            cfOrderId: response.cf_order_id,
            orderExpiryTime: response.order_expiry_time,
            payments: response.payments,
        };
    }
    catch (error) {
        v2_1.logger.error(`Failed to create Cashfree order: ${request.orderId}`, error);
        throw new Error(`Cashfree order creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};
exports.createCashfreeOrder = createCashfreeOrder;
// Get order status from Cashfree
const getCashfreeOrderStatus = async (orderId) => {
    try {
        const cashfree = getCashfreeClient();
        v2_1.logger.info(`Fetching Cashfree order status: ${orderId}`);
        const response = await cashfree.getOrderStatus(orderId);
        v2_1.logger.info(`Cashfree order status retrieved: ${orderId}`, {
            orderStatus: response.order_status,
            paymentStatus: response.payments?.[0]?.payment_status,
        });
        return {
            orderId: response.order_id,
            orderAmount: response.order_amount,
            orderCurrency: response.order_currency,
            orderStatus: response.order_status,
            orderToken: response.order_token,
            paymentSessionId: response.order_token,
            cfOrderId: response.cf_order_id,
            orderExpiryTime: response.order_expiry_time,
            payments: response.payments,
        };
    }
    catch (error) {
        v2_1.logger.error(`Failed to fetch Cashfree order status: ${orderId}`, error);
        throw new Error(`Cashfree order status fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};
exports.getCashfreeOrderStatus = getCashfreeOrderStatus;
const createRefund = async (request) => {
    try {
        const cashfree = getCashfreeClient();
        const refundRequest = {
            order_id: request.orderId,
            refund_amount: request.refundAmount,
            refund_id: request.refundId,
            refund_reason: request.refundReason,
        };
        v2_1.logger.info(`Creating refund for order: ${request.orderId}`, { refundRequest });
        const response = await cashfree.refundOrder(refundRequest);
        v2_1.logger.info(`Refund created successfully: ${response.refund_id}`, {
            refundId: response.refund_id,
            refundStatus: response.refund_status,
        });
        return {
            refundId: response.refund_id,
            orderId: response.order_id,
            refundAmount: response.refund_amount,
            refundStatus: response.refund_status,
            refundProcessedAt: response.refund_processed_at,
        };
    }
    catch (error) {
        v2_1.logger.error(`Failed to create refund for order: ${request.orderId}`, error);
        throw new Error(`Refund creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};
exports.createRefund = createRefund;
//# sourceMappingURL=cashfreeClient.js.map