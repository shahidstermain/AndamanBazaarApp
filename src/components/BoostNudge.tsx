import React from 'react';
import { Rocket, TrendingUp } from 'lucide-react';

// ============================================================
// BoostNudge — inline CTA to encourage sellers to boost listings
// Shows when a listing has low engagement after 24 hours
// ============================================================

interface BoostNudgeProps {
    listingId: string;
    listingTitle: string;
    /** How many hours since listing was created */
    hoursSinceCreated?: number;
    /** Chat count for this listing (0 = no engagement) */
    chatCount?: number;
    /** View count for this listing */
    viewCount?: number;
    onBoostClick: (listingId: string) => void;
    className?: string;
}

export const BoostNudge: React.FC<BoostNudgeProps> = ({
    listingId,
    listingTitle,
    hoursSinceCreated = 0,
    chatCount = 0,
    viewCount = 0,
    onBoostClick,
    className = '',
}) => {
    // Only show nudge if listing is old enough and has low engagement
    const shouldShow = hoursSinceCreated >= 24 && chatCount === 0;

    if (!shouldShow) return null;

    return (
        <div
            className={`relative overflow-hidden rounded-2xl border border-amber-200/60 bg-gradient-to-r from-amber-50 via-amber-50/50 to-orange-50 p-4 ${className}`}
        >
            {/* Decorative glow */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-amber-200/30 rounded-full blur-2xl pointer-events-none" />

            <div className="relative flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
                    <Rocket size={18} className="text-white" />
                </div>

                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-amber-900 mb-0.5">
                        Get more eyes on "{listingTitle.length > 25 ? listingTitle.slice(0, 25) + '…' : listingTitle}"
                    </h4>
                    <p className="text-xs text-amber-700/70 leading-relaxed mb-3">
                        {viewCount > 0
                            ? `${viewCount} views but no responses yet. Boost to get 3× more visibility.`
                            : 'No responses yet. Boost your listing to reach more buyers.'}
                    </p>
                    <button
                        onClick={() => onBoostClick(listingId)}
                        className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-sm hover:shadow-md transition-all duration-300 active:scale-95"
                    >
                        <TrendingUp size={12} />
                        Boost from ₹49
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BoostNudge;
