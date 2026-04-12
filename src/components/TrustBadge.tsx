import React from "react";
import { Shield, Award, Star, Info } from "lucide-react";

interface TrustBadgeProps {
  level: "newbie" | "verified" | "legend" | "official";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const TRUST_CONFIG = {
  newbie: {
    icon: Shield,
    label: "New Seller",
    color: "text-warm-500",
    bgColor: "bg-warm-100",
    borderColor: "border-warm-200",
  },
  verified: {
    icon: Award,
    label: "Verified Seller",
    color: "text-teal-600",
    bgColor: "bg-teal-50",
    borderColor: "border-teal-200",
  },
  legend: {
    icon: Star,
    label: "Legendary Seller",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
  official: {
    icon: Info,
    label: "AndamanBazaar Team",
    color: "text-blue-600 font-black",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
};

export const TrustBadge: React.FC<TrustBadgeProps> = ({
  level = "newbie",
  size = "sm",
  showLabel = true,
}) => {
  const config = TRUST_CONFIG[level];
  const Icon = config.icon;

  const sizeClasses =
    size === "sm"
      ? "text-[10px] px-2 py-0.5 gap-1"
      : size === "md"
        ? "text-xs px-3 py-1 gap-1.5"
        : "text-sm px-4 py-2 gap-2";

  const iconSize = size === "sm" ? 10 : size === "md" ? 14 : 18;

  return (
    <span
      className={`inline-flex items-center rounded-full border font-bold uppercase tracking-wider ${config.bgColor} ${config.color} ${config.borderColor} ${sizeClasses}`}
      title={`${config.label} — ${level === "newbie" ? "Just getting started" : level === "verified" ? "10+ successful trades" : "50+ successful trades"}`}
    >
      <Icon size={iconSize} />
      {showLabel && config.label}
    </span>
  );
};
