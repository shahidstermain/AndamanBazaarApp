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
exports.cleanupOldData = exports.handleWebhook = exports.healthCheck = exports.verifyBoostPayment = exports.createBoostOrder = exports.getPaymentDetails = exports.getPaymentHistoryNew = exports.checkPaymentStatus = exports.webhookHealthCheck = exports.cashfreeWebhookV2 = exports.cleanupExpiredReservations = exports.createOrder = exports.getModerationStats = exports.getModerationHistory = exports.batchModerateContent = exports.moderateContent = exports.getNearbyListings = exports.getLocationHistory = exports.verifyLocation = exports.getPaymentHistory = exports.refundPayment = exports.cashfreeWebhook = exports.verifyPayment = exports.createPayment = void 0;
const functions = __importStar(require("firebase-functions"));
// Import all function modules
const payment_1 = require("./payment");
Object.defineProperty(exports, "createPayment", { enumerable: true, get: function () { return payment_1.createPayment; } });
Object.defineProperty(exports, "verifyPayment", { enumerable: true, get: function () { return payment_1.verifyPayment; } });
Object.defineProperty(exports, "cashfreeWebhook", { enumerable: true, get: function () { return payment_1.cashfreeWebhook; } });
Object.defineProperty(exports, "refundPayment", { enumerable: true, get: function () { return payment_1.refundPayment; } });
Object.defineProperty(exports, "getPaymentHistory", { enumerable: true, get: function () { return payment_1.getPaymentHistory; } });
const location_1 = require("./location");
Object.defineProperty(exports, "verifyLocation", { enumerable: true, get: function () { return location_1.verifyLocation; } });
Object.defineProperty(exports, "getLocationHistory", { enumerable: true, get: function () { return location_1.getLocationHistory; } });
Object.defineProperty(exports, "getNearbyListings", { enumerable: true, get: function () { return location_1.getNearbyListings; } });
const moderation_1 = require("./moderation");
Object.defineProperty(exports, "moderateContent", { enumerable: true, get: function () { return moderation_1.moderateContent; } });
Object.defineProperty(exports, "batchModerateContent", { enumerable: true, get: function () { return moderation_1.batchModerateContent; } });
Object.defineProperty(exports, "getModerationHistory", { enumerable: true, get: function () { return moderation_1.getModerationHistory; } });
Object.defineProperty(exports, "getModerationStats", { enumerable: true, get: function () { return moderation_1.getModerationStats; } });
// Import new payment functions
const createOrder_1 = require("./payments/createOrder");
Object.defineProperty(exports, "createOrder", { enumerable: true, get: function () { return createOrder_1.createOrder; } });
Object.defineProperty(exports, "cleanupExpiredReservations", { enumerable: true, get: function () { return createOrder_1.cleanupExpiredReservations; } });
const cashfreeWebhook_1 = require("./payments/cashfreeWebhook");
Object.defineProperty(exports, "cashfreeWebhookV2", { enumerable: true, get: function () { return cashfreeWebhook_1.cashfreeWebhook; } });
Object.defineProperty(exports, "webhookHealthCheck", { enumerable: true, get: function () { return cashfreeWebhook_1.webhookHealthCheck; } });
const checkPaymentStatus_1 = require("./payments/checkPaymentStatus");
Object.defineProperty(exports, "checkPaymentStatus", { enumerable: true, get: function () { return checkPaymentStatus_1.checkPaymentStatus; } });
Object.defineProperty(exports, "getPaymentHistoryNew", { enumerable: true, get: function () { return checkPaymentStatus_1.getPaymentHistory; } });
Object.defineProperty(exports, "getPaymentDetails", { enumerable: true, get: function () { return checkPaymentStatus_1.getPaymentDetails; } });
// Import boost payment functions
const createBoostOrder_1 = require("./payments/createBoostOrder");
Object.defineProperty(exports, "createBoostOrder", { enumerable: true, get: function () { return createBoostOrder_1.createBoostOrder; } });
const verifyBoostPayment_1 = require("./payments/verifyBoostPayment");
Object.defineProperty(exports, "verifyBoostPayment", { enumerable: true, get: function () { return verifyBoostPayment_1.verifyBoostPayment; } });
// Health check function
exports.healthCheck = functions.https.onRequest(async (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
    });
});
// General webhook handler
exports.handleWebhook = functions.https.onRequest(async (req, res) => {
    const webhookType = req.headers['x-webhook-type'];
    const payload = req.body;
    try {
        switch (webhookType) {
            case 'cashfree':
                return await (0, payment_1.cashfreeWebhook)(req, res);
            default:
                console.error('Unknown webhook type:', webhookType);
                return res.status(400).send('Unknown webhook type');
        }
    }
    catch (error) {
        console.error('Error handling webhook:', error);
        res.status(500).send('Webhook processing failed');
    }
});
// Scheduled tasks
exports.cleanupOldData = functions.pubsub
    .schedule('every 24 hours')
    .onRun(async (context) => {
    // This function will be implemented by individual modules
    // Each module exports its own cleanup functions
    console.log('Running scheduled cleanup tasks');
});
//# sourceMappingURL=index.js.map