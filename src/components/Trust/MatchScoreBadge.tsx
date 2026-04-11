import React from 'react';
import { Flame } from 'lucide-react';

interface MatchScoreBadgeProps {
  score: number;
  className?: string;
}

export const MatchScoreBadge: React.FC<MatchScoreBadgeProps> = ({ score, className = '' }) => {
  const getMatchStyles = (s: number) => {
    if (s >= 90) return 'bg-orange-500 text-white border-orange-400 shadow-orange-500/20';
    if (s >= 70) return 'bg-amber-400 text-midnight-900 border-amber-300 shadow-amber-400/20';
    return 'bg-warm-100 text-warm-600 border-warm-200 shadow-sm';
  };

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border shadow-lg backdrop-blur-sm ${getMatchStyles(score)} ${className}`}>
      <Flame size={14} className={score >= 90 ? 'animate-pulse' : ''} />
      {score}% Match
    </div>
  );
};
