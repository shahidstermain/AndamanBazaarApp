import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Check, Clock, Users, Star,
  CreditCard, Smartphone, Building2, Loader2, MapPin,
  ChevronDown, X, Shield, Calendar, Phone, Mail, User,
  Waves, Camera, Ship, Fish, Anchor,
} from 'lucide-react';
import { Seo } from '../components/Seo';

// ============================================================
//  DATA — Seasonal service packages
// ============================================================

interface ServicePackage {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  price: number;
  duration: string;
  maxPeople: number;
  rating: number;
  reviewCount: number;
  highlights: string[];
  image: string;
  icon: React.ElementType;
  gradient: string;
  iconBg: string;
  badge?: string;
}

const PACKAGES: ServicePackage[] = [
  {
    id: 'scuba',
    name: 'Scuba Diving Experience',
    description: 'Explore vibrant coral reefs and marine life in crystal-clear Andaman waters.',
    longDescription: 'A certified PADI instructor guides you through the mesmerising underwater world of Havelock Island. No prior experience needed — includes full training and equipment.',
    price: 4500,
    duration: '3 hours',
    maxPeople: 6,
    rating: 4.9,
    reviewCount: 342,
    highlights: ['PADI Certified Instructor', 'Equipment Included', 'Underwater Photos', 'Beginner Friendly'],
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&h=400&fit=crop',
    icon: Fish,
    gradient: 'from-blue-500 to-teal-500',
    iconBg: 'bg-blue-50',
    badge: 'Most Popular',
  },
  {
    id: 'snorkel',
    name: 'Snorkeling Tour',
    description: 'Glide over pristine reefs at Elephant Beach with mask and fins provided.',
    longDescription: 'Perfect for all ages. Swim alongside tropical fish and sea turtles in shallow, warm waters. Round-trip transport from your hotel included.',
    price: 1800,
    duration: '2 hours',
    maxPeople: 10,
    rating: 4.7,
    reviewCount: 518,
    highlights: ['All Equipment Provided', 'Hotel Pickup & Drop', 'Life Jacket Included', 'Great for Kids'],
    image: 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=600&h=400&fit=crop',
    icon: Waves,
    gradient: 'from-teal-400 to-cyan-500',
    iconBg: 'bg-teal-50',
  },
  {
    id: 'island-hop',
    name: 'Island Hopping Package',
    description: 'Visit Neil, Ross, and North Bay islands in one unforgettable day trip.',
    longDescription: 'A full-day adventure across three iconic islands. Enjoy pristine beaches, historical ruins, and coral gardens. Lunch, ferry tickets and guide included.',
    price: 6500,
    duration: 'Full day',
    maxPeople: 15,
    rating: 4.8,
    reviewCount: 267,
    highlights: ['3 Islands in 1 Day', 'Lunch Included', 'Ferry Tickets', 'English-Speaking Guide'],
    image: 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=600&h=400&fit=crop',
    icon: Ship,
    gradient: 'from-emerald-500 to-teal-600',
    iconBg: 'bg-emerald-50',
    badge: 'Best Value',
  },
  {
    id: 'boat-charter',
    name: 'Private Boat Charter',
    description: 'Your own boat, your own schedule. Sail to hidden lagoons and secret beaches.',
    longDescription: 'Charter a private speedboat with an experienced captain. Choose your own itinerary — sunset cruises, fishing spots, or private beach picnics. Snacks and beverages on board.',
    price: 12000,
    duration: '6 hours',
    maxPeople: 8,
    rating: 5.0,
    reviewCount: 89,
    highlights: ['Private Speedboat', 'Custom Itinerary', 'Snacks & Drinks', 'Experienced Captain'],
    image: 'https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?w=600&h=400&fit=crop',
    icon: Anchor,
    gradient: 'from-amber-400 to-orange-500',
    iconBg: 'bg-amber-50',
    badge: 'Premium',
  },
  {
    id: 'photo',
    name: 'Underwater Photography',
    description: 'Professional underwater photoshoot with edited digital album delivery.',
    longDescription: 'A professional underwater photographer captures your dive or snorkel session. Receive 50+ edited high-resolution images delivered digitally within 24 hours.',
    price: 3500,
    duration: '2 hours',
    maxPeople: 4,
    rating: 4.8,
    reviewCount: 156,
    highlights: ['50+ Edited Photos', '24hr Digital Delivery', 'Professional Photographer', 'GoPro + DSLR'],
    image: 'https://images.unsplash.com/photo-1682687982501-1e58ab814714?w=600&h=400&fit=crop',
    icon: Camera,
    gradient: 'from-purple-500 to-indigo-500',
    iconBg: 'bg-purple-50',
  },
];

