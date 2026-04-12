import React, { useState } from "react";
import { auth } from "../lib/firebase";
import {
  Zap,
  Rocket,
  Crown,
  X,
  Loader2,
  CheckCircle,
  ArrowRight,
  Shield,
  Star,
  Clock,
} from "lucide-react";
import { useToast } from "./Toast";
import { BOOST_TIERS as SHARED_TIERS } from "../lib/pricing";
import { COPY } from "../lib/localCopy";

// ============================================================
// Boost Listing Modal
// Shows 3 pricing tiers and initiates Cashfree UPI payment
// Pricing sourced from src/lib/pricing.ts (single source of truth)
// ============================================================

interface BoostListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  listingTitle: string;
}

interface BoostTierUI {
  key: string;
  name: string;
  duration: string;
  durationDays: number;
  price: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
  features: string[];
  popular?: boolean;
}

const TIER_UI: Record<
  string,
  {
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    borderColor: string;
    glowColor: string;
  }
> = {
  spark: {
    icon: <Zap size={24} />,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    glowColor: "shadow-amber-100",
  },
  boost: {
    icon: <Rocket size={24} />,
    color: "text-teal-600",
    bgColor: "bg-teal-50",
    borderColor: "border-teal-300",
    glowColor: "shadow-teal-100",
  },
  power: {
    icon: <Crown size={24} />,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-300",
    glowColor: "shadow-purple-100",
  },
};

const BOOST_TIERS: BoostTierUI[] = SHARED_TIERS.map((t) => ({
  key: t.key,
  name: t.name,
  duration: t.durationLabel,
  durationDays: t.durationDays,
  price: t.priceInr,
  features: t.features,
  popular: t.popular,
  ...TIER_UI[t.key],
}));

export const BoostListingModal: React.FC<BoostListingModalProps> = ({
  isOpen,
  onClose,
  listingId,
  listingTitle,
}) => {
  const [selectedTier, setSelectedTier] = useState<string>("boost");
  const [isProcessing, setIsProcessing] = useState(false);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handlePayment = async () => {
    setIsProcessing(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        showToast("Please sign in to boost your listing.", "error");
        setIsProcessing(false);
        return;
      }

      const idToken = await user.getIdToken();
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
      const region = "us-central1";

      // Call the dedicated createBoostOrder Cloud Function (HTTPS onRequest)
      const response = await fetch(
        `https://${region}-${projectId}.cloudfunctions.net/createBoostOrder`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            listing_id: listingId,
            tier: selectedTier,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create payment order");
      }

      // Redirect to Cashfree payment page
      if (data.payment_link) {
        window.location.href = data.payment_link;
      } else if (data.payment_session_id) {
        // Alternative: Use Cashfree JS SDK drop-in
        // For now, construct the payment URL
        const cashfreeEnv = import.meta.env.VITE_CASHFREE_ENV || "sandbox";
        const baseUrl =
          cashfreeEnv === "production"
            ? "https://payments.cashfree.com/pg/view/order"
            : "https://sandbox.cashfree.com/pg/view/order";
        window.location.href = `${baseUrl}/${data.payment_session_id}`;
      } else {
        throw new Error("No payment link received from gateway");
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      showToast(err.message || "Payment failed. Please try again.", "error");
      setIsProcessing(false);
    }
  };

  const tierTaglines: Record<string, string> = {
    spark: COPY.BOOST.TIER_49,
    boost: COPY.BOOST.TIER_99,
    power: COPY.BOOST.TIER_199,
  };

  const selectedTierData = BOOST_TIERS.find((t) => t.key === selectedTier)!;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-midnight-700/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md z-10 px-6 pt-6 pb-4 border-b border-warm-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-heading font-black text-midnight-700 tracking-tight">
                Boost Your Listing
              </h2>
              <p className="text-xs text-warm-500 mt-1 font-medium line-clamp-1">
                {listingTitle}
              </p>
            </div>
            <button
              onClick={onClose}
              title="Close modal"
              aria-label="Close modal"
              className="w-9 h-9 rounded-xl bg-warm-100 flex items-center justify-center text-warm-400 hover:bg-warm-200 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tier Cards */}
        <div className="px-6 py-5 space-y-3">
          {BOOST_TIERS.map((tier) => (
            <button
              key={tier.key}
              onClick={() => setSelectedTier(tier.key)}
              className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 relative ${
                selectedTier === tier.key
                  ? `${tier.borderColor} ${tier.bgColor} ring-2 ring-offset-1 ${tier.glowColor}`
                  : "border-warm-200 bg-white hover:border-warm-300"
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-2 right-4 bg-teal-600 text-white text-[9px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full">
                  Most Popular
                </div>
              )}

              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    selectedTier === tier.key ? tier.bgColor : "bg-warm-100"
                  } ${tier.color}`}
                >
                  {tier.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between">
                    <h3
                      className={`font-bold text-base ${selectedTier === tier.key ? "text-midnight-700" : "text-midnight-600"}`}
                    >
                      {tier.name}
                    </h3>
                    <div className="text-right flex-shrink-0 ml-3">
                      <span className="text-lg font-black text-midnight-700">
                        ₹{tier.price}
                      </span>
                      <span className="text-xs text-warm-400 font-medium ml-1">
                        / {tier.duration}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-warm-500 font-medium mt-0.5">
                    {tierTaglines[tier.key]}
                  </p>

                  {selectedTier === tier.key && (
                    <ul className="mt-3 space-y-1.5 animate-fade-in">
                      {tier.features.map((feature, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-2 text-xs text-midnight-600"
                        >
                          <CheckCircle size={12} className={tier.color} />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Selection indicator */}
              <div
                className={`absolute top-4 left-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  selectedTier === tier.key
                    ? `${tier.borderColor} ${tier.bgColor}`
                    : "border-warm-300"
                }`}
              >
                {selectedTier === tier.key && (
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${tier.color.replace("text-", "bg-")}`}
                  />
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Stats Bar */}
        <div className="px-6 py-3">
          <div className="bg-warm-50 rounded-2xl p-4 flex items-center justify-between border border-warm-100">
            <div className="flex items-center gap-2 text-xs text-warm-500">
              <Shield size={14} className="text-teal-500" />
              <span className="font-medium">Secure Payment</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-warm-500">
              <Star size={14} className="text-amber-500" />
              <span className="font-medium">Instant Activation</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-warm-500">
              <Clock size={14} className="text-purple-500" />
              <span className="font-medium">{selectedTierData.duration}</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-md px-6 py-5 border-t border-warm-100">
          <button
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-coral-500 to-coral-600 hover:from-coral-600 hover:to-coral-700 text-white font-bold py-4 px-8 rounded-2xl shadow-lg shadow-coral-500/25 flex items-center justify-center gap-3 text-base disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
          >
            {isProcessing ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Creating Payment...
              </>
            ) : (
              <>
                Pay ₹{selectedTierData.price} Securely
                <ArrowRight size={20} />
              </>
            )}
          </button>
          <p className="text-center text-[10px] text-warm-400 mt-3 font-medium">
            Powered by Cashfree · 100% Secure · Supports UPI, Cards, Netbanking
          </p>
        </div>
      </div>
    </div>
  );
};
