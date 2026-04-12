import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  MapPin,
  Clock,
  ArrowRight,
  Ship,
  Waves,
  Utensils,
  Camera,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Info,
  DollarSign,
  Compass,
  ChevronLeft,
} from "lucide-react";
import { Seo } from "../components/Seo";
import { auth, db } from "../lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  limit,
} from "firebase/firestore";

interface Activity {
  id: string;
  time: string;
  title: string;
  type: string;
  durationMinutes: number;
  estimatedCost: number;
  island: string;
  isBookable: boolean;
  operatorId: string | null;
  notes: string;
}

interface Day {
  dayNumber: number;
  date: string;
  island: string;
  activities: Activity[];
}

interface Itinerary {
  id?: string;
  tripVersion: number;
  currency: string;
  days: Day[];
  totalEstimatedCost: number;
  createdAt?: any;
}

// Mock data as fallback
const MOCK_ITINERARY: Itinerary = {
  tripVersion: 1,
  currency: "INR",
  days: [
    {
      dayNumber: 1,
      date: "2026-03-20",
      island: "Port Blair",
      activities: [
        {
          id: "act_001",
          time: "09:00",
          title: "Arrival at Port Blair & Hotel Check-in",
          type: "Transfer",
          durationMinutes: 120,
          estimatedCost: 1500,
          island: "Port Blair",
          isBookable: false,
          operatorId: null,
          notes: "Pre-book airport pickup. Carry ID proof for hotel check-in.",
        },
        {
          id: "act_002",
          time: "12:30",
          title: "Visit Cellular Jail",
          type: "History & Culture",
          durationMinutes: 120,
          estimatedCost: 200,
          island: "Port Blair",
          isBookable: true,
          operatorId: null,
          notes:
            "Carry water and wear light clothing. Tickets available at entrance.",
        },
        {
          id: "act_003",
          time: "16:00",
          title: "Corbyn’s Cove Beach Visit",
          type: "Beaches",
          durationMinutes: 120,
          estimatedCost: 300,
          island: "Port Blair",
          isBookable: false,
          operatorId: null,
          notes: "Good for relaxation. Avoid swimming in rough conditions.",
        },
        {
          id: "act_004",
          time: "18.00",
          title: "Cellular Jail Light & Sound Show",
          type: "History & Culture",
          durationMinutes: 90,
          estimatedCost: 500,
          island: "Port Blair",
          isBookable: true,
          operatorId: null,
          notes: "Arrive 20 minutes early for seating.",
        },
      ],
    },
    {
      dayNumber: 2,
      date: "2026-03-21",
      island: "Havelock (Swaraj Dweep)",
      activities: [
        {
          id: "act_005",
          time: "06:30",
          title: "Ferry Transfer to Havelock Island",
          type: "Transfer",
          durationMinutes: 150,
          estimatedCost: 1500,
          island: "Port Blair",
          isBookable: true,
          operatorId: null,
          notes:
            "Book ferry tickets in advance. Carry printed or digital copy.",
        },
      ],
    },
  ],
  totalEstimatedCost: 19100,
};

