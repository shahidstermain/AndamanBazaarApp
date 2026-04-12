import React from "react";
import { Zap, Rocket, Crown } from "lucide-react";

// ============================================================
// BoostBadge — reusable badge for boosted listing indicators
// Shows tier-specific icon, color, and optional glow animation
// ============================================================

interface BoostBadgeProps {
  tier: "spark" | "boost" | "power";
  /** 'sm' for listing cards, 'md' for detail page */
  size?: "sm" | "md";
  /** Show expiry countdown text */
  expiresAt?: Date | string | null;
  className?: string;
}

const TIER_CONFIG = {
  spark: {
    label: "Spark",
    emoji: "⚡",
    icon: Zap,
    bgClass: "bg-gradient-to-r from-amber-400 to-amber-500",
    textClass: "text-white",
    glowClass: "shadow-amber-400/40",
    ringClass: "ring-amber-300",
  },
  boost: {
    label: "Boost",
    emoji: "🚀",
    icon: Rocket,
    bgClass: "bg-gradient-to-r from-teal-400 to-teal-600",
    textClass: "text-white",
    glowClass: "shadow-teal-400/40",
    ringClass: "ring-teal-300",
  },
  power: {
    label: "Power",
    emoji: "💎",
    icon: Crown,
    bgClass: "bg-gradient-to-r from-purple-500 to-purple-700",
    textClass: "text-white",
    glowClass: "shadow-purple-500/40",
    ringClass: "ring-purple-300",
  },
};

function getTimeRemaining(expiresAt: Date | string): string | null {
  const expiry =
    typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();

  if (diffMs <= 0) return null;

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days}d left`;
  if (hours > 0) return `${hours}h left`;
  return "<1h left";
}

export const BoostBadge: React.FC<BoostBadgeProps> = ({
  tier,
  size = "sm",
  expiresAt,
  className = "",
}) => {
  const config = TIER_CONFIG[tier];
  if (!config) return null;

  const Icon = config.icon;
  const timeLeft = expiresAt ? getTimeRemaining(expiresAt) : null;

  if (size === "sm") {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-md ${config.bgClass} ${config.textClass} ${config.glowClass} ${className}`}
      >
        <Icon size={10} className="flex-shrink-0" />
        {config.label}
      </span>
    );
  }

  // md size — detail page / expanded view
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg ring-1 ${config.bgClass} ${config.textClass} ${config.glowClass} ${config.ringClass} animate-pulse-slow ${className}`}
    >
      <Icon size={14} className="flex-shrink-0" />
      <span>{config.label} Boosted</span>
      {timeLeft && (
        <span className="text-white/70 font-medium">· {timeLeft}</span>
      )}
    </div>
  );
};

export default BoostBadge;
