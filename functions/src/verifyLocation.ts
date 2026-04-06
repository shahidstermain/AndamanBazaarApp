import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

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

interface IpGeoResponse {
  status: string;
  country: string;
  countryCode: string;
  lat: number;
  lon: number;
  isp: string;
}

/**
 * Checks whether the given geographic coordinates fall inside the Andaman & Nicobar Islands bounding box.
 *
 * @param lat - Latitude in decimal degrees
 * @param lng - Longitude in decimal degrees
 * @returns `true` if `lat` and `lng` are within the bounding box (inclusive), `false` otherwise.
 */
function isWithinAndamanBounds(lat: number, lng: number): boolean {
  return (
    lat >= ANDAMAN_BOUNDS.minLat &&
    lat <= ANDAMAN_BOUNDS.maxLat &&
    lng >= ANDAMAN_BOUNDS.minLng &&
    lng <= ANDAMAN_BOUNDS.maxLng
  );
}

/**
 * Fetches geolocation information for a public IPv4 address from an external geolocation service.
 *
 * @param ip - The client IP address to look up; private, loopback, or the literal `"unknown"` will be treated as no lookup.
 * @returns The IP geolocation data when the lookup succeeds (`IpGeoResponse`), `null` otherwise (including for private/loopback/unknown IPs, unsuccessful lookups, non-OK HTTP responses, or network/errors).
 */
async function getIpGeolocation(ip: string): Promise<IpGeoResponse | null> {
  if (!ip || ip === "unknown" || ip.startsWith("127.") || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return null;
  }

  try {
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,country,countryCode,lat,lon,isp`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) {
      console.warn("IP geolocation request failed:", response.status);
      return null;
    }

    const data = (await response.json()) as any;
    if (data.status === "success") {
      return data as IpGeoResponse;
    }
    return null;
  } catch (error) {
    console.warn("IP geolocation error:", error);
    return null;
  }
}

export const verifyLocation = onCall(async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated to verify location.");
  }

  const uid = request.auth.uid;
  const { latitude, longitude } = request.data;

  // Validate coordinates
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    isNaN(latitude) ||
    isNaN(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new HttpsError("invalid-argument", "Invalid coordinates provided.");
  }

  const db = admin.firestore();

  // Rate Limiting Check (Simple Implementation using a subcollection)
  const rateLimitRef = db.collection("rate_limits").doc(`location_${uid}`);
  const rateLimitDoc = await rateLimitRef.get();
  const now = Date.now();

  if (rateLimitDoc.exists) {
    const data = rateLimitDoc.data();
    if (data?.blockedUntil && now < data.blockedUntil) {
      throw new HttpsError("resource-exhausted", "Too many attempts. Please try again later.");
    }
    
    // Reset counters if outside hour window
    if (data?.lastAttemptAt && (now - data.lastAttemptAt > 60 * 60 * 1000)) {
      await rateLimitRef.update({ attempts: 0 });
    } else if (data && data.attempts >= RATE_LIMIT_CONFIG.maxAttemptsPerHour) {
      // Block for configured hours
      const blockDuration = RATE_LIMIT_CONFIG.blockDurationHours * 60 * 60 * 1000;
      await rateLimitRef.update({ blockedUntil: now + blockDuration });
      
      await db.collection("audit_logs").add({
        user_id: uid,
        action: "location_verification_rate_limited",
        status: "blocked",
        created_at: new Date().toISOString()
      });
      
      throw new HttpsError("resource-exhausted", "Too many attempts. Please try again later.");
    }
  }

  // Record an attempt
  await rateLimitRef.set({
    attempts: admin.firestore.FieldValue.increment(1),
    lastAttemptAt: now
  }, { merge: true });

  // Extract IP
  const forwarded = request.rawRequest?.headers["x-forwarded-for"] as string;
  const realIp = request.rawRequest?.headers["x-real-ip"] as string;
  const clientIp = forwarded ? forwarded.split(",")[0].trim() : (realIp || request.rawRequest?.ip || "unknown");

  // Get IP Geolocation
  const ipGeoData = await getIpGeolocation(clientIp);

  // Perform geofence check
  const isWithinAndaman = isWithinAndamanBounds(latitude, longitude);

  // Perform IP cross-check
  let ipCheckPassed = true;
  let ipWarning: string | null = null;

  if (ipGeoData) {
    const isIndianIp = ipGeoData.countryCode === "IN";
    if (!isIndianIp) {
      ipCheckPassed = false;
      ipWarning = "IP address is not from India";
    } else {
      const ipDistanceFromGps = Math.sqrt(
        Math.pow(ipGeoData.lat - latitude, 2) + Math.pow(ipGeoData.lon - longitude, 2)
      );
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
  } else {
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