export const TripPlanner: React.FC = () => {
  const navigate = useNavigate();
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(1);
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    const fetchLatestItinerary = async () => {
      if (!auth.currentUser) {
        setItinerary(MOCK_ITINERARY);
        setLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, "itineraries"),
          where("userId", "==", auth.currentUser.uid),
          orderBy("createdAt", "desc"),
          limit(1),
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          setItinerary({ id: doc.id, ...doc.data() } as Itinerary);
        } else {
          setItinerary(MOCK_ITINERARY);
        }
      } catch (err) {
        console.error("Error fetching itinerary:", err);
        setItinerary(MOCK_ITINERARY);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestItinerary();
  }, []);

  const toggleActivity = (id: string) => {
    const next = new Set(expandedActivities);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedActivities(next);
  };

  const getActivityIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "transfer":
        return <Ship size={18} />;
      case "beaches":
        return <Waves size={18} />;
      case "local food":
        return <Utensils size={18} />;
      case "photography":
        return <Camera size={18} />;
      case "history & culture":
        return <Compass size={18} />;
      default:
        return <Clock size={18} />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-teal-100 animate-pulse"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-ocean-500 animate-spin"></div>
        </div>
        <p className="text-warm-400 font-heading font-bold animate-pulse">
          Personalizing your itinerary...
        </p>
      </div>
    );
  }

  if (!itinerary) return null;

  return (
    <div className="min-h-screen bg-warm-50 pb-24">
      <Seo
        title="AI Trip Planner | AndamanBazaar"
        description="Your personalized island adventure itinerary"
      />

      {/* ── HEADER ── */}
      <section className="relative overflow-hidden bg-gradient-ocean-deep text-white pb-20 pt-10">
        <div className="absolute inset-0 opacity-20 bg-radial-teal-glow pointer-events-none" />
        <div className="app-container relative z-10">
          <button
            onClick={() => navigate(-1)}
            className="mb-6 flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <ChevronLeft size={20} />
            <span className="text-sm font-bold">Back</span>
          </button>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 flex items-center gap-1.5">
                  <Sparkles size={12} className="text-teal-300" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-teal-100">
                    AI Generated Plan
                  </span>
                </div>
              </div>
              <h1 className="text-3xl md:text-5xl font-display font-black leading-tight mb-2">
                Andaman <span className="text-teal-300">Adventure</span>
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-white/60">
                <div className="flex items-center gap-1.5">
                  <Calendar size={16} />
                  <span className="text-sm font-bold">5 Days • March 2026</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin size={16} />
                  <span className="text-sm font-bold">
                    Port Blair, Havelock, Neil
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 min-w-[200px]">
              <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">
                Estimated Cost
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-display font-black">
                  ₹{itinerary.totalEstimatedCost.toLocaleString()}
                </span>
                <span className="text-xs text-white/50 font-bold uppercase">
                  INR
                </span>
              </div>
              <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-teal-400 w-3/4 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TIMELINE NAV ── */}
      <section className="-mt-10 mb-8 relative z-20">
        <div className="app-container">
          <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar pb-4 -mx-4 px-4 md:mx-0 md:px-0">
            {itinerary.days.map((day) => (
              <button
                key={day.dayNumber}
                onClick={() => setActiveDay(day.dayNumber)}
                className={`flex-shrink-0 flex flex-col items-center justify-center w-20 h-24 rounded-2xl border transition-all duration-300 ${
                  activeDay === day.dayNumber
                    ? "bg-white border-ocean-500 shadow-ocean-glow text-ocean-500 transform -translate-y-1"
                    : "bg-white/80 backdrop-blur-sm border-warm-200 text-warm-400 opacity-70 scale-95"
                }`}
              >
                <span className="text-[10px] font-black uppercase tracking-widest mb-1">
                  Day
                </span>
                <span className="text-2xl font-display font-black leading-none">
                  {day.dayNumber}
                </span>
                <span className="text-[8px] font-bold mt-2 truncate w-full text-center px-2">
                  {day.island.split(" (")[0]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── DAY CONTENT ── */}
      <section className="app-container">
        {itinerary.days
          .filter((d) => d.dayNumber === activeDay)
          .map((day) => (
            <div key={day.dayNumber} className="animate-fade-in-up">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 shadow-sm border border-teal-100">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-midnight-700">
                      {day.island}
                    </h2>
                    <p className="text-sm text-warm-400 font-medium">
                      {new Date(day.date).toLocaleDateString("en-IN", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {day.activities.map((activity, idx) => {
                  const isExpanded = expandedActivities.has(activity.id);
                  return (
                    <div
                      key={activity.id}
                      className="premium-card group hover:border-ocean-300 transition-all duration-300"
                    >
                      <div
                        className="p-5 flex items-start gap-4 cursor-pointer"
                        onClick={() => toggleActivity(activity.id)}
                      >
                        <div className="text-warm-300 font-display font-medium text-sm pt-1 w-12 flex-shrink-0">
                          {activity.time}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="p-1 rounded bg-warm-100 text-warm-400">
                                  {getActivityIcon(activity.type)}
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-[0.1em] text-warm-400">
                                  {activity.type}
                                </span>
                              </div>
                              <h3 className="font-bold text-midnight-700 md:text-lg">
                                {activity.title}
                              </h3>
                            </div>
                            <button
                              className={`p-1 rounded-full hover:bg-warm-50 transition-colors ${isExpanded ? "rotate-180" : ""}`}
                              title={
                                isExpanded
                                  ? "Collapse details"
                                  : "Expand details"
                              }
                            >
                              <ChevronDown
                                size={20}
                                className="text-warm-300"
                              />
                            </button>
                          </div>

                          {/* Expandable Content */}
                          <div
                            className={`overflow-hidden transition-all duration-300 ${isExpanded ? "max-h-96 mt-4 opacity-100" : "max-h-0 opacity-0"}`}
                          >
                            <div className="bg-warm-50 rounded-xl p-4 border border-warm-100 mb-4">
                              <p className="text-sm text-midnight-600 leading-relaxed mb-4">
                                {activity.notes}
                              </p>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-2">
                                  <Clock size={14} className="text-warm-400" />
                                  <span className="text-xs font-bold text-warm-500">
                                    {activity.durationMinutes} Minutes
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <DollarSign
                                    size={14}
                                    className="text-teal-600"
                                  />
                                  <span className="text-xs font-bold text-teal-700">
                                    ₹{activity.estimatedCost.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {activity.isBookable && (
                              <button className="btn-ocean w-full py-2.5 text-sm">
                                Book Experience <ChevronRight size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
      </section>

      {/* ── FOOTER CTA ── */}
      <div className="fixed bottom-0 left-0 w-full p-4 pointer-events-none z-50">
        <div className="app-container max-w-lg">
          <div className="bg-midnight-800/95 backdrop-blur-xl border border-white/10 rounded-3xl p-4 shadow-elevated flex items-center justify-between pointer-events-auto">
            <div>
              <p className="text-white/40 text-[10px] font-black uppercase tracking-widest pl-1">
                Total Trip Value
              </p>
              <div className="text-xl font-display font-black text-white px-1">
                ₹{itinerary.totalEstimatedCost.toLocaleString()}
              </div>
            </div>
            <button className="bg-coral-500 text-white px-6 py-3 rounded-2xl font-heading font-black text-sm flex items-center gap-2 shadow-coral-glow active:scale-95 transition-all">
              Safe Booking <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
