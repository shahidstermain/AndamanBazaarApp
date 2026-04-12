import * as functions from "firebase-functions";
import { admin } from "./utils/admin";
import { ADMIN_SECRET_BINDINGS } from "./utils/secrets";

const locationRuntime = functions.runWith({ secrets: ADMIN_SECRET_BINDINGS });

// Andaman Islands cities with their coordinates
const ANDAMAN_CITIES = [
  { name: "Port Blair", lat: 11.6234, lng: 92.7325, radius: 15 },
  { name: "Diglipur", lat: 13.2833, lng: 93.1167, radius: 10 },
  { name: "Mayabunder", lat: 12.9333, lng: 92.9167, radius: 10 },
  { name: "Rangat", lat: 12.5167, lng: 92.9833, radius: 10 },
  { name: "Havelock", lat: 12.0167, lng: 93.0167, radius: 8 },
  { name: "Neil Island", lat: 11.8333, lng: 93.0667, radius: 8 },
  { name: "Long Island", lat: 12.2833, lng: 92.9333, radius: 8 },
  { name: "Little Andaman", lat: 10.95, lng: 92.4167, radius: 12 },
];

// Verify Location
export const verifyLocation = locationRuntime.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated",
      );
    }

    const { latitude, longitude, accuracy, timestamp } = data;

    try {
      // Validate input
      if (!latitude || !longitude || !accuracy) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Missing location data",
        );
      }

      // Check if GPS accuracy is reasonable (within 100 meters)
      if (accuracy > 100) {
        return {
          success: true,
          verified: false,
          error: "GPS accuracy too low",
          distance: accuracy,
        };
      }

      // Find nearest city
      let nearestCity = null;
      let minDistance = Infinity;

      for (const city of ANDAMAN_CITIES) {
        const distance = calculateDistance(
          latitude,
          longitude,
          city.lat,
          city.lng,
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearestCity = city;
        }
      }

      // Check if user is within any Andaman city radius
      const isWithinAndaman = nearestCity && minDistance <= nearestCity.radius;

      // Additional IP-based verification
      const ipLocation = await getIPLocation(context.rawRequest);
      const ipMatchesAndaman =
        ipLocation?.country === "IN" &&
        (ipLocation.region?.includes("Andaman") ||
          ipLocation.city?.includes("Port Blair"));

      // Final verification decision
      const verified = isWithinAndaman && ipMatchesAndaman;

      // Store verification attempt
      await admin
        .firestore()
        .collection("location_verifications")
        .add({
          userId: context.auth.uid,
          latitude,
          longitude,
          accuracy,
          timestamp: new Date(timestamp),
          verified,
          nearestCity: nearestCity?.name,
          distance: minDistance,
          ipInfo: ipLocation,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      // Update user's location verification status
      await admin
        .firestore()
        .collection("users")
        .doc(context.auth.uid)
        .update({
          locationVerified: verified,
          lastLocationVerification:
            admin.firestore.FieldValue.serverTimestamp(),
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
    } catch (error) {
      console.error("Error verifying location:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Location verification failed",
      );
    }
  },
);

// Get User Location History
export const getLocationHistory = locationRuntime.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated",
      );
    }

    const { limit = 10 } = data;

    try {
      const snapshot = await admin
        .firestore()
        .collection("location_verifications")
        .where("userId", "==", context.auth.uid)
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();

      const verifications = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return {
        success: true,
        verifications,
      };
    } catch (error) {
      console.error("Error getting location history:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to get location history",
      );
    }
  },
);

// Get Nearby Listings
export const getNearbyListings = locationRuntime.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated",
      );
    }

    const { latitude, longitude, radius = 50, limit = 20 } = data;

    try {
      // Get user's verified location
      const userDoc = await admin
        .firestore()
        .collection("users")
        .doc(context.auth.uid)
        .get();
      const userData = userDoc.data();

      if (!userData?.locationVerified) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Location not verified",
        );
      }

      // Query nearby listings
      const listings = await admin
        .firestore()
        .collection("listings")
        .where("status", "==", "active")
        .where("isActive", "==", true)
        .limit(limit)
        .get();

      // Filter by distance
      const nearbyListings = [];
      for (const doc of listings.docs) {
        const listing = doc.data();
        if (listing.latitude && listing.longitude) {
          const distance = calculateDistance(
            latitude,
            longitude,
            listing.latitude,
            listing.longitude,
          );

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
    } catch (error) {
      console.error("Error getting nearby listings:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to get nearby listings",
      );
    }
  },
);

// Helper function to calculate distance between two points
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Helper function to get IP-based location
async function getIPLocation(request: any): Promise<any> {
  try {
    const clientIP =
      request.ip ||
      request.headers["x-forwarded-for"]?.split(",")[0] ||
      request.headers["x-real-ip"] ||
      request.connection?.remoteAddress;

    if (!clientIP) {
      return null;
    }

    // Use a free IP geolocation service
    const response = await fetch(`http://ip-api.com/json/${clientIP}`);
    const data = (await response.json()) as Record<string, unknown>;

    // Validate required fields exist before accessing
    if (
      typeof data.countryCode !== "string" ||
      typeof data.regionName !== "string" ||
      typeof data.city !== "string" ||
      typeof data.lat !== "number" ||
      typeof data.lon !== "number"
    ) {
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
  } catch (error) {
    console.error("Error getting IP location:", error);
    return null;
  }
}

// Location-based Notifications
export const sendLocationBasedNotifications = locationRuntime.firestore
  .document("location_verifications/{verificationId}")
  .onCreate(async (snap, context) => {
    const verification = snap.data();

    if (!verification?.verified) {
      return;
    }

    // Send welcome notification for newly verified users
    const userDoc = await admin
      .firestore()
      .collection("users")
      .doc(verification.userId)
      .get();
    const userData = userDoc.data();

    if (!userData?.locationVerified) {
      // This is the first time user's location is verified
      await admin
        .firestore()
        .collection("notifications")
        .add({
          userId: verification.userId,
          type: "location_verified",
          title: "Location Verified!",
          message: `Your location in ${verification.nearestCity} has been verified. You can now post listings and connect with local buyers.`,
          data: {
            city: verification.nearestCity,
            verifiedAt: verification.createdAt,
          },
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
  });

// Cleanup old location verifications
export const cleanupLocationVerifications = locationRuntime.pubsub
  .schedule("every 24 hours")
  .onRun(async (context) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep only last 30 days

    const oldVerifications = await admin
      .firestore()
      .collection("location_verifications")
      .where("createdAt", "<", cutoffDate)
      .get();

    const batch = admin.firestore().batch();
    oldVerifications.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    console.log(
      `Cleaned up ${oldVerifications.size} old location verifications`,
    );
  });
