"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRequiredEnv = exports.MODERATION_SECRET_BINDINGS = exports.CASHFREE_SECRET_BINDINGS = exports.ADMIN_SECRET_BINDINGS = exports.SECRET_NAMES = void 0;
exports.SECRET_NAMES = {
    GCP_SERVICE_ACCOUNT_JSON: 'GCP_SERVICE_ACCOUNT_JSON',
    GEMINI_API_KEY: 'GEMINI_API_KEY',
    CASHFREE_APP_ID: 'CASHFREE_APP_ID',
    CASHFREE_SECRET_KEY: 'CASHFREE_SECRET_KEY',
    CASHFREE_WEBHOOK_SECRET: 'CASHFREE_WEBHOOK_SECRET',
};
exports.ADMIN_SECRET_BINDINGS = [
    exports.SECRET_NAMES.GCP_SERVICE_ACCOUNT_JSON,
];
exports.CASHFREE_SECRET_BINDINGS = [
    exports.SECRET_NAMES.GCP_SERVICE_ACCOUNT_JSON,
    exports.SECRET_NAMES.CASHFREE_APP_ID,
    exports.SECRET_NAMES.CASHFREE_SECRET_KEY,
    exports.SECRET_NAMES.CASHFREE_WEBHOOK_SECRET,
];
exports.MODERATION_SECRET_BINDINGS = [
    exports.SECRET_NAMES.GCP_SERVICE_ACCOUNT_JSON,
    exports.SECRET_NAMES.GEMINI_API_KEY,
];
const getRequiredEnv = (name) => {
    const value = process.env[name];
    if (!value || value.trim() === '') {
        throw new Error(`${name} is not configured`);
    }
    return value;
};
exports.getRequiredEnv = getRequiredEnv;
//# sourceMappingURL=secrets.js.map