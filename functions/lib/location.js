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
exports.cleanupLocationVerifications = exports.sendLocationBasedNotifications = exports.getNearbyListings = exports.getLocationHistory = exports.verifyLocation = void 0;
const functions = __importStar(require("firebase-functions"));
const admin_1 = require("./utils/admin");
const secrets_1 = require("./utils/secrets");
const locationRuntime = functions.runWith({ secrets: secrets_1.ADMIN_SECRET_BINDINGS });
// Andaman Islands cities with their coordinates
const ANDAMAN_CITIES = [
    { name: 'Port Blair', lat: 11.6234, lng: 92.7325, radius: 15 },
    { name: 'Diglipur', lat: 13.2833, lng: 93.1167, radius: 10 },
    { name: 'Mayabunder', lat: 12.9333, lng: 92.9167, radius: 10 },
    { name: 'Rangat', lat: 12.5167, lng: 92.9833, radius: 10 },
    { name: 'Havelock', lat: 12.0167, lng: 93.0167, radius: 8 },
    { name: 'Neil Island', lat: 11.8333, lng: 93.0667, radius: 8 },
    { name: 'Long Island', lat: 12.2833, lng: 92.9333, radius: 8 },
    { name: 'Little Andaman', lat: 10.9500, lng: 92.4167, radius: 12 },
];
// Verify Location
exports.verifyLocation = locationRuntime.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { latitude, longitude, accuracy, timestamp } = data;
    try {
        // Validate input
        if (!latitude || !longitude || !accuracy) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing location data');
        }
        // Check if GPS accuracy is reasonable (within 100 meters)
        if (accuracy > 100) {
            return {
                success: true,
                verified: false,
                error: 'GPS accuracy too low',
                distance: accuracy,
            };
        }
        // Find nearest city
        let nearestCity = null;
        let minDistance = Infinity;
        for (const city of ANDAMAN_CITIES) {
            const distance = calculateDistance(latitude, longitude, city.lat, city.lng);
            if (distance < minDistance) {
                minDistance = distance;
                nearestCity = city;
            }
        }
        // Check if user is within any Andaman city radius
        const isWithinAndaman = nearestCity && minDistance <= nearestCity.radius;
        // Additional IP-based verification
        const ipLocation = await getIPLocation(context.rawRequest);
        const ipMatchesAndaman = ipLocation?.country === 'IN' &&
            (ipLocation.region?.includes('Andaman') || ipLocation.city?.includes('Port Blair'));
        // Final verification decision
        const verified = isWithinAndaman && ipMatchesAndaman;
        // Store verification attempt
        await admin_1.admin.firestore().collection('location_verifications').add({
            userId: context.auth.uid,
            latitude,
            longitude,
            accuracy,
            timestamp: new Date(timestamp),
            verified,
            nearestCity: nearestCity?.name,
            distance: minDistance,
            ipInfo: ipLocation,
            createdAt: admin_1.admin.firestore.FieldValue.serverTimestamp(),
        });
        // Update user's location verification status
        await admin_1.admin.firestore().collection('users').doc(context.auth.uid).update({
            locationVerified: verified,
            lastLocationVerification: admin_1.admin.firestore.FieldValue.serverTimestamp(),
            verifiedCity: verified ? nearestCity?.name : null,
        });
        return {
            success: true,
            verified,
            distance: minDistance,
            city: nearestCity?.name,
            accuracy,
            ipMatchesAndaman,
        };
    }
    catch (error) {
        console.error('Error verifying location:', error);
        throw new functions.https.HttpsError('internal', 'Location verification failed');
    }
});
// Get User Location History
exports.getLocationHistory = locationRuntime.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { limit = 10 } = data;
    try {
        const snapshot = await admin_1.admin.firestore()
            .collection('location_verifications')
            .where('userId', '==', context.auth.uid)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();
        const verifications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));
        return {
            success: true,
            verifications,
        };
    }
    catch (error) {
        console.error('Error getting location history:', error);
        throw new functions.https.HttpsError('internal', 'Failed to get location history');
    }
});
// Get Nearby Listings
exports.getNearbyListings = locationRuntime.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { latitude, longitude, radius = 50, limit = 20 } = data;
    try {
        // Get user's verified location
        const userDoc = await admin_1.admin.firestore().collection('users').doc(context.auth.uid).get();
        const userData = userDoc.data();
        if (!userData?.locationVerified) {
            throw new functions.https.HttpsError('permission-denied', 'Location not verified');
        }
        // Query nearby listings
        const listings = await admin_1.admin.firestore()
            .collection('listings')
            .where('status', '==', 'active')
            .where('isActive', '==', true)
            .limit(limit)
            .get();
        // Filter by distance
        const nearbyListings = [];
        for (const doc of listings.docs) {
            const listing = doc.data();
            if (listing.latitude && listing.longitude) {
                const distance = calculateDistance(latitude, longitude, listing.latitude, listing.longitude);
                if (distance <= radius) {
                    nearbyListings.push({
                        id: doc.id,
                        ...listing,
                        distance,
                    });
                }
            }
        }
        // Sort by distance
        nearbyListings.sort((a, b) => a.distance - b.distance);
        return {
            success: true,
            listings: nearbyListings.slice(0, limit),
        };
    }
    catch (error) {
        console.error('Error getting nearby listings:', error);
        throw new functions.https.HttpsError('internal', 'Failed to get nearby listings');
    }
});
// Helper function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
}
function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}
// Helper function to get IP-based location
async function getIPLocation(request) {
    try {
        const clientIP = request.ip ||
            request.headers['x-forwarded-for']?.split(',')[0] ||
            request.headers['x-real-ip'] ||
            request.connection?.remoteAddress;
        if (!clientIP) {
            return null;
        }
        // Use a free IP geolocation service
        const response = await fetch(`http://ip-api.com/json/${clientIP}`);
        const data = (await response.json());
        // Validate required fields exist before accessing
        if (typeof data.countryCode !== 'string' ||
            typeof data.regionName !== 'string' ||
            typeof data.city !== 'string' ||
            typeof data.lat !== 'number' ||
            typeof data.lon !== 'number') {
            return null;
        }
        return {
            ip: clientIP,
            country: data.countryCode,
            region: data.regionName,
            city: data.city,
            lat: data.lat,
            lon: data.lon,
        };
    }
    catch (error) {
        console.error('Error getting IP location:', error);
        return null;
    }
}
// Location-based Notifications
exports.sendLocationBasedNotifications = locationRuntime.firestore
    .document('location_verifications/{verificationId}')
    .onCreate(async (snap, context) => {
    const verification = snap.data();
    if (!verification?.verified) {
        return;
    }
    // Send welcome notification for newly verified users
    const userDoc = await admin_1.admin.firestore().collection('users').doc(verification.userId).get();
    const userData = userDoc.data();
    if (!userData?.locationVerified) {
        // This is the first time user's location is verified
        await admin_1.admin.firestore().collection('notifications').add({
            userId: verification.userId,
            type: 'location_verified',
            title: 'Location Verified!',
            message: `Your location in ${verification.nearestCity} has been verified. You can now post listings and connect with local buyers.`,
            data: {
                city: verification.nearestCity,
                verifiedAt: verification.createdAt,
            },
            read: false,
            createdAt: admin_1.admin.firestore.FieldValue.serverTimestamp(),
        });
    }
});
// Cleanup old location verifications
exports.cleanupLocationVerifications = locationRuntime.pubsub
    .schedule('every 24 hours')
    .onRun(async (context) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep only last 30 days
    const oldVerifications = await admin_1.admin.firestore()
        .collection('location_verifications')
        .where('createdAt', '<', cutoffDate)
        .get();
    const batch = admin_1.admin.firestore().batch();
    oldVerifications.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();
    console.log(`Cleaned up ${oldVerifications.size} old location verifications`);
});
//# sourceMappingURL=location.js.map