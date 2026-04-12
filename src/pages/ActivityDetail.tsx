import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { httpsCallable } from "firebase/functions";
import { db, storage, functions, auth } from "../lib/firebase";
import { Activity, Review } from "../../types";
import { TrustScoreBadge } from "../components/Trust/TrustScoreBadge";
import { MatchScoreBadge } from "../components/Trust/MatchScoreBadge";
import { ReviewForm } from "../components/Trust/ReviewForm";
import { ReviewList } from "../components/Trust/ReviewList";
import {
  MapPin,
  Clock,
  DollarSign,
  Star,
  ArrowLeft,
  ShieldCheck,
  Waves,
  Calendar,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const ActivityDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Fetch the activity document
  useEffect(() => {
    if (!id) return;
    const fetchActivity = async () => {
      try {
        const activityDoc = await getDoc(doc(db, "activities", id));
        if (activityDoc.exists()) {
          setActivity({
            id: activityDoc.id,
            ...activityDoc.data(),
          } as Activity);
        } else {
          setError("Activity not found.");
        }
      } catch (err) {
        setError("Failed to load activity details.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchActivity();
  }, [id]);

  // Fetch reviews for this activity
  useEffect(() => {
    if (!id) return;
    const fetchReviews = async () => {
      try {
        const q = query(
          collection(db, "reviews"),
          where("activityId", "==", id),
        );
        const snap = await getDocs(q);
        setReviews(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Review));
      } catch (err) {
        console.error("Failed to fetch reviews:", err);
      } finally {
        setReviewsLoading(false);
      }
    };
    fetchReviews();
  }, [id]);

  const handleReviewSubmit = async ({
    ratings,
    comment,
    files,
  }: {
    ratings: any;
    comment: string;
    files: File[];
  }) => {
    const user = auth.currentUser;
    if (!user) throw new Error("You must be logged in to leave a review.");

    // Upload media files to Firebase Storage
    const mediaUrls: string[] = [];
    for (const file of files) {
      const storageRef = ref(
        storage,
        `reviews/${user.uid}/${Date.now()}_${file.name}`,
      );
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      mediaUrls.push(url);
    }

    // Call the Cloud Function
    const createReview = httpsCallable(functions, "createReview");
    // NOTE: bookingId is required by the function – in a real flow, this would come from
    // an active completed booking. For this implementation we use a mock value for development.
    // In production, this page should receive a bookingId from query params or navigation state.
    const bookingId =
      new URLSearchParams(window.location.search).get("bookingId") ||
      "mock-booking-id";
    await createReview({
      activityId: id,
      bookingId,
      ratings,
      comment,
      mediaUrls,
    });

    setReviewSuccess(true);
    setShowReviewForm(false);
    // Refresh reviews
    const q = query(collection(db, "reviews"), where("activityId", "==", id));
    const snap = await getDocs(q);
    setReviews(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Review));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-24">
        <Loader2 size={40} className="animate-spin text-teal-600" />
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 pt-24 text-center px-4">
        <AlertCircle size={48} className="text-rose-400" />
        <h2 className="text-2xl font-black text-midnight-900">
          {error || "Activity not found"}
        </h2>
        <button
          onClick={() => navigate("/activities")}
          className="mt-2 px-6 py-3 bg-midnight-900 text-white rounded-2xl font-bold hover:bg-teal-600 transition-colors"
        >
          Back to Activities
        </button>
      </div>
    );
  }

  const getGradient = (type: string) => {
    switch (type) {
      case "Scuba Diving":
        return "from-blue-600 to-cyan-400";
      case "Trekking":
        return "from-emerald-600 to-teal-400";
      case "History":
        return "from-amber-700 to-orange-500";
      case "Beaches":
        return "from-sky-500 to-blue-300";
      case "Leisure":
        return "from-purple-500 to-pink-400";
      default:
        return "from-teal-600 to-emerald-400";
    }
  };

  return (
    <div className="min-h-screen bg-warm-50/50 pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-bold text-warm-500 hover:text-teal-600 transition-colors mb-8 group"
        >
          <ArrowLeft
            size={16}
            className="group-hover:-translate-x-1 transition-transform"
          />
          Back to Activities
        </button>

        {/* Hero Banner */}
        <div
          className={`relative w-full h-64 md:h-80 rounded-[32px] bg-gradient-to-tr ${getGradient(activity.type)} overflow-hidden mb-8 shadow-xl`}
        >
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative z-10 p-8 h-full flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <MatchScoreBadge score={70} />
              <div className="flex gap-2">
                {activity.familyFriendly && (
                  <div
                    className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white"
                    title="Family Friendly"
                  >
                    <ShieldCheck size={18} />
                  </div>
                )}
                {activity.requiresSwimming && (
                  <div
                    className="w-9 h-9 rounded-full bg-teal-900/40 backdrop-blur-md flex items-center justify-center text-teal-100 border border-teal-500/30"
                    title="Swimming Required"
                  >
                    <Waves size={18} />
                  </div>
                )}
              </div>
            </div>
            <div>
              <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-2">
                {activity.type} • {activity.island}
              </p>
              <h1 className="text-3xl md:text-4xl font-black text-white leading-tight">
                {activity.title}
              </h1>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-warm-200 p-4 flex flex-col items-center text-center shadow-sm">
            <DollarSign size={20} className="text-teal-600 mb-1" />
            <span className="text-2xl font-black text-midnight-900">
              ₹{activity.price}
            </span>
            <span className="text-[10px] text-warm-400 font-bold uppercase tracking-widest">
              Per Person
            </span>
          </div>
          <div className="bg-white rounded-2xl border border-warm-200 p-4 flex flex-col items-center text-center shadow-sm">
            <Clock size={20} className="text-teal-600 mb-1" />
            <span className="text-2xl font-black text-midnight-900">
              {activity.durationMinutes}
            </span>
            <span className="text-[10px] text-warm-400 font-bold uppercase tracking-widest">
              Minutes
            </span>
          </div>
          <div className="bg-white rounded-2xl border border-warm-200 p-4 flex flex-col items-center text-center shadow-sm">
            <Star size={20} className="text-amber-400 mb-1 fill-amber-400" />
            <span className="text-2xl font-black text-midnight-900">
              {activity.rating}
            </span>
            <span className="text-[10px] text-warm-400 font-bold uppercase tracking-widest">
              ({activity.reviewCount} reviews)
            </span>
          </div>
          <div className="bg-white rounded-2xl border border-warm-200 p-4 flex flex-col items-center text-center shadow-sm">
            <MapPin size={20} className="text-teal-600 mb-1" />
            <span className="text-lg font-black text-midnight-900">
              {activity.difficulty}
            </span>
            <span className="text-[10px] text-warm-400 font-bold uppercase tracking-widest">
              Difficulty
            </span>
          </div>
        </div>

        {/* Trust Badge */}
        {(activity.trustScore !== undefined || activity.trustBadge) && (
          <div className="bg-white rounded-2xl border border-warm-200 p-4 mb-8 flex items-center gap-4 shadow-sm">
            <TrustScoreBadge
              score={activity.trustScore}
              badge={activity.trustBadge}
            />
            <div>
              <p className="text-sm font-black text-midnight-900">
                Operator Verified
              </p>
              <p className="text-xs text-warm-500 font-bold">
                This operator has been reviewed and validated on the platform.
              </p>
            </div>
          </div>
        )}

        {/* Season */}
        {activity.season && activity.season.length > 0 && (
          <div className="bg-white rounded-2xl border border-warm-200 p-4 mb-8 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={16} className="text-teal-600" />
              <h3 className="text-sm font-black text-midnight-900 uppercase tracking-widest">
                Best Seasons
              </h3>
            </div>
            <div className="flex gap-2 flex-wrap">
              {activity.season.map((month) => (
                <span
                  key={month}
                  className="bg-teal-50 text-teal-700 border border-teal-200 text-xs font-black px-3 py-1 rounded-lg uppercase tracking-widest"
                >
                  {month}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Review Success Banner */}
        {reviewSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-8 flex items-center gap-3">
            <ShieldCheck size={20} className="text-emerald-600" />
            <p className="text-sm font-bold text-emerald-700">
              Your verified review has been submitted successfully!
            </p>
          </div>
        )}

        {/* Reviews Section */}
        <div className="space-y-6 mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-midnight-900">
              Reviews & Ratings
            </h2>
            {auth.currentUser && !reviewSuccess && (
              <button
                onClick={() => setShowReviewForm((prev) => !prev)}
                className="flex items-center gap-2 px-5 py-2.5 bg-midnight-900 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-teal-600 transition-colors shadow-lg"
              >
                {showReviewForm ? (
                  <>
                    <ChevronUp size={16} /> Hide Form
                  </>
                ) : (
                  <>
                    <Star size={16} /> Write a Review
                  </>
                )}
              </button>
            )}
          </div>

          {showReviewForm && (
            <div className="animate-fade-in">
              <ReviewForm
                activityId={id!}
                bookingId={
                  new URLSearchParams(window.location.search).get(
                    "bookingId",
                  ) || ""
                }
                onSubmit={handleReviewSubmit}
              />
            </div>
          )}

          <ReviewList reviews={reviews} isLoading={reviewsLoading} />
        </div>
      </div>
    </div>
  );
};

export default ActivityDetail;
