import React from "react";
import { ShieldCheck, ShieldAlert, Shield, Verified } from "lucide-react";

interface TrustScoreBadgeProps {
  score?: number;
  badge?: "Low" | "Good" | "Trusted" | "Premium";
  className?: string;
}

export const TrustScoreBadge: React.FC<TrustScoreBadgeProps> = ({
  score,
  badge = "Good",
  className = "",
}) => {
  if (score === undefined) return null;

  const getBadgeConfig = () => {
    switch (badge) {
      case "Premium":
        return {
          icon: <Verified size={14} className="text-white fill-blue-500" />,
          style: "bg-blue-50 text-blue-700 border-blue-200",
          label: "Premium Operator",
        };
      case "Trusted":
        return {
          icon: <ShieldCheck size={14} className="text-emerald-500" />,
          style: "bg-emerald-50 text-emerald-700 border-emerald-200",
          label: "Trusted Operator",
        };
      case "Low":
        return {
          icon: <ShieldAlert size={14} className="text-rose-500" />,
          style: "bg-rose-50 text-rose-700 border-rose-200",
          label: "New/Low Trust",
        };
      case "Good":
      default:
        return {
          icon: <Shield size={14} className="text-teal-600" />,
          style: "bg-teal-50 text-teal-700 border-teal-200",
          label: "Verified Operator",
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${config.style} ${className}`}
      title={config.label}
    >
      {config.icon}
      <span>
        {badge} {score}
      </span>
    </div>
  );
};
