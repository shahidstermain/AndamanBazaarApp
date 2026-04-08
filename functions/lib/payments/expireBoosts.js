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
exports.expireBoosts = void 0;
const functions = __importStar(require("firebase-functions"));
const v2_1 = require("firebase-functions/v2");
const admin_1 = require("../utils/admin");
/**
 * Scheduled Cloud Function: Expire Boosts
 * Runs every hour to find listings whose boost has expired
 * and resets their boost flags.
 *
 * How it works:
 * 1. Queries listings where isBoosted=true AND boostExpiresAt < now
 * 2. Resets isBoosted/boostTier/boostExpiresAt on each listing
 * 3. Updates the corresponding listingBoosts record to 'expired'
 * 4. Logs each expiry for audit
 */
exports.expireBoosts = functions.pubsub
    .schedule('every 1 hours')
    .timeZone('Asia/Kolkata')
    .onRun(async () => {
    const now = admin_1.admin.firestore.Timestamp.now();
    try {
        // Find all listings with expired boosts
        const expiredSnap = await admin_1.admin.firestore()
            .collection('listings')
            .where('isBoosted', '==', true)
            .where('boostExpiresAt', '<=', now)
            .get();
        if (expiredSnap.empty) {
            v2_1.logger.info('No expired boosts found');
            return;
        }
        v2_1.logger.info(`Found ${expiredSnap.size} expired boosts to clean up`);
        const batch = admin_1.admin.firestore().batch();
        const expiredListingIds = [];
        for (const doc of expiredSnap.docs) {
            // Reset listing boost flags
            batch.update(doc.ref, {
                isBoosted: false,
                boostTier: admin_1.admin.firestore.FieldValue.delete(),
                boostExpiresAt: admin_1.admin.firestore.FieldValue.delete(),
                updatedAt: admin_1.admin.firestore.Timestamp.now(),
            });
            expiredListingIds.push(doc.id);
        }
        await batch.commit();
        // Update corresponding listingBoosts records
        for (const listingId of expiredListingIds) {
            const boostsSnap = await admin_1.admin.firestore()
                .collection('listingBoosts')
                .where('listingId', '==', listingId)
                .where('status', '==', 'paid')
                .get();
            for (const boostDoc of boostsSnap.docs) {
                const boost = boostDoc.data();
                if (boost.boostExpiresAt && boost.boostExpiresAt.toMillis() <= now.toMillis()) {
                    await boostDoc.ref.update({
                        status: 'expired',
                        updatedAt: admin_1.admin.firestore.Timestamp.now(),
                    });
                    // Audit log
                    await admin_1.admin.firestore().collection('paymentAuditLog').add({
                        type: 'BOOST_EXPIRED',
                        boostId: boostDoc.id,
                        orderId: boost.orderId,
                        listingId,
                        userId: boost.userId,
                        tier: boost.tier,
                        source: 'scheduled_cleanup',
                        timestamp: admin_1.admin.firestore.Timestamp.now(),
                    });
                }
            }
        }
        v2_1.logger.info(`Successfully expired ${expiredListingIds.length} boosts`, {
            listingIds: expiredListingIds,
        });
    }
    catch (error) {
        v2_1.logger.error('expireBoosts scheduled function failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
        });
    }
});
//# sourceMappingURL=expireBoosts.js.map