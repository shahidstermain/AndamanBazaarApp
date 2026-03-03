import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================
// Edge Function: verify-location
// Server-side GPS verification for Andaman & Nicobar Islands
// with rate limiting, IP cross-check, and fraud prevention
// ============================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const ALLOWED_ORIGIN = Deno.env.get("FRONTEND_ORIGIN") || "https://www.andamanbazaar.in";

const corsHeaders = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, x-forwarded-for",
};

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

interface VerificationRequest {
    latitude: number;
    longitude: number;
}

interface IpGeoResponse {
    status: string;
    country: string;
    countryCode: string;
    lat: number;
    lon: number;
    isp: string;
}

function isWithinAndamanBounds(lat: number, lng: number): boolean {
    return (
        lat >= ANDAMAN_BOUNDS.minLat &&
        lat <= ANDAMAN_BOUNDS.maxLat &&
        lng >= ANDAMAN_BOUNDS.minLng &&
        lng <= ANDAMAN_BOUNDS.maxLng
    );
}

function getClientIp(req: Request): string {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) {
        return forwarded.split(",")[0].trim();
    }
    const realIp = req.headers.get("x-real-ip");
    if (realIp) {
        return realIp;
    }
    return "unknown";
}

async function getIpGeolocation(ip: string): Promise<IpGeoResponse | null> {
    if (ip === "unknown" || ip.startsWith("127.") || ip.startsWith("192.168.") || ip.startsWith("10.")) {
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
        
        const data = await response.json();
        if (data.status === "success") {
            return data as IpGeoResponse;
        }
        return null;
    } catch (error) {
        console.warn("IP geolocation error:", error);
        return null;
    }
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    const responseHeaders = { ...corsHeaders, "Content-Type": "application/json" };

    try {
        // 1. Authenticate the user
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Missing authorization header", code: "AUTH_REQUIRED" }),
                { status: 401, headers: responseHeaders }
            );
        }

        const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: authHeader } },
        });

        const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: "Invalid or expired token", code: "AUTH_INVALID" }),
                { status: 401, headers: responseHeaders }
            );
        }

        // 2. Parse request body
        let body: VerificationRequest;
        try {
            body = await req.json();
        } catch {
            return new Response(
                JSON.stringify({ error: "Invalid JSON body", code: "INVALID_BODY" }),
                { status: 400, headers: responseHeaders }
            );
        }

        const { latitude, longitude } = body;

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
            return new Response(
                JSON.stringify({ error: "Invalid coordinates", code: "INVALID_COORDS" }),
                { status: 400, headers: responseHeaders }
            );
        }

        // 3. Create service role client for DB operations
        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // 4. Check rate limit
        const { data: rateLimitResult, error: rateLimitError } = await supabaseAdmin.rpc(
            "check_location_verification_rate_limit",
            {
                p_user_id: user.id,
                p_max_attempts: RATE_LIMIT_CONFIG.maxAttemptsPerHour,
                p_block_duration_hours: RATE_LIMIT_CONFIG.blockDurationHours,
                p_max_total_failures: RATE_LIMIT_CONFIG.maxTotalFailures,
            }
        );

        if (rateLimitError) {
            console.error("Rate limit check error:", rateLimitError);
            return new Response(
                JSON.stringify({ error: "Rate limit check failed", code: "RATE_LIMIT_ERROR" }),
                { status: 500, headers: responseHeaders }
            );
        }

        const rateLimit = rateLimitResult?.[0];
        if (!rateLimit?.allowed) {
            // Log rate limit event
            await supabaseAdmin.from("audit_logs").insert({
                user_id: user.id,
                action: "location_verification_rate_limited",
                status: "blocked",
                metadata: {
                    retry_after_seconds: rateLimit?.retry_after_seconds,
                    reason: rateLimit?.reason,
                },
            }).catch(() => {});

            return new Response(
                JSON.stringify({
                    error: rateLimit?.reason || "Rate limit exceeded",
                    code: "RATE_LIMITED",
                    retryAfterSeconds: rateLimit?.retry_after_seconds || 3600,
                }),
                { status: 429, headers: responseHeaders }
            );
        }

        // 5. Get client IP and perform IP geolocation
        const clientIp = getClientIp(req);
        const ipGeoData = await getIpGeolocation(clientIp);

        // 6. Perform geofence check
        const isWithinAndaman = isWithinAndamanBounds(latitude, longitude);

        // 7. Perform IP cross-check (secondary signal)
        let ipCheckPassed = true;
        let ipWarning: string | null = null;

        if (ipGeoData) {
            const isIndianIp = ipGeoData.countryCode === "IN";
            
            if (!isIndianIp) {
                ipCheckPassed = false;
                ipWarning = "IP address is not from India";
            } else {
                const ipDistanceFromGps = Math.sqrt(
                    Math.pow(ipGeoData.lat - latitude, 2) +
                    Math.pow(ipGeoData.lon - longitude, 2)
                );
                
                if (ipDistanceFromGps > 10) {
                    ipWarning = "IP location differs significantly from GPS coordinates";
                }
            }
        }

        // 8. Make final verification decision
        const isVerified = isWithinAndaman && ipCheckPassed;

        if (isVerified) {
            // Record successful verification
            const { error: updateError } = await supabaseAdmin.rpc(
                "record_location_verification",
                {
                    p_user_id: user.id,
                    p_latitude: latitude,
                    p_longitude: longitude,
                    p_ip_address: clientIp,
                }
            );

            if (updateError) {
                console.error("Failed to record verification:", updateError);
                return new Response(
                    JSON.stringify({ error: "Failed to save verification", code: "DB_ERROR" }),
                    { status: 500, headers: responseHeaders }
                );
            }

            // Log success
            await supabaseAdmin.from("audit_logs").insert({
                user_id: user.id,
                action: "location_verification_success",
                status: "success",
                metadata: {
                    latitude,
                    longitude,
                    ip: clientIp,
                    ip_country: ipGeoData?.countryCode,
                    ip_warning: ipWarning,
                },
            }).catch(() => {});

            return new Response(
                JSON.stringify({
                    success: true,
                    verified: true,
                    message: "Island residency verified successfully!",
                    warning: ipWarning,
                    expiresAt: new Date(
                        Date.now() + VERIFICATION_EXPIRATION_DAYS * 24 * 60 * 60 * 1000
                    ).toISOString(),
                }),
                { status: 200, headers: responseHeaders }
            );
        } else {
            // Verification failed
            const failureReason = !isWithinAndaman
                ? "Location is outside Andaman & Nicobar Islands"
                : "IP verification failed";

            // Log failure
            await supabaseAdmin.from("audit_logs").insert({
                user_id: user.id,
                action: "location_verification_failed",
                status: "failed",
                metadata: {
                    latitude,
                    longitude,
                    ip: clientIp,
                    ip_country: ipGeoData?.countryCode,
                    reason: failureReason,
                    within_andaman: isWithinAndaman,
                    ip_check_passed: ipCheckPassed,
                },
            }).catch(() => {});

            return new Response(
                JSON.stringify({
                    success: false,
                    verified: false,
                    error: failureReason,
                    code: !isWithinAndaman ? "OUTSIDE_GEOFENCE" : "IP_CHECK_FAILED",
                }),
                { status: 200, headers: responseHeaders }
            );
        }
    } catch (error) {
        console.error("Verification error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error", code: "INTERNAL_ERROR" }),
            { status: 500, headers: responseHeaders }
        );
    }
});
