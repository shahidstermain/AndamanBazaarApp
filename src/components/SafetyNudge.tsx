import React from "react";
import { ShieldAlert, X } from "lucide-react";

interface SafetyNudgeProps {
  type: "payment" | "privacy" | "general";
  onDismiss: () => void;
}

const NUDGE_CONTENT = {
  payment: {
    title: "Keep payments safe",
    message:
      "Avoid sharing bank details or paying in advance. Meet in person or use secure payment methods.",
  },
  privacy: {
    title: "Protect your privacy",
    message:
      "Be careful sharing personal info like your home address or phone number too early.",
  },
  general: {
    title: "Stay safe",
    message:
      "Meet in public places. Trust your instincts. If something feels off, stop communication.",
  },
};

export const SafetyNudge: React.FC<SafetyNudgeProps> = ({
  type,
  onDismiss,
}) => {
  const content = NUDGE_CONTENT[type];

  return (
    <div className="mx-4 mb-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3 animate-fade-in shadow-sm">
      <div className="p-1.5 bg-amber-100 rounded-full text-amber-600 flex-shrink-0">
        <ShieldAlert size={16} />
      </div>
      <div className="flex-1">
        <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-0.5">
          {content.title}
        </h4>
        <p className="text-xs text-amber-700 leading-relaxed">
          {content.message}
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="text-amber-400 hover:text-amber-600 p-1"
        aria-label="Dismiss safety warning"
      >
        <X size={14} />
      </button>
    </div>
  );
};
