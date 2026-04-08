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
exports.verifyLocation = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
// Ensure Firebase is initialized
if (!admin.apps.length) {
    admin.initializeApp();
}
// Andaman & Nicobar Islands geofence boundaries
const ANDAMAN_BOUNDS = {
    minLat: 6.5,
    maxLat: 14.0,
    minLng: 92.0,
    maxLng: 94.5,
};
// Rate limiting config
const RATE_LIMIT_CONFIG = {
    maxAttemptsPerHour: 5,
    blockDurationHours: 24,
    maxTotalFailures: 10,
};
// Verification expiration (90 days in milliseconds)
const VERIFICATION_EXPIRATION_DAYS = 90;
function isWithinAndamanBounds(lat, lng) {
    return (lat >= ANDAMAN_BOUNDS.minLat &&
        lat <= ANDAMAN_BOUNDS.maxLat &&
        lng >= ANDAMAN_BOUNDS.minLng &&
        lng <= ANDAMAN_BOUNDS.maxLng);
}
async function getIpGeolocation(ip) {
    if (!ip || ip === "unknown" || ip.startsWith("127.") || ip.startsWith("192.168.") || ip.startsWith("10.")) {
        return null;
    }
    try {
        const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,lat,lon,isp`, { signal: AbortSignal.timeout(5000) });
        if (!response.ok) {
            console.warn("IP geolocation request failed:", response.status);
            return null;
        }
        const data = (await response.json());
        if (data.status === "success") {
            return data;
        }
        return null;
    }
    catch (error) {
        console.warn("IP geolocation error:", error);
        return null;
    }
}
exports.verifyLocation = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated to verify location.");
    }
    const uid = request.auth.uid;
    const { latitude, longitude } = request.data;
    // Validate coordinates
    if (typeof latitude !== "number" ||
        typeof longitude !== "number" ||
        isNaN(latitude) ||
        isNaN(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180) {
        throw new https_1.HttpsError("invalid-argument", "Invalid coordinates provided.");
    }
    const db = admin.firestore();
    // Rate Limiting Check (Simple Implementation using a subcollection)
    const rateLimitRef = db.collection("rate_limits").doc(`location_${uid}`);
    const rateLimitDoc = await rateLimitRef.get();
    const now = Date.now();
    if (rateLimitDoc.exists) {
        const data = rateLimitDoc.data();
        if (data?.blockedUntil && now < data.blockedUntil) {
            throw new https_1.HttpsError("resource-exhausted", "Too many attempts. Please try again later.");
        }
        // Reset counters if outside hour window
        if (data?.lastAttemptAt && (now - data.lastAttemptAt > 60 * 60 * 1000)) {
            await rateLimitRef.update({ attempts: 0 });
        }
        else if (data && data.attempts >= RATE_LIMIT_CONFIG.maxAttemptsPerHour) {
            // Block for configured hours
            const blockDuration = RATE_LIMIT_CONFIG.blockDurationHours * 60 * 60 * 1000;
            await rateLimitRef.update({ blockedUntil: now + blockDuration });
            await db.collection("audit_logs").add({
                user_id: uid,
                action: "location_verification_rate_limited",
                status: "blocked",
                created_at: new Date().toISOString()
            });
            throw new https_1.HttpsError("resource-exhausted", "Too many attempts. Please try again later.");
        }
    }
    // Record an attempt
    await rateLimitRef.set({
        attempts: admin.firestore.FieldValue.increment(1),
        lastAttemptAt: now
    }, { merge: true });
    // Extract IP
    const forwarded = request.rawRequest?.headers["x-forwarded-for"];
    const realIp = request.rawRequest?.headers["x-real-ip"];
    const clientIp = forwarded ? forwarded.split(",")[0].trim() : (realIp || request.rawRequest?.ip || "unknown");
    // Get IP Geolocation
    const ipGeoData = await getIpGeolocation(clientIp);
    // Perform geofence check
    const isWithinAndaman = isWithinAndamanBounds(latitude, longitude);
    // Perform IP cross-check
    let ipCheckPassed = true;
    let ipWarning = null;
    if (ipGeoData) {
        const isIndianIp = ipGeoData.countryCode === "IN";
        if (!isIndianIp) {
            ipCheckPassed = false;
            ipWarning = "IP address is not from India";
        }
        else {
            const ipDistanceFromGps = Math.sqrt(Math.pow(ipGeoData.lat - latitude, 2) + Math.pow(ipGeoData.lon - longitude, 2));
            if (ipDistanceFromGps > 10) {
                ipWarning = "IP location differs significantly from GPS coordinates";
            }
        }
    }
    const isVerified = isWithinAndaman && ipCheckPassed;
    const timestamp = new Date().toISOString();
    if (isVerified) {
        // Update profile
        await db.collection("profiles").doc(uid).set({
            is_location_verified: true,
            location_verified_at: timestamp,
            location_data: {
                lat: latitude,
                lng: longitude,
                ip: clientIp,
                country: ipGeoData?.countryCode || null
            }
        }, { merge: true });
        // Success Audit Log
        await db.collection("audit_logs").add({
            user_id: uid,
            action: "location_verification_success",
            status: "success",
            created_at: timestamp,
            metadata: { latitude, longitude, ip: clientIp, ip_country: ipGeoData?.countryCode, ip_warning: ipWarning }
        });
        // Reset rate limits on success
        await rateLimitRef.delete();
        return {
            success: true,
            verified: true,
            message: "Island residency verified successfully!",
            warning: ipWarning,
            expiresAt: new Date(now + VERIFICATION_EXPIRATION_DAYS * 24 * 60 * 60 * 1000).toISOString(),
        };
    }
    else {
        const failureReason = !isWithinAndaman
            ? "Location is outside Andaman & Nicobar Islands"
            : "IP verification failed";
        // Failure Audit Log
        await db.collection("audit_logs").add({
            user_id: uid,
            action: "location_verification_failed",
            status: "failed",
            created_at: timestamp,
            metadata: { latitude, longitude, ip: clientIp, ip_country: ipGeoData?.countryCode, reason: failureReason }
        });
        return {
            success: false,
            verified: false,
            error: failureReason,
            code: !isWithinAndaman ? "OUTSIDE_GEOFENCE" : "IP_CHECK_FAILED"
        };
    }
});
//# sourceMappingURL=verifyLocation.js.map