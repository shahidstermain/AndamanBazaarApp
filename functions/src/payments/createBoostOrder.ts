import * as functions from 'firebase-functions';
import { logger } from 'firebase-functions/v2';
import { createCashfreeOrder, CreateOrderRequest } from '../utils/cashfreeClient';
import { admin } from '../utils/admin';
import { CASHFREE_SECRET_BINDINGS } from '../utils/secrets';

const paymentsRuntime = functions.runWith({ secrets: CASHFREE_SECRET_BINDINGS });

// ============================================================
// Boost Tier Pricing (server-side source of truth)
// ⚠️  Must match src/lib/pricing.ts — never trust frontend values
// ============================================================

interface BoostTierServer {
  key: string;
  name: string;
  durationDays: number;
  priceInr: number;
  pricePaise: number;
}

const BOOST_TIERS: Record<string, BoostTierServer> = {
  spark: { key: 'spark', name: 'Spark', durationDays: 3, priceInr: 49, pricePaise: 4900 },
  boost: { key: 'boost', name: 'Boost', durationDays: 7, priceInr: 99, pricePaise: 9900 },
  power: { key: 'power', name: 'Power', durationDays: 30, priceInr: 199, pricePaise: 19900 },
};

// Firestore document interface for listingBoosts
interface ListingBoostDoc {
  boostId: string;
  orderId: string;
  cashfreeOrderId: string;
  listingId: string;
  userId: string;
  tier: string;
  tierName: string;
  durationDays: number;
  amount: number;
  amountPaise: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded' | 'expired';
  paymentSessionId: string;
  paymentLink?: string;
  customerEmail: string;
  customerPhone?: string;
  boostStartsAt?: admin.firestore.Timestamp;
  boostExpiresAt?: admin.firestore.Timestamp;
  paymentId?: string;
  paymentMethod?: string;
  failureReason?: string;
  invoiceId?: string;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

// Request interface — only listing_id and tier come from client
interface CreateBoostOrderRequestData {
  listing_id: string;
  tier: string;
}

/**
 * Creates a boost order for a listing.
 *
 * Security:
 * - Auth required (Firebase ID token)
 * - Price is resolved server-side from tier key — never trusted from client
 * - Listing ownership validated
 * - Duplicate boost prevention (no active boost for same listing+tier)
 * - All Cashfree secrets server-side only
 */
export const createBoostOrder = paymentsRuntime.https.onRequest(async (req, res): Promise<void> => {
  // CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // ── Auth ──────────────────────────────────────────────────
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  let uid: string;
  let email: string;
  try {
    const token = authHeader.split('Bearer ')[1];
    const decoded = await admin.auth().verifyIdToken(token);
    uid = decoded.uid;
    email = decoded.email || '';
  } catch (err) {
    logger.warn('Invalid auth token on createBoostOrder', err);
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  try {
    const { listing_id, tier } = req.body as CreateBoostOrderRequestData;

    // ── Input validation ────────────────────────────────────
    if (!listing_id || typeof listing_id !== 'string') {
      res.status(400).json({ error: 'listing_id is required' });
      return;
    }
    if (!tier || !BOOST_TIERS[tier]) {
      res.status(400).json({ error: `Invalid tier. Must be one of: ${Object.keys(BOOST_TIERS).join(', ')}` });
      return;
    }

    const tierConfig = BOOST_TIERS[tier];

    // ── Validate listing ────────────────────────────────────
    const listingDoc = await admin.firestore().collection('listings').doc(listing_id).get();
    if (!listingDoc.exists) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    const listing = listingDoc.data()!;

    // Only listing owner can boost
    if (listing.userId !== uid) {
      logger.warn('Non-owner attempted to boost listing', { uid, listingOwner: listing.userId, listing_id });
      res.status(403).json({ error: 'Only the listing owner can boost this listing' });
      return;
    }

    // Listing must be active
    if (listing.status !== 'active') {
      res.status(400).json({ error: 'Only active listings can be boosted' });
      return;
    }

    // ── Anti-abuse: rate limit (max 5 orders per hour per user) ─
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentOrdersSnap = await admin.firestore()
      .collection('listingBoosts')
      .where('userId', '==', uid)
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(oneHourAgo))
      .get();

    if (recentOrdersSnap.size >= 5) {
      logger.warn('Rate limit hit on boost orders', { uid, count: recentOrdersSnap.size });
      res.status(429).json({ error: 'Too many boost attempts. Please try again in an hour.' });
      return;
    }

    // ── Anti-abuse: max 3 active boosts per user globally ────
    const activeBoostsGlobalSnap = await admin.firestore()
      .collection('listingBoosts')
      .where('userId', '==', uid)
      .where('status', '==', 'paid')
      .where('boostExpiresAt', '>', admin.firestore.Timestamp.now())
      .get();

    if (activeBoostsGlobalSnap.size >= 3) {
      res.status(400).json({ error: 'You can have at most 3 active boosts at a time. Wait for one to expire.' });
      return;
    }

    // ── Anti-abuse: 24h cooldown after failed/expired boost ──
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentFailedSnap = await admin.firestore()
      .collection('listingBoosts')
      .where('listingId', '==', listing_id)
      .where('userId', '==', uid)
      .where('status', 'in', ['failed', 'expired'])
      .where('updatedAt', '>=', admin.firestore.Timestamp.fromDate(oneDayAgo))
      .limit(1)
      .get();

    if (!recentFailedSnap.empty) {
      res.status(400).json({ error: 'Please wait 24 hours after a failed/expired boost before trying again on this listing.' });
      return;
    }

    // ── Duplicate boost check ───────────────────────────────
    const existingBoostSnap = await admin.firestore()
      .collection('listingBoosts')
      .where('listingId', '==', listing_id)
      .where('userId', '==', uid)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (!existingBoostSnap.empty) {
      const existing = existingBoostSnap.docs[0].data() as ListingBoostDoc;
      logger.info('Returning existing pending boost order', { boostId: existing.boostId });
      res.status(200).json({
        success: true,
        order_id: existing.orderId,
        payment_session_id: existing.paymentSessionId,
        payment_link: existing.paymentLink || null,
        amount: existing.amount,
        currency: existing.currency,
        existing: true,
      });
      return;
    }

    // ── Also check for currently-active boost ───────────────
    const activeBoostSnap = await admin.firestore()
      .collection('listingBoosts')
      .where('listingId', '==', listing_id)
      .where('status', '==', 'paid')
      .where('boostExpiresAt', '>', admin.firestore.Timestamp.now())
      .limit(1)
      .get();

    if (!activeBoostSnap.empty) {
      res.status(409).json({ error: 'This listing already has an active boost. Wait until it expires or choose a different listing.' });
      return;
    }

    // ── Generate order ID ───────────────────────────────────
    const orderId = `BOOST_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
    const boostId = admin.firestore().collection('listingBoosts').doc().id;

    // ── Build return URL ────────────────────────────────────
    const frontendUrl = process.env.FRONTEND_URL || 'https://andamanbazaar.in';
    const returnUrl = `${frontendUrl}/boost-success?order_id=${orderId}`;
    const functionsUrl = process.env.FUNCTIONS_URL || `https://us-central1-${process.env.GCLOUD_PROJECT}.cloudfunctions.net`;
    const notifyUrl = `${functionsUrl}/cashfreeWebhookV2`;

    // ── Create Cashfree order (amount in INR, not paise) ────
    const cashfreeReq: CreateOrderRequest = {
      orderId,
      orderAmount: tierConfig.priceInr,
      orderCurrency: 'INR',
      customerDetails: {
        customerId: uid,
        customerEmail: email,
      },
      orderNotes: `Boost (${tierConfig.name}) for listing "${listing.title}"`,
      orderMeta: {
        return_url: returnUrl,
        notify_url: notifyUrl,
        payment_methods: 'upi,netbanking,card,wallet',
      },
    };

    const cfResponse = await createCashfreeOrder(cashfreeReq);

    // ── Persist to Firestore ────────────────────────────────
    const boostDoc: ListingBoostDoc = {
      boostId,
      orderId: cfResponse.orderId,
      cashfreeOrderId: cfResponse.cfOrderId,
      listingId: listing_id,
      userId: uid,
      tier,
      tierName: tierConfig.name,
      durationDays: tierConfig.durationDays,
      amount: tierConfig.priceInr,
      amountPaise: tierConfig.pricePaise,
      currency: 'INR',
      status: 'pending',
      paymentSessionId: cfResponse.paymentSessionId,
      customerEmail: email,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await admin.firestore().collection('listingBoosts').doc(boostId).set(boostDoc);

    // ── Audit log ───────────────────────────────────────────
    await admin.firestore().collection('paymentAuditLog').add({
      type: 'BOOST_ORDER_CREATED',
      orderId: cfResponse.orderId,
      cashfreeOrderId: cfResponse.cfOrderId,
      boostId,
      listingId: listing_id,
      userId: uid,
      tier,
      amount: tierConfig.priceInr,
      currency: 'INR',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: admin.firestore.Timestamp.now(),
    });

    logger.info('Boost order created', {
      boostId,
      orderId: cfResponse.orderId,
      listingId: listing_id,
      tier,
      amount: tierConfig.priceInr,
    });

    // ── Build payment link ──────────────────────────────────
    const cashfreeEnv = process.env.CASHFREE_ENV || 'sandbox';
    const paymentBaseUrl = cashfreeEnv === 'production'
      ? 'https://payments.cashfree.com/pg/view/order'
      : 'https://sandbox.cashfree.com/pg/view/order';
    const paymentLink = `${paymentBaseUrl}/${cfResponse.paymentSessionId}`;

    // Store payment link
    await admin.firestore().collection('listingBoosts').doc(boostId).update({ paymentLink });

    res.status(200).json({
      success: true,
      order_id: cfResponse.orderId,
      payment_session_id: cfResponse.paymentSessionId,
      payment_link: paymentLink,
      amount: tierConfig.priceInr,
      currency: 'INR',
    });

  } catch (error) {
    logger.error('createBoostOrder failed', {
      uid,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});
