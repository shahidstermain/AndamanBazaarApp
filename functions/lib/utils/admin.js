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
exports.admin = void 0;
const admin = __importStar(require("firebase-admin"));
exports.admin = admin;
const v2_1 = require("firebase-functions/v2");
const secrets_1 = require("./secrets");
const initializeAdmin = () => {
    if (admin.apps.length > 0) {
        return;
    }
    const serviceAccountJson = process.env[secrets_1.SECRET_NAMES.GCP_SERVICE_ACCOUNT_JSON];
    if (!serviceAccountJson) {
        admin.initializeApp();
        return;
    }
    try {
        const parsed = JSON.parse(serviceAccountJson);
        if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
            throw new Error('Service account JSON is missing required fields');
        }
        admin.initializeApp({
            credential: admin.credential.cert(parsed),
        });
    }
    catch (error) {
        v2_1.logger.error('Failed to initialize Firebase Admin from service-account secret', error);
        throw new Error(`Invalid ${secrets_1.SECRET_NAMES.GCP_SERVICE_ACCOUNT_JSON} value. Rotate and set a valid JSON service account secret.`);
    }
};
initializeAdmin();
//# sourceMappingURL=admin.js.map