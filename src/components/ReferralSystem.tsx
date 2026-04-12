import React, { useState, useEffect } from "react";
import { Gift, Copy, Check, Share2, Users } from "lucide-react";
import { db, auth } from "../lib/firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

interface ReferralStats {
  referralCode: string;
  totalReferrals: number;
  activeReferrals: number;
  rewardsEarned: number;
}

export const ReferralSystem: React.FC = () => {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadReferralStats();
  }, []);

  const loadReferralStats = async () => {
    if (!auth.currentUser) return;

    try {
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      const userData = userDoc.data();

      if (!userData) return;

      // Get referral code (use user ID as base)
      const referralCode =
        userData.referralCode ||
        `AB${auth.currentUser.uid.substring(0, 8).toUpperCase()}`;

      // Count referrals
      const referralsQuery = query(
        collection(db, "users"),
        where("referredBy", "==", auth.currentUser.uid),
      );
      const referralsSnapshot = await getDocs(referralsQuery);

      const activeReferrals = referralsSnapshot.docs.filter(
        (doc) => doc.data().isActive === true,
      ).length;

      setStats({
        referralCode,
        totalReferrals: referralsSnapshot.size,
        activeReferrals,
        rewardsEarned: activeReferrals * 50, // ₹50 per active referral
      });
    } catch (error) {
      console.error("Error loading referral stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    if (!stats) return;

    const referralLink = `${window.location.origin}?ref=${stats.referralCode}`;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferral = async () => {
    if (!stats) return;

    const referralLink = `${window.location.origin}?ref=${stats.referralCode}`;
    const shareText = `Join AndamanBazaar and get ₹50 off your first boost! Use my referral code: ${stats.referralCode}\n\n${referralLink}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join AndamanBazaar",
          text: shareText,
        });
      } catch (error) {
        // User cancelled share
      }
    } else {
      copyReferralLink();
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg shadow-sm border border-teal-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-teal-100 rounded-lg">
          <Gift className="w-6 h-6 text-teal-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Referral Program</h3>
          <p className="text-sm text-gray-600">
            Earn ₹50 for each friend who joins!
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg p-3 text-center">
          <Users className="w-5 h-5 text-teal-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">
            {stats.totalReferrals}
          </p>
          <p className="text-xs text-gray-600">Total Referrals</p>
        </div>
        <div className="bg-white rounded-lg p-3 text-center">
          <Check className="w-5 h-5 text-green-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">
            {stats.activeReferrals}
          </p>
          <p className="text-xs text-gray-600">Active Users</p>
        </div>
        <div className="bg-white rounded-lg p-3 text-center">
          <Gift className="w-5 h-5 text-purple-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">
            ₹{stats.rewardsEarned}
          </p>
          <p className="text-xs text-gray-600">Rewards Earned</p>
        </div>
      </div>

      {/* Referral Code */}
      <div className="bg-white rounded-lg p-4 mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Referral Code
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={stats.referralCode}
            readOnly
            className="flex-1 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg
                     font-mono text-lg font-bold text-center text-teal-600"
          />
          <button
            onClick={copyReferralLink}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700
                     transition-colors duration-150 flex items-center gap-2"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span className="hidden sm:inline">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span className="hidden sm:inline">Copy Link</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Share Button */}
      <button
        onClick={shareReferral}
        className="w-full px-4 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white
                 rounded-lg hover:from-teal-700 hover:to-cyan-700 transition-all duration-150
                 flex items-center justify-center gap-2 font-semibold"
      >
        <Share2 className="w-5 h-5" />
        Share with Friends
      </button>

      {/* How it works */}
      <div className="mt-6 pt-6 border-t border-teal-200">
        <h4 className="font-semibold text-gray-900 mb-3">How it works:</h4>
        <ol className="space-y-2 text-sm text-gray-600">
          <li className="flex gap-2">
            <span className="font-bold text-teal-600">1.</span>
            <span>Share your referral code with friends</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-teal-600">2.</span>
            <span>They sign up using your code</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-teal-600">3.</span>
            <span>You both get ₹50 credit for listing boosts!</span>
          </li>
        </ol>
      </div>
    </div>
  );
};
