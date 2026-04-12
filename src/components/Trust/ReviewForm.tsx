import React, { useState } from "react";
import { Camera, Star, Send, Loader2, ShieldCheck, Upload } from "lucide-react";
import { ReviewRatings } from "../../types";

interface ReviewFormProps {
  activityId: string;
  bookingId: string;
  onSubmit: (data: {
    ratings: ReviewRatings;
    comment: string;
    files: File[];
  }) => Promise<void>;
}

export const ReviewForm: React.FC<ReviewFormProps> = ({
  activityId,
  bookingId,
  onSubmit,
}) => {
  const [ratings, setRatings] = useState<ReviewRatings>({
    safety: 0,
    value: 0,
    fun: 0,
    communication: 0,
    accuracy: 0,
  });
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRatingChange = (key: keyof ReviewRatings, value: number) => {
    setRatings((prev) => ({ ...prev, [key]: value }));
  };

  const calculateAvg = () => {
    const vals = Object.values(ratings);
    const sum = vals.reduce((a, b) => a + b, 0);
    return (sum / vals.length).toFixed(1);
  };

  const handleFileDrop = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).slice(0, 3 - files.length); // Max 3 files
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasZeros = Object.values(ratings).some((r) => r === 0);
    if (hasZeros) {
      setError("Please rate all criteria.");
      return;
    }
    if (comment.length < 10) {
      setError("Please write a comment with at least 10 characters.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({ ratings, comment, files });
      // Reset is optional if the parent navigates away or hides the form on success
    } catch (err: any) {
      setError(err.message || "Failed to submit review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-[24px] border border-warm-200 p-6 shadow-glass">
      <div className="flex items-center gap-2 mb-6">
        <ShieldCheck className="text-teal-600" size={24} />
        <h3 className="text-xl font-black text-midnight-900">
          Verified Review
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-sm font-bold">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(Object.keys(ratings) as Array<keyof ReviewRatings>).map(
            (criteria) => (
              <div key={criteria} className="space-y-2">
                <label className="text-xs font-bold text-warm-500 uppercase tracking-widest flex justify-between">
                  <span>{criteria}</span>
                  <span className="text-midnight-900">
                    {ratings[criteria]} / 5
                  </span>
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleRatingChange(criteria, val)}
                      aria-label={`Rate ${criteria} ${val} out of 5`}
                      className="p-1 focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        size={24}
                        className={
                          val <= ratings[criteria]
                            ? "fill-amber-400 text-amber-400"
                            : "fill-warm-100 text-warm-200"
                        }
                      />
                    </button>
                  ))}
                </div>
              </div>
            ),
          )}
        </div>

        <div className="bg-warm-50 p-4 rounded-2xl flex justify-between items-center border border-warm-100">
          <span className="text-sm font-black text-midnight-900 uppercase tracking-widest">
            Calculated Average Rating
          </span>
          <div className="flex items-center gap-2 text-2xl font-black text-amber-500">
            <Star size={24} className="fill-amber-400" />
            {calculateAvg()}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-warm-500 uppercase tracking-widest">
            Share Your Experience
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What was the highlight? Was it safe? How was the operator?"
            className="w-full bg-white border border-warm-200 rounded-2xl p-4 text-midnight-900 min-h-[120px] focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 resize-none"
          />
        </div>

        <div className="space-y-4">
          <label className="text-xs font-bold text-warm-500 uppercase tracking-widest">
            Add Photos (Max 3)
          </label>
          <div className="flex gap-4 flex-wrap">
            {files.map((f, i) => (
              <div
                key={i}
                className="w-24 h-24 rounded-2xl bg-warm-100 border border-warm-200 overflow-hidden relative group"
              >
                <img
                  src={URL.createObjectURL(f)}
                  alt="review upload"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() =>
                    setFiles((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center font-bold text-xs transition-opacity"
                >
                  Remove
                </button>
              </div>
            ))}
            {files.length < 3 && (
              <label className="w-24 h-24 rounded-2xl border-2 border-dashed border-warm-200 flex flex-col items-center justify-center text-warm-400 cursor-pointer hover:bg-warm-50 hover:border-warm-300 transition-colors">
                <Camera size={24} className="mb-1" />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  Upload
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  multiple
                  onChange={handleFileDrop}
                />
              </label>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 bg-midnight-900 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-teal-600 active:scale-95 transition-all shadow-xl hover:shadow-teal-900/20 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Verifying & Submitting...
            </>
          ) : (
            <>
              <Send size={18} />
              Post Verified Review
            </>
          )}
        </button>
      </form>
    </div>
  );
};