// ============================================================
//  PAYMENT METHODS
// ============================================================
type PaymentMethod = 'upi' | 'card' | 'netbanking';

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'upi', label: 'UPI', icon: Smartphone, desc: 'GPay, PhonePe, Paytm' },
  { id: 'card', label: 'Card', icon: CreditCard, desc: 'Credit / Debit Card' },
  { id: 'netbanking', label: 'Net Banking', icon: Building2, desc: 'All major banks' },
];

// ============================================================
//  TYPES
// ============================================================
interface BookingDetails {
  fullName: string;
  email: string;
  phone: string;
  date: string;
  people: number;
  specialRequests: string;
}

type Stage = 'browse' | 'booking' | 'payment' | 'confirmed';

// ============================================================
//  HELPER
// ============================================================
const formatInr = (n: number) =>
  '₹' + n.toLocaleString('en-IN');

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

// ============================================================
//  ServiceCard
// ============================================================
const ServiceCard: React.FC<{
  pkg: ServicePackage;
  selected: boolean;
  onSelect: () => void;
  index: number;
}> = ({ pkg, selected, onSelect, index }) => {
  const Icon = pkg.icon;

  return (
    <div
      className={`group relative bg-white rounded-3xl border-2 overflow-hidden transition-all duration-500 ease-out
        ${selected
          ? 'border-teal-500 shadow-lg ring-2 ring-teal-500/20 scale-[1.01]'
          : 'border-warm-200/60 hover:border-teal-200 hover:shadow-card-hover'
        }`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Badge */}
      {pkg.badge && (
        <div className={`absolute top-4 right-4 z-10 bg-gradient-to-r ${pkg.gradient} text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md`}>
          {pkg.badge}
        </div>
      )}

      {/* Image */}
      <div className="relative h-48 md:h-56 overflow-hidden">
        <img
          src={pkg.image}
          alt={pkg.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* Price overlay */}
        <div className="absolute bottom-4 left-4">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-lg">
            <span className="text-xl font-black text-midnight-800">{formatInr(pkg.price)}</span>
            <span className="text-warm-400 text-xs font-medium ml-1">/person</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${pkg.iconBg}`}>
            <Icon size={20} className={`bg-gradient-to-r ${pkg.gradient} bg-clip-text`} style={{ color: 'inherit' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-heading font-extrabold text-base text-midnight-700 leading-tight">{pkg.name}</h3>
            <div className="flex items-center gap-3 mt-1 text-xs text-warm-400 font-medium">
              <span className="flex items-center gap-1"><Clock size={12} /> {pkg.duration}</span>
              <span className="flex items-center gap-1"><Users size={12} /> Up to {pkg.maxPeople}</span>
            </div>
          </div>
        </div>

        <p className="text-sm text-warm-500 leading-relaxed">{pkg.description}</p>

        {/* Rating */}
        <div className="flex items-center gap-1.5">
          <Star size={14} className="text-amber-400 fill-amber-400" />
          <span className="text-sm font-bold text-midnight-700">{pkg.rating}</span>
          <span className="text-xs text-warm-400">({pkg.reviewCount} reviews)</span>
        </div>

        {/* Highlights */}
        <div className="flex flex-wrap gap-1.5">
          {pkg.highlights.slice(0, 3).map(h => (
            <span key={h} className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full">
              {h}
            </span>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={onSelect}
          className={`w-full mt-2 py-3 rounded-2xl font-heading font-bold text-sm transition-all duration-300 active:scale-[0.97]
            ${selected
              ? 'bg-teal-600 text-white shadow-md'
              : 'bg-warm-50 text-midnight-700 border border-warm-200 hover:bg-teal-50 hover:border-teal-200'
            }`}
        >
          {selected ? (
            <span className="flex items-center justify-center gap-2"><Check size={16} /> Selected</span>
          ) : (
            <span className="flex items-center justify-center gap-2">Select Package <ArrowRight size={14} /></span>
          )}
        </button>
      </div>
    </div>
  );
};

// ============================================================
//  BookingForm
// ============================================================
const BookingForm: React.FC<{
  pkg: ServicePackage;
  details: BookingDetails;
  onChange: (d: BookingDetails) => void;
  onProceed: () => void;
  onBack: () => void;
}> = ({ pkg, details, onChange, onProceed, onBack }) => {
  const total = useMemo(() => pkg.price * details.people, [pkg.price, details.people]);
  const isValid = details.fullName.trim().length > 1 &&
    /\S+@\S+\.\S+/.test(details.email) &&
    details.phone.replace(/\D/g, '').length >= 10 &&
    details.date &&
    details.people >= 1;

  const upd = (key: keyof BookingDetails, val: string | number) =>
    onChange({ ...details, [key]: val });

  return (
    <div className="animate-fade-in-up">
      {/* Selected package summary */}
      <div className="bg-white rounded-3xl border border-warm-200/60 p-5 mb-6 flex items-center gap-4">
        <img src={pkg.image} alt={pkg.name} className="w-16 h-16 rounded-2xl object-cover flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-extrabold text-midnight-700 text-sm">{pkg.name}</h3>
          <p className="text-xs text-warm-400 mt-0.5">{pkg.duration} · Up to {pkg.maxPeople} people</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-black text-midnight-800 text-lg">{formatInr(pkg.price)}</p>
          <p className="text-[10px] text-warm-400">per person</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-3xl border border-warm-200/60 p-6 space-y-5">
        <h3 className="font-heading font-extrabold text-lg text-midnight-700">Booking Details</h3>

        <div className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="text-xs font-bold text-warm-500 uppercase tracking-wider mb-1.5 block">Full Name</label>
            <div className="relative">
              <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-300" />
              <input
                type="text"
                value={details.fullName}
                onChange={e => upd('fullName', e.target.value)}
                placeholder="Your full name"
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-warm-200 bg-warm-50 text-sm text-midnight-700 placeholder-warm-300 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all"
              />
            </div>
          </div>

          {/* Email + Phone row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-warm-500 uppercase tracking-wider mb-1.5 block">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-300" />
                <input
                  type="email"
                  value={details.email}
                  onChange={e => upd('email', e.target.value)}
                  placeholder="you@email.com"
                  className="w-full pl-11 pr-4 py-3 rounded-2xl border border-warm-200 bg-warm-50 text-sm text-midnight-700 placeholder-warm-300 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-warm-500 uppercase tracking-wider mb-1.5 block">Phone</label>
              <div className="relative">
                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-300" />
                <input
                  type="tel"
                  value={details.phone}
                  onChange={e => upd('phone', e.target.value)}
                  placeholder="+91 XXXXX XXXXX"
                  className="w-full pl-11 pr-4 py-3 rounded-2xl border border-warm-200 bg-warm-50 text-sm text-midnight-700 placeholder-warm-300 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Date + People row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-warm-500 uppercase tracking-wider mb-1.5 block">Preferred Date</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-300" />
                <input
                  type="date"
                  value={details.date}
                  min={tomorrow()}
                  onChange={e => upd('date', e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-2xl border border-warm-200 bg-warm-50 text-sm text-midnight-700 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-warm-500 uppercase tracking-wider mb-1.5 block">Number of People</label>
              <div className="relative">
                <Users size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-300" />
                <select
                  value={details.people}
                  onChange={e => upd('people', parseInt(e.target.value))}
                  className="w-full pl-11 pr-10 py-3 rounded-2xl border border-warm-200 bg-warm-50 text-sm text-midnight-700 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all appearance-none"
                >
                  {Array.from({ length: pkg.maxPeople }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>{n} {n === 1 ? 'person' : 'people'}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-warm-300 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Special Requests */}
          <div>
            <label className="text-xs font-bold text-warm-500 uppercase tracking-wider mb-1.5 block">Special Requests <span className="text-warm-300">(optional)</span></label>
            <textarea
              value={details.specialRequests}
              onChange={e => upd('specialRequests', e.target.value)}
              rows={3}
              placeholder="Dietary needs, accessibility, celebrations…"
              className="w-full px-4 py-3 rounded-2xl border border-warm-200 bg-warm-50 text-sm text-midnight-700 placeholder-warm-300 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all resize-none"
            />
          </div>
        </div>
      </div>

      {/* Price breakdown */}
      <div className="bg-white rounded-3xl border border-warm-200/60 p-5 mt-4 space-y-3">
        <h4 className="font-heading font-bold text-midnight-700 text-sm">Price Breakdown</h4>
        <div className="flex justify-between text-sm">
          <span className="text-warm-500">{formatInr(pkg.price)} × {details.people} {details.people === 1 ? 'person' : 'people'}</span>
          <span className="font-bold text-midnight-700">{formatInr(total)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-warm-500">Platform fee</span>
          <span className="font-bold text-green-600">Free</span>
        </div>
        <div className="border-t border-warm-100 pt-3 flex justify-between">
          <span className="font-heading font-extrabold text-midnight-700">Total</span>
          <span className="font-heading font-black text-xl text-midnight-800">{formatInr(total)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={onBack}
          className="px-5 py-3 rounded-2xl border border-warm-200 text-warm-500 font-heading font-bold text-sm hover:bg-warm-50 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <button
          onClick={onProceed}
          disabled={!isValid}
          className="flex-1 py-3.5 rounded-2xl bg-teal-600 text-white font-heading font-bold text-sm shadow-md hover:bg-teal-700 transition-all active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
        >
          Proceed to Payment <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};

// ============================================================
//  PaymentModal
// ============================================================
const PaymentModal: React.FC<{
  pkg: ServicePackage;
  details: BookingDetails;
  total: number;
  onConfirm: () => void;
  onClose: () => void;
}> = ({ pkg, details, total, onConfirm, onClose }) => {
  const [method, setMethod] = useState<PaymentMethod>('upi');
  const [processing, setProcessing] = useState(false);

  const handlePay = async () => {
    setProcessing(true);
    // Simulate payment processing
    await new Promise(r => setTimeout(r, 2500));
    setProcessing(false);
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-midnight-900/60 backdrop-blur-sm" onClick={!processing ? onClose : undefined} />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-auto bg-white rounded-t-[32px] md:rounded-3xl max-h-[90vh] overflow-y-auto animate-fade-in-up">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 px-6 pt-6 pb-4 border-b border-warm-100 flex items-center justify-between">
          <h3 className="font-heading font-extrabold text-lg text-midnight-700">Payment</h3>
          {!processing && (
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-warm-100 flex items-center justify-center hover:bg-warm-200 transition-colors">
              <X size={16} className="text-warm-500" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-5">
          {/* Order Summary */}
          <div className="bg-warm-50 rounded-2xl p-4 flex items-center gap-3">
            <img src={pkg.image} alt={pkg.name} className="w-12 h-12 rounded-xl object-cover" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-midnight-700 truncate">{pkg.name}</p>
              <p className="text-xs text-warm-400">{details.date} · {details.people} {details.people === 1 ? 'person' : 'people'}</p>
            </div>
            <p className="font-black text-midnight-800">{formatInr(total)}</p>
          </div>

          {/* Payment method selector */}
          <div>
            <label className="text-xs font-bold text-warm-500 uppercase tracking-wider mb-3 block">Select Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map(pm => {
                const PMIcon = pm.icon;
                const active = method === pm.id;
                return (
                  <button
                    key={pm.id}
                    onClick={() => setMethod(pm.id)}
                    disabled={processing}
                    className={`relative p-4 rounded-2xl border-2 transition-all duration-300 text-center
                      ${active
                        ? 'border-teal-500 bg-teal-50 shadow-sm'
                        : 'border-warm-200 bg-white hover:border-warm-300'
                      } disabled:opacity-50`}
                  >
                    {active && (
                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center shadow">
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                    <PMIcon size={22} className={`mx-auto mb-1.5 ${active ? 'text-teal-600' : 'text-warm-400'}`} />
                    <p className={`text-xs font-bold ${active ? 'text-teal-700' : 'text-midnight-700'}`}>{pm.label}</p>
                    <p className="text-[9px] text-warm-400 mt-0.5">{pm.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment form fields (simplified mock) */}
          {method === 'upi' && (
            <div className="animate-fade-in-up">
              <label className="text-xs font-bold text-warm-500 uppercase tracking-wider mb-1.5 block">UPI ID</label>
              <input
                type="text"
                placeholder="name@upi"
                className="w-full px-4 py-3 rounded-2xl border border-warm-200 bg-warm-50 text-sm text-midnight-700 placeholder-warm-300 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all"
              />
            </div>
          )}
          {method === 'card' && (
            <div className="animate-fade-in-up space-y-3">
              <div>
                <label className="text-xs font-bold text-warm-500 uppercase tracking-wider mb-1.5 block">Card Number</label>
                <input type="text" placeholder="1234 5678 9012 3456" maxLength={19}
                  className="w-full px-4 py-3 rounded-2xl border border-warm-200 bg-warm-50 text-sm text-midnight-700 placeholder-warm-300 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-warm-500 uppercase tracking-wider mb-1.5 block">Expiry</label>
                  <input type="text" placeholder="MM/YY" maxLength={5}
                    className="w-full px-4 py-3 rounded-2xl border border-warm-200 bg-warm-50 text-sm text-midnight-700 placeholder-warm-300 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all" />
                </div>
                <div>
                  <label className="text-xs font-bold text-warm-500 uppercase tracking-wider mb-1.5 block">CVV</label>
                  <input type="password" placeholder="•••" maxLength={4}
                    className="w-full px-4 py-3 rounded-2xl border border-warm-200 bg-warm-50 text-sm text-midnight-700 placeholder-warm-300 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all" />
                </div>
              </div>
            </div>
          )}
          {method === 'netbanking' && (
            <div className="animate-fade-in-up">
              <label className="text-xs font-bold text-warm-500 uppercase tracking-wider mb-1.5 block">Select Bank</label>
              <div className="relative">
                <select className="w-full px-4 py-3 rounded-2xl border border-warm-200 bg-warm-50 text-sm text-midnight-700 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all appearance-none">
                  <option>State Bank of India</option>
                  <option>HDFC Bank</option>
                  <option>ICICI Bank</option>
                  <option>Axis Bank</option>
                  <option>Punjab National Bank</option>
                  <option>Bank of Baroda</option>
                </select>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-warm-300 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Security badge */}
          <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-2xl px-4 py-3">
            <Shield size={16} className="text-green-600 flex-shrink-0" />
            <p className="text-xs text-green-700 font-medium">256-bit SSL encrypted. Your payment details are secure.</p>
          </div>

          {/* Pay Button */}
          <button
            onClick={handlePay}
            disabled={processing}
            className="w-full py-4 rounded-2xl bg-teal-600 text-white font-heading font-bold text-base shadow-lg hover:bg-teal-700 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Processing Payment…
              </>
            ) : (
              <>Pay {formatInr(total)}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
//  Confirmation Screen
// ============================================================
const ConfirmationScreen: React.FC<{
  pkg: ServicePackage;
  details: BookingDetails;
  total: number;
  onNewBooking: () => void;
}> = ({ pkg, details, total, onNewBooking }) => {
  const bookingRef = useMemo(
    () => `AB-${Date.now().toString(36).toUpperCase().slice(-6)}`,
    [],
  );

  return (
    <div className="animate-fade-in-up text-center max-w-md mx-auto">
      {/* Success animation */}
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
        <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
          <Check size={28} className="text-white" strokeWidth={3} />
        </div>
      </div>

      <h2 className="font-display text-3xl text-midnight-700 mb-2">Booking Confirmed!</h2>
      <p className="text-warm-400 text-sm mb-8">
        Thank you for booking your Andaman seasonal experience.<br />
        A confirmation has been sent to your email and phone.
      </p>

      {/* Booking card */}
      <div className="bg-white rounded-3xl border border-warm-200/60 p-6 text-left space-y-4 mb-6">
        <div className="flex items-center gap-3">
          <img src={pkg.image} alt={pkg.name} className="w-14 h-14 rounded-2xl object-cover" />
          <div>
            <h3 className="font-heading font-extrabold text-midnight-700 text-sm">{pkg.name}</h3>
            <p className="text-xs text-warm-400">{pkg.duration}</p>
          </div>
        </div>

        <div className="border-t border-warm-100 pt-4 grid grid-cols-2 gap-y-3 text-sm">
          <div>
            <p className="text-[10px] text-warm-400 uppercase font-bold tracking-wider">Booking Ref</p>
            <p className="font-bold text-midnight-700 font-mono">{bookingRef}</p>
          </div>
          <div>
            <p className="text-[10px] text-warm-400 uppercase font-bold tracking-wider">Date</p>
            <p className="font-bold text-midnight-700">{details.date}</p>
          </div>
          <div>
            <p className="text-[10px] text-warm-400 uppercase font-bold tracking-wider">Guests</p>
            <p className="font-bold text-midnight-700">{details.people} {details.people === 1 ? 'person' : 'people'}</p>
          </div>
          <div>
            <p className="text-[10px] text-warm-400 uppercase font-bold tracking-wider">Amount Paid</p>
            <p className="font-black text-green-600">{formatInr(total)}</p>
          </div>
        </div>

        <div className="border-t border-warm-100 pt-4 text-xs text-warm-400 space-y-1">
          <p><span className="font-bold text-warm-500">Name:</span> {details.fullName}</p>
          <p><span className="font-bold text-warm-500">Email:</span> {details.email}</p>
          <p><span className="font-bold text-warm-500">Phone:</span> {details.phone}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <button
          onClick={onNewBooking}
          className="w-full py-3.5 rounded-2xl bg-teal-600 text-white font-heading font-bold text-sm shadow-md hover:bg-teal-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          Book Another Experience <ArrowRight size={14} />
        </button>
        <Link
          to="/"
          className="w-full py-3 rounded-2xl border border-warm-200 text-warm-500 font-heading font-bold text-sm hover:bg-warm-50 transition-colors text-center"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
};

// ============================================================
//  PROGRESS STEPS
// ============================================================
const ProgressSteps: React.FC<{ stage: Stage }> = ({ stage }) => {
  const steps = [
    { id: 'browse' as const, label: 'Select' },
    { id: 'booking' as const, label: 'Details' },
    { id: 'payment' as const, label: 'Pay' },
    { id: 'confirmed' as const, label: 'Done' },
  ];
  const stageOrder: Stage[] = ['browse', 'booking', 'payment', 'confirmed'];
  const currentIdx = stageOrder.indexOf(stage);

  return (
    <div className="flex items-center justify-center gap-1 md:gap-2 mb-8">
      {steps.map((step, i) => {
        const completed = i < currentIdx;
        const active = i === currentIdx;
        return (
          <React.Fragment key={step.id}>
            <div className="flex items-center gap-1.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500
                ${completed ? 'bg-teal-500 text-white' : active ? 'bg-teal-600 text-white ring-4 ring-teal-600/20' : 'bg-warm-100 text-warm-400'}`}>
                {completed ? <Check size={14} /> : i + 1}
              </div>
              <span className={`text-xs font-bold hidden md:inline ${active ? 'text-teal-700' : completed ? 'text-teal-500' : 'text-warm-300'}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 md:w-12 h-0.5 rounded-full transition-all duration-500 ${i < currentIdx ? 'bg-teal-500' : 'bg-warm-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ============================================================
//  MAIN PAGE COMPONENT
// ============================================================
export const SeasonalBooking: React.FC = () => {
  const [stage, setStage] = useState<Stage>('browse');
  const [selectedPkg, setSelectedPkg] = useState<ServicePackage | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<BookingDetails>({
    fullName: '',
    email: '',
    phone: '',
    date: '',
    people: 2,
    specialRequests: '',
  });

  const contentRef = useRef<HTMLDivElement>(null);

  const scrollToContent = () => {
    setTimeout(() => {
      contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleSelect = (pkg: ServicePackage) => {
    setSelectedPkg(pkg);
    setStage('booking');
    scrollToContent();
  };

  const handleProceedToPayment = () => {
    setStage('payment');
    setShowPayment(true);
  };

  const handlePaymentConfirm = () => {
    setShowPayment(false);
    setStage('confirmed');
    scrollToContent();
  };

  const handleNewBooking = () => {
    setStage('browse');
    setSelectedPkg(null);
    setBookingDetails({ fullName: '', email: '', phone: '', date: '', people: 2, specialRequests: '' });
    scrollToContent();
  };

  const total = selectedPkg ? selectedPkg.price * bookingDetails.people : 0;

  // Count of available slots (cosmetic urgency)
  const slotsLeft = useMemo(() => Math.floor(Math.random() * 5) + 3, []);

  return (
    <>
      <Seo
        title="Season Time in Andaman — Book Experiences"
        description="Book scuba diving, snorkeling, island hopping and more seasonal Andaman experiences. Limited slots available for the tourist season."
      />

      <div className="min-h-screen bg-warm-50 pb-28 md:pb-12">

        {/* ── HERO ── */}
        <section className="relative overflow-hidden bg-gradient-ocean-deep">
          <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-20 blur-3xl pointer-events-none bg-radial-teal-glow" />
          <div className="absolute bottom-[-10%] left-[-5%] w-[300px] h-[300px] rounded-full opacity-15 blur-3xl pointer-events-none bg-radial-sandy-glow" />

          <div className="relative z-10 px-4 pt-16 pb-20 md:pt-24 md:pb-28 text-center">
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Back nav */}
              <Link to="/" className="inline-flex items-center gap-2 text-white/50 text-xs font-bold uppercase tracking-wider hover:text-white/80 transition-colors mb-4">
                <ArrowLeft size={14} /> Home
              </Link>

              {/* Badge */}
              <div>
                <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full text-white/90 text-[11px] md:text-xs font-bold uppercase tracking-[0.15em]">
                  <span className="w-2 h-2 rounded-full bg-sandy-400 animate-pulse" />
                  Nov – May · Peak Season
                </span>
              </div>

              <h1 className="font-display text-4xl md:text-5xl xl:text-6xl text-white leading-[1.1] tracking-tight">
                It's Season Time
                <br />
                <span className="bg-gradient-to-r from-teal-200 via-teal-300 to-sandy-300 bg-clip-text text-transparent">
                  Again in Andaman
                </span>{' '}
                <span className="inline-block animate-bounce">🌴</span>
              </h1>

              <p className="text-teal-100/60 text-base md:text-lg max-w-lg mx-auto leading-relaxed">
                Book our seasonal services before slots fill up. Hand-picked
                experiences from verified island operators.
              </p>

              {/* Urgency + trust */}
              <div className="flex flex-wrap items-center justify-center gap-5 text-white/40 text-xs font-medium pt-2">
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-coral-300/70" />
                  Havelock · Neil · Port Blair
                </span>
                <span className="flex items-center gap-1.5">
                  <Shield size={14} className="text-teal-300/70" />
                  Verified Operators Only
                </span>
                <span className="flex items-center gap-1.5 text-sandy-300/80">
                  <Users size={14} />
                  Only {slotsLeft} slots left today
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── CONTENT ── */}
        <div ref={contentRef} className="px-4 -mt-8 relative z-20">
          <div className="max-w-5xl mx-auto">

            {/* Progress steps */}
            {stage !== 'browse' && <ProgressSteps stage={stage} />}

            {/* ── STAGE: Browse packages ── */}
            {stage === 'browse' && (
              <div className="space-y-6">
                {/* Section header */}
                <div className="text-center mb-2">
                  <h2 className="font-heading font-extrabold text-xl text-midnight-700">Choose Your Experience</h2>
                  <p className="text-sm text-warm-400 mt-1">Select a package to begin booking</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {PACKAGES.map((pkg, i) => (
                    <ServiceCard
                      key={pkg.id}
                      pkg={pkg}
                      selected={selectedPkg?.id === pkg.id}
                      onSelect={() => handleSelect(pkg)}
                      index={i}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── STAGE: Booking form ── */}
            {stage === 'booking' && selectedPkg && (
              <div className="max-w-xl mx-auto">
                <BookingForm
                  pkg={selectedPkg}
                  details={bookingDetails}
                  onChange={setBookingDetails}
                  onProceed={handleProceedToPayment}
                  onBack={() => { setStage('browse'); setSelectedPkg(null); }}
                />
              </div>
            )}

            {/* ── STAGE: Confirmed ── */}
            {stage === 'confirmed' && selectedPkg && (
              <ConfirmationScreen
                pkg={selectedPkg}
                details={bookingDetails}
                total={total}
                onNewBooking={handleNewBooking}
              />
            )}
          </div>
        </div>

        {/* Payment modal overlay */}
        {showPayment && selectedPkg && (
          <PaymentModal
            pkg={selectedPkg}
            details={bookingDetails}
            total={total}
            onConfirm={handlePaymentConfirm}
            onClose={() => { setShowPayment(false); setStage('booking'); }}
          />
        )}

      </div>
    </>
  );
};

export default SeasonalBooking;
