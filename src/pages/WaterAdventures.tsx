import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, MapPin, Users, Calendar, Phone,
  Mail, ChevronDown, CheckCircle2, Clock, Send, Waves,
  Star, Shield, IndianRupee
} from 'lucide-react';

const ACTIVITIES = [
  {
    id: 'scuba-diving',
    emoji: '\u{1F93F}',
    name: 'Scuba Diving',
    tagline: 'Crown jewel of Andaman adventures',
    description: 'Beginners can try a Discover Scuba Dive at North Bay Island, while certified divers head to Chidiyatapu for advanced dives.',
    locations: ['North Bay Island', 'Chidiyatapu'],
    price: 'From \u20B94,500',
    ageRange: '10+',
    duration: '45\u201390 min',
    gradient: 'from-blue-600 to-cyan-500',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-600',
  },
  {
    id: 'sea-walking',
    emoji: '\u{1F6B6}',
    name: 'Sea Walking',
    tagline: 'Walk the ocean bed \u2014 no swimming needed',
    description: 'Walk on the ocean bed at 10\u201312 ft depth wearing a helmeted visor that feeds air continuously. Ages 7\u201370, including non-swimmers.',
    locations: ['North Bay Island', 'Elephant Beach'],
    price: 'From \u20B93,500',
    ageRange: '7\u201370',
    duration: '~20 min underwater',
    gradient: 'from-teal-500 to-emerald-500',
    bgLight: 'bg-teal-50',
    textColor: 'text-teal-600',
  },
  {
    id: 'snorkeling',
    emoji: '\u{1F420}',
    name: 'Snorkeling',
    tagline: 'Crystal-clear reef exploration',
    description: 'Explore coral reefs, sea anemones, and diverse fish in shallow, crystal-clear water with a guide.',
    locations: ['North Bay Island', 'Elephant Beach', 'Bharatpur Beach'],
    price: 'From \u20B9600',
    ageRange: 'All ages',
    duration: '30\u201345 min',
    gradient: 'from-emerald-500 to-teal-400',
    bgLight: 'bg-emerald-50',
    textColor: 'text-emerald-600',
  },
  {
    id: 'parasailing',
    emoji: '\u{1FA82}',
    name: 'Parasailing',
    tagline: 'Fly like a kite above the sea',
    description: 'Harnessed in a parachute and towed by a speedboat, soaring above turquoise waters for breathtaking views.',
    locations: ['Rajiv Gandhi Water Sports Complex', 'Havelock Island', 'North Bay Beach'],
    price: 'From \u20B91,500',
    ageRange: '12\u201350',
    duration: '10\u201315 min',
    gradient: 'from-sky-500 to-blue-400',
    bgLight: 'bg-sky-50',
    textColor: 'text-sky-600',
  },
  {
    id: 'jet-skiing',
    emoji: '\u{1F6E5}\uFE0F',
    name: 'Jet Skiing',
    tagline: 'High-speed thrills on the water',
    description: 'High-speed jet ski rides with a quick briefing session and life jacket. A massive hit across the islands.',
    locations: ["Corbyn's Cove Beach", 'Rajiv Gandhi Complex', 'Elephant Beach'],
    price: 'From \u20B91,000',
    ageRange: '10+',
    duration: '10\u201315 min',
    gradient: 'from-orange-500 to-amber-500',
    bgLight: 'bg-orange-50',
    textColor: 'text-orange-600',
  },
  {
    id: 'speed-boat',
    emoji: '\u26A1',
    name: 'Speed Boat Rides',
    tagline: 'Transport meets thrill',
    description: 'Speed boat rides connecting Port Blair to Ross Island and North Bay Island. Transport and adventure combined.',
    locations: ['Andaman Water Sports Complex'],
    price: 'From \u20B9500',
    ageRange: 'All ages',
    duration: '15\u201320 min',
    gradient: 'from-violet-500 to-purple-500',
    bgLight: 'bg-violet-50',
    textColor: 'text-violet-600',
  },
  {
    id: 'banana-boat',
    emoji: '\u{1F34C}',
    name: 'Banana Boat Rides',
    tagline: 'Group fun for up to 6 people',
    description: 'A banana-shaped inflatable boat tethered to a speedboat. Ideal for families and groups of up to six people.',
    locations: ['Rajiv Gandhi Complex', 'Havelock Island', 'Neil Island'],
    price: 'From \u20B9500',
    ageRange: 'All ages',
    duration: '10\u201315 min',
    gradient: 'from-yellow-500 to-amber-400',
    bgLight: 'bg-yellow-50',
    textColor: 'text-yellow-600',
  },
  {
    id: 'glass-bottom-boat',
    emoji: '\u{1F52D}',
    name: 'Glass Bottom Boat',
    tagline: 'See marine life without getting wet',
    description: 'Witness exotic marine life through a glass-bottomed boat. Ideal for kids, elders, and anyone uncomfortable underwater.',
    locations: ['North Bay Island', 'Bharatpur Beach'],
    price: 'From \u20B9500',
    ageRange: 'All ages',
    duration: '20\u201330 min',
    gradient: 'from-cyan-500 to-teal-400',
    bgLight: 'bg-cyan-50',
    textColor: 'text-cyan-600',
  },
  {
    id: 'semi-submarine',
    emoji: '\u{1F6A2}',
    name: 'Semi Submarine',
    tagline: 'Immersive underwater panoramic views',
    description: 'A unique semi-submerged vessel offering panoramic viewing of coral reefs and marine life through its windows.',
    locations: ['North Bay Island'],
    price: 'From \u20B91,500',
    ageRange: 'All ages',
    duration: '30\u201345 min',
    gradient: 'from-indigo-500 to-blue-500',
    bgLight: 'bg-indigo-50',
    textColor: 'text-indigo-600',
  },
  {
    id: 'kayaking',
    emoji: '\u{1F6F6}',
    name: 'Kayaking & Mangrove Kayaking',
    tagline: 'Tranquil eco-adventure through mangroves',
    description: 'Self-paced kayaking at beaches plus scenic routes through dense mangrove forests near Port Blair and Havelock.',
    locations: ['Port Blair', 'Havelock Island', 'Jolly Buoy Island'],
    price: 'From \u20B9800',
    ageRange: 'All ages',
    duration: '1\u20132 hrs',
    gradient: 'from-green-500 to-emerald-400',
    bgLight: 'bg-green-50',
    textColor: 'text-green-600',
  },
  {
    id: 'windsurfing',
    emoji: '\u{1F3C4}',
    name: 'Windsurfing & Water Skiing',
    tagline: 'Classic skill-based water sports',
    description: 'Traditional water sports including windsurfing, water skiing, sail boats, and paddle/row boats.',
    locations: ['Andaman Water Sports Complex'],
    price: 'From \u20B91,000',
    ageRange: '12+',
    duration: '30\u201345 min',
    gradient: 'from-rose-500 to-pink-400',
    bgLight: 'bg-rose-50',
    textColor: 'text-rose-600',
  },
  {
    id: 'sea-karting',
    emoji: '\u{1F3CE}\uFE0F',
    name: 'Sea Karting',
    tagline: 'High-speed karts on water',
    description: 'An exciting newer activity \u2014 high-speed motorized karts on water that non-swimmers can also enjoy.',
    locations: ['Port Blair', 'Havelock Island'],
    price: 'From \u20B92,000',
    ageRange: '12+',
    duration: '15\u201320 min',
    gradient: 'from-red-500 to-orange-500',
    bgLight: 'bg-red-50',
    textColor: 'text-red-600',
  },
  {
    id: 'sport-fishing',
    emoji: '\u{1F3A3}',
    name: 'Sport Fishing / Angling',
    tagline: 'Guided open-sea fishing trips',
    description: 'Game fishing in the open sea with guided trips. A calmer, non-adrenaline experience on the water.',
    locations: ['Port Blair', 'Havelock Island'],
    price: 'From \u20B93,000',
    ageRange: 'All ages',
    duration: '2\u20134 hrs',
    gradient: 'from-slate-500 to-zinc-500',
    bgLight: 'bg-slate-50',
    textColor: 'text-slate-600',
  },
  {
    id: 'seaplane',
    emoji: '\u2708\uFE0F',
    name: 'Seaplane Ride',
    tagline: 'Aerial views of the archipelago',
    description: 'An aerial perspective of the islands, beaches, and turquoise lagoons. A premium luxury experience.',
    locations: ['Port Blair'],
    price: 'From \u20B98,000',
    ageRange: 'All ages',
    duration: '15\u201330 min',
    gradient: 'from-amber-500 to-yellow-400',
    bgLight: 'bg-amber-50',
    textColor: 'text-amber-600',
  },
  {
    id: 'harbour-cruise',
    emoji: '\u{1F6F3}\uFE0F',
    name: 'Harbour & Dinner Cruise',
    tagline: 'Scenic evening cruises with dining',
    description: 'Evening cruises with scenic views of Port Blair harbour and onboard dining experiences. Great for couples and families.',
    locations: ['Port Blair Harbour'],
    price: 'From \u20B91,500',
    ageRange: 'All ages',
    duration: '2\u20133 hrs',
    gradient: 'from-fuchsia-500 to-purple-400',
    bgLight: 'bg-fuchsia-50',
    textColor: 'text-fuchsia-600',
  },
];

