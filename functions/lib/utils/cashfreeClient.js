"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeCashfree = exports.Cashfree = exports.createRefund = exports.getCashfreeOrderStatus = exports.createCashfreeOrder = exports.parseWebhookEvent = exports.verifyWebhookSignature = void 0;
const cashfree_pg_1 = require("cashfree-pg");
Object.defineProperty(exports, "Cashfree", { enumerable: true, get: function () { return cashfree_pg_1.Cashfree; } });
const v2_1 = require("firebase-functions/v2");
const webhookUtils_1 = require("./webhookUtils");
Object.defineProperty(exports, "verifyWebhookSignature", { enumerable: true, get: function () { return webhookUtils_1.verifyWebhookSignature; } });
Object.defineProperty(exports, "parseWebhookEvent", { enumerable: true, get: function () { return webhookUtils_1.parseWebhookEvent; } });
const secrets_1 = require("./secrets");
// Initialize Cashfree client with environment-specific configuration
const initializeCashfree = () => {
    cashfree_pg_1.Cashfree.XClientId = (0, secrets_1.getRequiredEnv)(secrets_1.SECRET_NAMES.CASHFREE_APP_ID);
    cashfree_pg_1.Cashfree.XClientSecret = (0, secrets_1.getRequiredEnv)(secrets_1.SECRET_NAMES.CASHFREE_SECRET_KEY);
    cashfree_pg_1.Cashfree.XEnvironment = process.env.CASHFREE_ENV === 'production'
        ? cashfree_pg_1.Cashfree.Environment.PRODUCTION
        : cashfree_pg_1.Cashfree.Environment.SANDBOX;
    cashfree_pg_1.Cashfree.XApiVersion = '2025-01-01';
};
exports.initializeCashfree = initializeCashfree;
const mapPaymentEntity = (payment) => ({
    cfPaymentId: String(payment.cf_payment_id ?? ''),
    orderAmount: payment.order_amount ?? 0,
    paymentStatus: payment.payment_status ?? 'PENDING',
    paymentAmount: payment.payment_amount ?? 0,
    paymentTime: payment.payment_time ?? '',
    paymentCompletionTime: payment.payment_completion_time ?? '',
});
// Create order with Cashfree API
const createCashfreeOrder = async (request) => {
    try {
        initializeCashfree();
        const orderRequest = {
            order_id: request.orderId,
            order_amount: request.orderAmount,
            order_currency: request.orderCurrency,
            customer_details: {
                customer_id: request.customerDetails.customerId,
                customer_email: request.customerDetails.customerEmail,
                customer_phone: request.customerDetails.customerPhone ?? '',
            },
            order_note: request.orderNotes,
            order_meta: request.orderMeta,
        };
        v2_1.logger.info(`Creating Cashfree order: ${request.orderId}`, { orderRequest });
        const response = await cashfree_pg_1.Cashfree.PGCreateOrder('2025-01-01', orderRequest);
        const responseData = response.data;
        v2_1.logger.info(`Cashfree order created successfully: ${responseData.cf_order_id}`, {
            orderId: responseData.cf_order_id,
            orderStatus: responseData.order_status,
        });
        return {
            orderId: responseData.order_id ?? request.orderId,
            orderAmount: responseData.order_amount ?? request.orderAmount,
            orderCurrency: responseData.order_currency ?? request.orderCurrency,
            orderStatus: responseData.order_status ?? 'ACTIVE',
            orderToken: responseData.payment_session_id ?? '',
            paymentSessionId: responseData.payment_session_id ?? '',
            cfOrderId: String(responseData.cf_order_id ?? ''),
            orderExpiryTime: responseData.order_expiry_time ?? '',
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
        initializeCashfree();
        v2_1.logger.info(`Fetching Cashfree order status: ${orderId}`);
        const response = await cashfree_pg_1.Cashfree.PGFetchOrder('2025-01-01', orderId);
        const responseData = response.data;
        const paymentsResponse = await cashfree_pg_1.Cashfree.PGOrderFetchPayments('2025-01-01', orderId);
        const payments = (paymentsResponse.data ?? []).map(mapPaymentEntity);
        v2_1.logger.info(`Cashfree order status retrieved: ${orderId}`, {
            orderStatus: responseData.order_status,
            paymentStatus: payments[0]?.paymentStatus,
        });
        return {
            orderId: responseData.order_id ?? orderId,
            orderAmount: responseData.order_amount ?? 0,
            orderCurrency: responseData.order_currency ?? 'INR',
            orderStatus: responseData.order_status ?? 'ACTIVE',
            orderToken: responseData.payment_session_id ?? '',
            paymentSessionId: responseData.payment_session_id ?? '',
            cfOrderId: String(responseData.cf_order_id ?? ''),
            orderExpiryTime: responseData.order_expiry_time ?? '',
            payments,
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
        initializeCashfree();
        const refundRequest = {
            refund_amount: request.refundAmount,
            refund_id: request.refundId ?? `refund_${request.orderId}_${Date.now()}`,
            refund_note: request.refundReason,
        };
        v2_1.logger.info(`Creating refund for order: ${request.orderId}`, { refundRequest });
        const response = await cashfree_pg_1.Cashfree.PGOrderCreateRefund('2025-01-01', request.orderId, refundRequest);
        const responseData = response.data;
        v2_1.logger.info(`Refund created successfully: ${responseData.cf_refund_id}`, {
            refundId: responseData.cf_refund_id,
            refundStatus: responseData.refund_status,
        });
        return {
            refundId: responseData.cf_refund_id ?? refundRequest.refund_id,
            orderId: responseData.order_id ?? request.orderId,
            refundAmount: responseData.refund_amount ?? request.refundAmount,
            refundStatus: responseData.refund_status ?? 'PENDING',
            refundProcessedAt: responseData.processed_at,
        };
    }
    catch (error) {
        v2_1.logger.error(`Failed to create refund for order: ${request.orderId}`, error);
        throw new Error(`Refund creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};
exports.createRefund = createRefund;
//# sourceMappingURL=cashfreeClient.js.map