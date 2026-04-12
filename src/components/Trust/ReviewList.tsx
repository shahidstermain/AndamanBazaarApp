import React, { useState } from "react";
import { Review } from "../../types";
import { Star, ShieldCheck, ThumbsUp, Calendar } from "lucide-react";

interface ReviewListProps {
  reviews: Review[];
  isLoading?: boolean;
}

export const ReviewList: React.FC<ReviewListProps> = ({
  reviews,
  isLoading = false,
}) => {
  const [filter, setFilter] = useState<"latest" | "highest" | "lowest">(
    "latest",
  );

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-[24px] border border-warm-100 p-6 h-40"
          ></div>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="bg-warm-50 rounded-[24px] border border-warm-200 p-12 text-center">
        <Star size={48} className="text-warm-300 mx-auto mb-4" />
        <h4 className="text-lg font-black text-midnight-900 mb-2">
          No Reviews Yet
        </h4>
        <p className="text-warm-500 text-sm">
          Be the first to share your verified experience.
        </p>
      </div>
    );
  }

  const sortedReviews = [...reviews].sort((a, b) => {
    if (filter === "latest")
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (filter === "highest") return b.avgRating - a.avgRating;
    return a.avgRating - b.avgRating;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-midnight-900">
          Verified Reviews
        </h3>
        <select
          value={filter}
          aria-label="Sort reviews by"
          onChange={(e) => setFilter(e.target.value as any)}
          className="bg-white border border-warm-200 rounded-xl px-4 py-2 text-sm font-bold text-midnight-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
        >
          <option value="latest">Latest</option>
          <option value="highest">Highest Rated</option>
          <option value="lowest">Lowest Rated</option>
        </select>
      </div>

      <div className="space-y-4">
        {sortedReviews.map((review) => (
          <div
            key={review.id}
            className="bg-white rounded-[24px] border border-warm-200 p-6 shadow-sm"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-white font-black">
                  U
                </div>
                <div>
                  <h4 className="font-black text-midnight-900 text-sm">
                    Guest User
                  </h4>
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold uppercase tracking-widest">
                    <ShieldCheck size={12} />
                    Verified Booking
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1 text-lg font-black text-amber-500">
                  <Star size={16} className="fill-amber-400" />
                  {review.avgRating.toFixed(1)}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-warm-400 font-bold uppercase tracking-wider">
                  <Calendar size={10} />
                  {new Date(review.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            <p className="text-warm-600 text-sm leading-relaxed mb-4">
              {review.comment}
            </p>

            <div className="flex gap-2 flex-wrap mb-4">
              {review.mediaUrls?.map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  alt={`Review media ${idx}`}
                  className="w-20 h-20 rounded-xl object-cover border border-warm-100"
                />
              ))}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 bg-warm-50 p-3 rounded-xl border border-warm-100">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-warm-400 uppercase tracking-widest">
                  Safety
                </span>
                <span className="text-sm font-black text-midnight-900">
                  {review.ratings.safety} / 5
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-warm-400 uppercase tracking-widest">
                  Value
                </span>
                <span className="text-sm font-black text-midnight-900">
                  {review.ratings.value} / 5
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-warm-400 uppercase tracking-widest">
                  Fun
                </span>
                <span className="text-sm font-black text-midnight-900">
                  {review.ratings.fun} / 5
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-warm-400 uppercase tracking-widest">
                  Comms
                </span>
                <span className="text-sm font-black text-midnight-900">
                  {review.ratings.communication} / 5
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-warm-400 uppercase tracking-widest">
                  Accuracy
                </span>
                <span className="text-sm font-black text-midnight-900">
                  {review.ratings.accuracy} / 5
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-warm-100 flex items-center gap-4">
              <button className="flex items-center gap-1.5 text-[11px] text-warm-400 font-bold uppercase tracking-widest hover:text-teal-600 transition-colors">
                <ThumbsUp size={14} /> Helpful
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