const LOCATION_HOTSPOTS = [
  { name: 'North Bay Island, Port Blair', activities: 'Scuba, Sea Walk, Snorkeling, Jet Ski, Glass Bottom, Speed Boat' },
  { name: "Corbyn's Cove Beach, Port Blair", activities: 'Jet Ski, Parasailing, Speed Boat' },
  { name: 'Rajiv Gandhi Water Sports Complex', activities: 'Water Skiing, Windsurfing, Banana Boat, Parasailing' },
  { name: 'Chidiyatapu, Port Blair', activities: 'Advanced Scuba Diving' },
  { name: 'Elephant Beach, Havelock', activities: 'Snorkeling, Sea Walk, Scuba, Jet Ski' },
  { name: 'Bharatpur Beach, Neil Island', activities: 'Scuba, Jet Ski, Glass Bottom, Banana Boat' },
  { name: 'Jolly Buoy Island', activities: 'Kayaking, Snorkeling, Day Trips' },
];

const LOCATIONS = [
  'North Bay Island, Port Blair',
  "Corbyn's Cove Beach, Port Blair",
  'Rajiv Gandhi Water Sports Complex',
  'Chidiyatapu, Port Blair',
  'Elephant Beach, Havelock',
  'Bharatpur Beach, Neil Island',
  'Jolly Buoy Island',
  'Havelock Island (Swaraj Dweep)',
  'Neil Island (Shaheed Dweep)',
  'Port Blair (Others)',
  "Not sure \u2014 suggest me the best",
];

