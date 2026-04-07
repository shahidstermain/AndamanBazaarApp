import React from 'react';
import { Zap } from 'lucide-react';

interface UrgentBadgeProps {
  size?: 'sm' | 'md';
  className?: string;
}

export const UrgentBadge: React.FC<UrgentBadgeProps> = ({ size = 'sm', className = '' }) => {
  if (size === 'sm') {
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-full shadow-md animate-pulse ${className}`}>
        <Zap size={10} fill="currentColor" />
        <span className="text-[9px] font-black uppercase tracking-tighter">Urgent</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl shadow-lg shadow-red-500/20 animate-pulse ${className}`}>
      <Zap size={14} fill="currentColor" />
      <span className="text-xs font-black uppercase tracking-widest">Urgent Deal</span>
    </div>
  );
};
