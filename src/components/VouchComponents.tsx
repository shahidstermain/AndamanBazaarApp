import React, { useState } from "react";
import {
  Shield,
  UserCheck,
  MessageSquare,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface Vouch {
  vouch_id: string;
  voucher_id: string;
  voucher_name: string;
  voucher_trust_level: "newbie" | "verified" | "legend";
  vouch_message: string;
  created_at: string;
  days_remaining: number;
}

interface VouchBadgeProps {
  vouchCount: number;
  className?: string;
}

export const VouchBadge: React.FC<VouchBadgeProps> = ({
  vouchCount,
  className,
}) => {
  if (vouchCount === 0) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
        vouchCount >= 3
          ? "bg-green-100 text-green-800"
          : vouchCount >= 2
            ? "bg-blue-100 text-blue-800"
            : "bg-gray-100 text-gray-700",
        className,
      )}
    >
      <UserCheck className="w-3 h-3" />
      {vouchCount} vouch{vouchCount > 1 ? "es" : ""}
    </div>
  );
};

interface VouchListProps {
  vouches: Vouch[];
  className?: string;
}

export const VouchList: React.FC<VouchListProps> = ({ vouches, className }) => {
  if (!vouches || vouches.length === 0) {
    return null;
  }

  const getTrustColor = (level: string) => {
    switch (level) {
      case "legend":
        return "text-amber-600 bg-amber-50";
      case "verified":
        return "text-blue-600 bg-blue-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <h4 className="font-medium text-sm text-gray-900 flex items-center gap-2">
        <Shield className="w-4 h-4 text-teal-600" />
        Vouched by Community
      </h4>

      <div className="space-y-2">
        {vouches.map((vouch) => (
          <div
            key={vouch.vouch_id}
            className="bg-gray-50 rounded-lg p-3 text-sm"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{vouch.voucher_name}</span>
                <span
                  className={cn(
                    "text-xs px-1.5 py-0.5 rounded",
                    getTrustColor(vouch.voucher_trust_level),
                  )}
                >
                  {vouch.voucher_trust_level}
                </span>
              </div>
              <span className="text-xs text-gray-400">
                {vouch.days_remaining}d left
              </span>
            </div>

            {vouch.vouch_message && (
              <p className="text-gray-600 text-xs mt-1 italic">
                "{vouch.vouch_message}"
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

interface VouchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVouch: (message: string) => Promise<void>;
  voucheeName: string;
  availableSlots: number;
  canVouch: boolean;
  userTrustLevel: string;
}

export const VouchModal: React.FC<VouchModalProps> = ({
  isOpen,
  onClose,
  onVouch,
  voucheeName,
  availableSlots,
  canVouch,
  userTrustLevel,
}) => {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await onVouch(message);
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setMessage("");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to vouch");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
        {success ? (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">
              Vouch Submitted!
            </h3>
            <p className="text-gray-600 mt-2">
              Your vouch has been recorded and will help build trust for{" "}
              {voucheeName}.
            </p>
          </div>
        ) : !canVouch ? (
          <div className="text-center py-6">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">
              Cannot Vouch
            </h3>
            <p className="text-gray-600 mt-2">
              {userTrustLevel === "newbie"
                ? "You need to be a Verified or Legend user to vouch for others."
                : "You have used all 3 vouch slots. Wait for some to expire or remove existing vouches."}
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Vouch for {voucheeName}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              As a {userTrustLevel} user, your vouch will boost their trust
              score. You have {availableSlots} slot
              {availableSlots !== 1 ? "s" : ""} remaining.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vouch Message (optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Why do you vouch for this seller? (max 500 chars)"
                  maxLength={500}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                />
                <div className="text-xs text-gray-400 mt-1 text-right">
                  {message.length}/500
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      Vouch
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