const BUDGET_RANGES = [
  'Under \u20B91,000 per person',
  '\u20B91,000 \u2013 \u20B93,000 per person',
  '\u20B93,000 \u2013 \u20B95,000 per person',
  '\u20B95,000 \u2013 \u20B910,000 per person',
  'Above \u20B910,000 per person',
  'Flexible / No budget constraint',
];

const REFERRAL_SOURCES = [
  'Google Search',
  'Instagram / Facebook',
  'YouTube',
  'Friend / Family Referral',
  'Travel Blog / Article',
  'TripAdvisor',
  'WhatsApp Group',
  'Other',
];

const SWIMMING_LEVELS = [
  'Non-swimmer',
  'Basic / Can float',
  'Intermediate swimmer',
  'Strong / Confident swimmer',
];

interface FormData {
  fullName: string;
  phone: string;
  email: string;
  adults: number;
  children: number;
  preferredDate: string;
  preferredLocation: string;
  selectedActivities: string[];
  swimmingAbility: string;
  budgetRange: string;
  referralSource: string;
  specialRequests: string;
}

const initialFormData: FormData = {
  fullName: '',
  phone: '',
  email: '',
  adults: 2,
  children: 0,
  preferredDate: '',
  preferredLocation: '',
  selectedActivities: [],
  swimmingAbility: '',
  budgetRange: '',
  referralSource: '',
  specialRequests: '',
};

export const WaterAdventures: React.FC = () => {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleActivity = (activityName: string) => {
    setFormData(prev => ({
      ...prev,
      selectedActivities: prev.selectedActivities.includes(activityName)
        ? prev.selectedActivities.filter(a => a !== activityName)
        : [...prev.selectedActivities, activityName],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const subject = encodeURIComponent(
      `Water Adventure Lead: ${formData.fullName} | ${formData.selectedActivities.length} activities`
    );
    const body = encodeURIComponent(
      [
        `--- WATER ADVENTURE LEAD ---`,
        ``,
        `Name: ${formData.fullName}`,
        `Phone: ${formData.phone}`,
        `Email: ${formData.email}`,
        ``,
        `Group: ${formData.adults} adult(s), ${formData.children} child(ren)`,
        `Preferred Date: ${formData.preferredDate || 'Not specified'}`,
        `Preferred Location: ${formData.preferredLocation || 'Not specified'}`,
        ``,
        `Activities: ${formData.selectedActivities.join(', ') || 'None selected'}`,
        `Swimming Ability: ${formData.swimmingAbility || 'Not specified'}`,
        `Budget: ${formData.budgetRange || 'Not specified'}`,
        ``,
        `Referral Source: ${formData.referralSource || 'Not specified'}`,
        ``,
        `Special Requests:`,
        formData.specialRequests || 'None',
        ``,
        `--- Submitted via AndamanBazaar.in ---`,
      ].join('\n')
    );

    window.open(
      `mailto:support@andamanbazaar.in?subject=${subject}&body=${body}`,
      '_blank'
    );

    await new Promise(r => setTimeout(r, 600));
    setSubmitting(false);
    setSubmitted(true);
  };

  const handleReset = () => {
    setFormData(initialFormData);
    setSubmitted(false);
  };

  const inputClass =
    'w-full p-3.5 rounded-2xl border-2 border-warm-200/60 bg-white font-medium text-midnight-700 placeholder:text-warm-400 focus:outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100 transition-all duration-200';
  const labelClass =
    'text-[11px] font-black uppercase tracking-widest text-warm-400 block mb-1.5';
  const selectClass =
    'w-full p-3.5 rounded-2xl border-2 border-warm-200/60 bg-white font-medium text-midnight-700 focus:outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100 transition-all duration-200 appearance-none cursor-pointer';

  return (
    <div className="min-h-screen bg-warm-50 pb-28 md:pb-12">

      {/* HERO */}
      <section className="relative overflow-hidden wave-divider bg-gradient-ocean-deep">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-20 blur-3xl pointer-events-none bg-radial-teal-glow" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[300px] h-[300px] rounded-full opacity-15 blur-3xl pointer-events-none bg-radial-sandy-glow" />

        <div className="relative z-10 px-4 pt-16 pb-24 md:pt-24 md:pb-32 text-center">
          <div className="app-container space-y-8 max-w-3xl mx-auto">
            <div className="reveal">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm font-bold transition-colors mb-6"
              >
                <ArrowLeft size={16} />
                Back to Home
              </Link>
            </div>

            <div className="reveal">
              <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full text-white/90 text-[11px] md:text-xs font-bold uppercase tracking-[0.15em]">
                <Waves size={14} className="text-teal-300" />
                15+ Water Adventures
              </span>
            </div>

            <div className="reveal reveal-delay-1">
              <h1 className="font-display text-4xl md:text-6xl xl:text-7xl text-white leading-[1.1] tracking-tight">
                Water Adventures{' '}
                <br className="md:hidden" />
                <span className="bg-gradient-to-r from-teal-200 via-teal-300 to-sandy-300 bg-clip-text text-transparent">
                  in Andaman
                </span>
              </h1>
            </div>

            <div className="reveal reveal-delay-2">
              <p className="text-teal-100/70 text-base md:text-lg max-w-lg mx-auto leading-relaxed font-sans">
                Scuba diving, parasailing, jet skiing, sea walking and more.
                Book your dream island adventure with AndamanBazaar.in
              </p>
            </div>

            <div className="reveal reveal-delay-3 flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={scrollToForm}
                className="btn-primary text-base py-3.5 px-8"
              >
                Book Now <ArrowRight size={16} />
              </button>
              <a
                href="#activities"
                className="btn-secondary text-base py-3.5 px-8 bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white/30"
              >
                Explore Activities
              </a>
            </div>

            <div className="reveal reveal-delay-4 flex flex-wrap items-center justify-center gap-6 text-white/40 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <Shield size={14} className="text-teal-300/70" />
                Trained Professionals
              </span>
              <span className="flex items-center gap-1.5">
                <Star size={14} className="text-sandy-400/70" />
                1,000+ Happy Tourists
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin size={14} className="text-coral-300/70" />
                7+ Island Locations
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ACTIVITIES GRID */}
      <section id="activities" className="px-4 pt-12 mb-12">
        <div className="app-container">
          <div className="text-center mb-10 reveal">
            <h2 className="font-heading font-extrabold text-2xl md:text-3xl text-midnight-700 tracking-tight">
              All Water Adventures
            </h2>
            <p className="text-warm-400 text-sm md:text-base mt-2 max-w-lg mx-auto">
              From beginner-friendly to adrenaline-pumping, we have the perfect activity for everyone.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {ACTIVITIES.map((activity, i) => (
              <div
                key={activity.id}
                className="premium-card group reveal overflow-hidden"
                style={{ animationDelay: `${(i % 6) * 60}ms` }}
              >
                <div className={`h-2 bg-gradient-to-r ${activity.gradient}`} />
                <div className="p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${activity.bgLight} group-hover:scale-110 transition-transform duration-500`}>
                      {activity.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading font-extrabold text-midnight-700 text-base leading-tight">
                        {activity.name}
                      </h3>
                      <p className={`text-xs font-bold mt-0.5 ${activity.textColor}`}>
                        {activity.tagline}
                      </p>
                    </div>
                  </div>

                  <p className="text-warm-400 text-sm leading-relaxed">
                    {activity.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {activity.locations.map(loc => (
                      <span
                        key={loc}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-midnight-700 bg-warm-100 px-2 py-1 rounded-full"
                      >
                        <MapPin size={10} className="text-teal-500" />
                        {loc}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-warm-100">
                    <div className="flex items-center gap-3 text-[11px] font-bold text-warm-400">
                      <span className="flex items-center gap-1">
                        <IndianRupee size={11} /> {activity.price.replace('From ', '')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={11} /> {activity.ageRange}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> {activity.duration}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LOCATION HOTSPOTS */}
      <section className="px-4 mb-12">
        <div className="app-container">
          <div className="relative rounded-[28px] overflow-hidden reveal bg-gradient-verified">
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-30 blur-2xl bg-radial-verified-glow" />
            <div className="relative p-6 md:p-8 space-y-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-teal-600/10 flex items-center justify-center">
                  <MapPin size={18} className="text-teal-600" />
                </div>
                <h3 className="font-heading font-extrabold text-teal-800 text-base md:text-lg">
                  Location Hotspots
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {LOCATION_HOTSPOTS.map(loc => (
                  <div
                    key={loc.name}
                    className="flex items-start gap-3 bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-white/40"
                  >
                    <div className="w-8 h-8 rounded-xl bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MapPin size={14} className="text-teal-600" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-midnight-700 leading-tight">{loc.name}</p>
                      <p className="text-xs text-warm-400 mt-1 leading-relaxed">{loc.activities}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LEAD GENERATION FORM */}
      <div ref={formRef} className="scroll-mt-24" id="book">
        <section className="px-4 mb-12">
          <div className="app-container max-w-3xl mx-auto">
            <div className="premium-card overflow-hidden reveal">
              {/* Form Header */}
              <div className="bg-gradient-ocean-deep p-6 md:p-8 text-center relative overflow-hidden">
                <div className="absolute top-[-20%] right-[-10%] w-[300px] h-[300px] rounded-full opacity-20 blur-3xl pointer-events-none bg-radial-teal-glow" />
                <div className="relative z-10">
                  <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full text-white/90 text-[10px] font-bold uppercase tracking-[0.15em] mb-4">
                    <Send size={12} />
                    Free Enquiry
                  </span>
                  <h2 className="font-heading font-extrabold text-2xl md:text-3xl text-white">
                    Book Your Adventure
                  </h2>
                  <p className="text-teal-200/60 text-sm mt-2 max-w-md mx-auto">
                    Fill in your details and we'll craft the perfect water adventure package for your group.
                  </p>
                </div>
              </div>

              {submitted ? (
                /* SUCCESS STATE */
                <div className="p-8 md:p-12 text-center space-y-6">
                  <div className="w-20 h-20 rounded-full bg-teal-50 mx-auto flex items-center justify-center animate-scale-in">
                    <CheckCircle2 size={40} className="text-teal-500" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-heading font-extrabold text-2xl text-midnight-700">
                      Enquiry Submitted!
                    </h3>
                    <p className="text-warm-400 text-base leading-relaxed max-w-md mx-auto">
                      Thank you for your interest, <span className="font-bold text-midnight-700">{formData.fullName}</span>!
                      We will get back to you as soon as possible.
                    </p>
                    <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 px-4 py-3 rounded-2xl text-amber-700 text-sm font-bold">
                      <Clock size={16} />
                      We usually reach out within 12 hours of submission. Kindly wait!
                    </div>
                    <p className="text-warm-400 text-sm mt-2">
                      If urgent, email us at{' '}
                      <a href="mailto:support@andamanbazaar.in" className="text-teal-600 font-bold underline">
                        support@andamanbazaar.in
                      </a>
                    </p>
                  </div>
                  <button
                    onClick={handleReset}
                    className="btn-secondary text-sm py-3 px-6"
                  >
                    Submit Another Enquiry
                  </button>
                </div>
              ) : (
                /* FORM */
                <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">

                  {/* Personal Details */}
                  <div>
                    <h4 className="font-heading font-extrabold text-midnight-700 text-sm mb-4 flex items-center gap-2">
                      <Users size={16} className="text-teal-500" />
                      Personal Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="wa-name" className={labelClass}>Full Name *</label>
                        <input
                          id="wa-name"
                          type="text"
                          required
                          value={formData.fullName}
                          onChange={e => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                          className={inputClass}
                          placeholder="Your full name"
                        />
                      </div>
                      <div>
                        <label htmlFor="wa-phone" className={labelClass}>Phone Number *</label>
                        <div className="relative">
                          <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-400" />
                          <input
                            id="wa-phone"
                            type="tel"
                            required
                            value={formData.phone}
                            onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                            className={`${inputClass} pl-10`}
                            placeholder="+91 98765 43210"
                          />
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <label htmlFor="wa-email" className={labelClass}>Email Address</label>
                        <div className="relative">
                          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-400" />
                          <input
                            id="wa-email"
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            className={`${inputClass} pl-10`}
                            placeholder="you@example.com"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Group Size */}
                  <div>
                    <h4 className="font-heading font-extrabold text-midnight-700 text-sm mb-4 flex items-center gap-2">
                      <Users size={16} className="text-teal-500" />
                      Group Size
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="wa-adults" className={labelClass}>Adults *</label>
                        <input
                          id="wa-adults"
                          type="number"
                          min={1}
                          max={50}
                          required
                          value={formData.adults}
                          onChange={e => setFormData(prev => ({ ...prev, adults: parseInt(e.target.value) || 1 }))}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label htmlFor="wa-children" className={labelClass}>Children (below 12)</label>
                        <input
                          id="wa-children"
                          type="number"
                          min={0}
                          max={20}
                          value={formData.children}
                          onChange={e => setFormData(prev => ({ ...prev, children: parseInt(e.target.value) || 0 }))}
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Date & Location */}
                  <div>
                    <h4 className="font-heading font-extrabold text-midnight-700 text-sm mb-4 flex items-center gap-2">
                      <Calendar size={16} className="text-teal-500" />
                      Preferred Date & Location
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="wa-date" className={labelClass}>Preferred Date</label>
                        <input
                          id="wa-date"
                          type="date"
                          value={formData.preferredDate}
                          onChange={e => setFormData(prev => ({ ...prev, preferredDate: e.target.value }))}
                          className={inputClass}
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <div className="relative">
                        <label htmlFor="wa-location" className={labelClass}>Preferred Location</label>
                        <select
                          id="wa-location"
                          value={formData.preferredLocation}
                          onChange={e => setFormData(prev => ({ ...prev, preferredLocation: e.target.value }))}
                          className={selectClass}
                        >
                          <option value="">Select a location</option>
                          {LOCATIONS.map(loc => (
                            <option key={loc} value={loc}>{loc}</option>
                          ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-4 bottom-4 text-warm-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Activities */}
                  <div>
                    <h4 className="font-heading font-extrabold text-midnight-700 text-sm mb-4 flex items-center gap-2">
                      <Waves size={16} className="text-teal-500" />
                      Select Activities
                      {formData.selectedActivities.length > 0 && (
                        <span className="ml-auto text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                          {formData.selectedActivities.length} selected
                        </span>
                      )}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {ACTIVITIES.map(activity => {
                        const isSelected = formData.selectedActivities.includes(activity.name);
                        return (
                          <button
                            type="button"
                            key={activity.id}
                            onClick={() => toggleActivity(activity.name)}
                            className={`flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all duration-200 ${
                              isSelected
                                ? 'border-teal-400 bg-teal-50 shadow-sm'
                                : 'border-warm-200/60 bg-white hover:border-warm-300'
                            }`}
                          >
                            <span className="text-xl flex-shrink-0">{activity.emoji}</span>
                            <span className={`text-sm font-bold flex-1 ${isSelected ? 'text-teal-700' : 'text-midnight-700'}`}>
                              {activity.name}
                            </span>
                            {isSelected && (
                              <CheckCircle2 size={18} className="text-teal-500 flex-shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Swimming Ability */}
                  <div>
                    <h4 className="font-heading font-extrabold text-midnight-700 text-sm mb-4 flex items-center gap-2">
                      <Waves size={16} className="text-teal-500" />
                      Swimming Ability
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {SWIMMING_LEVELS.map(level => {
                        const isSelected = formData.swimmingAbility === level;
                        return (
                          <button
                            type="button"
                            key={level}
                            onClick={() => setFormData(prev => ({ ...prev, swimmingAbility: level }))}
                            className={`p-3 rounded-2xl border-2 text-center transition-all duration-200 ${
                              isSelected
                                ? 'border-teal-400 bg-teal-50'
                                : 'border-warm-200/60 bg-white hover:border-warm-300'
                            }`}
                          >
                            <span className={`text-xs font-bold ${isSelected ? 'text-teal-700' : 'text-midnight-700'}`}>
                              {level}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Budget */}
                  <div>
                    <h4 className="font-heading font-extrabold text-midnight-700 text-sm mb-4 flex items-center gap-2">
                      <IndianRupee size={16} className="text-teal-500" />
                      Budget Range
                    </h4>
                    <div className="relative">
                      <select
                        id="wa-budget"
                        value={formData.budgetRange}
                        onChange={e => setFormData(prev => ({ ...prev, budgetRange: e.target.value }))}
                        className={selectClass}
                      >
                        <option value="">Select your budget range</option>
                        {BUDGET_RANGES.map(range => (
                          <option key={range} value={range}>{range}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-warm-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Referral Source */}
                  <div>
                    <h4 className="font-heading font-extrabold text-midnight-700 text-sm mb-4 flex items-center gap-2">
                      <Star size={16} className="text-teal-500" />
                      How did you find us?
                    </h4>
                    <div className="relative">
                      <select
                        id="wa-referral"
                        value={formData.referralSource}
                        onChange={e => setFormData(prev => ({ ...prev, referralSource: e.target.value }))}
                        className={selectClass}
                      >
                        <option value="">Select one</option>
                        {REFERRAL_SOURCES.map(src => (
                          <option key={src} value={src}>{src}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-warm-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Special Requests */}
                  <div>
                    <label htmlFor="wa-special" className={labelClass}>Special Requests / Notes</label>
                    <textarea
                      id="wa-special"
                      rows={3}
                      value={formData.specialRequests}
                      onChange={e => setFormData(prev => ({ ...prev, specialRequests: e.target.value }))}
                      className={`${inputClass} resize-none`}
                      placeholder="Accessibility needs, group discounts, medical notes, specific time preferences..."
                    />
                  </div>

                  {/* Submit */}
                  <div className="pt-2 space-y-3">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-primary w-full text-base py-4 disabled:opacity-60"
                    >
                      {submitting ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white" />
                          Submitting...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Send size={18} />
                          Submit Enquiry
                        </span>
                      )}
                    </button>
                    <p className="text-center text-[11px] text-warm-400">
                      By submitting, you agree to our{' '}
                      <Link to="/privacy" className="underline text-teal-600">Privacy Policy</Link>.
                      We'll never share your information.
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* CTA BANNER */}
      <section className="px-4 mb-12">
        <div className="app-container">
          <div className="relative rounded-[32px] overflow-hidden reveal">
            <div className="absolute inset-0 bg-gradient-ocean-deep" />
            <div className="absolute inset-0 opacity-30 bg-seasonal-highlight" />
            <div className="relative z-10 p-8 md:p-12 text-center">
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] font-bold text-sandy-400 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10 mb-4">
                AndamanBazaar.in
              </span>
              <h3 className="text-white font-display text-3xl md:text-4xl mt-3 mb-3 leading-tight">
                Ready for Your Island Adventure?
              </h3>
              <p className="text-white/50 text-sm md:text-base mb-6 max-w-md mx-auto leading-relaxed">
                Fill out the enquiry form and our team will craft a personalised water adventure package just for you.
              </p>
              <button
                onClick={scrollToForm}
                className="inline-flex items-center gap-2 bg-white text-midnight-700 font-heading font-bold text-sm py-3 px-6 rounded-full hover:bg-teal-50 transition-colors active:scale-95"
              >
                Book Your Adventure <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
