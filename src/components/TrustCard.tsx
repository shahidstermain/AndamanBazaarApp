import React, { useState } from 'react';
import { Shield, Award, Star, Clock, MapPin, Phone, MessageCircle, Eye, EyeOff } from 'lucide-react';
import { Profile } from '../types';
import { TrustBadge } from './TrustBadge';

interface TrustCardProps {
  seller: Profile;
  className?: string;
}

export const TrustCard: React.FC<TrustCardProps> = ({ seller, className = '' }) => {
  const [showPhone, setShowPhone] = useState(false);
  const joinDate = new Date(seller.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  const responseRate = seller.response_rate || 0;
  const avgResponse = seller.avg_response_hours || 0;

  const getResponseText = (hours: number) => {
    if (hours < 1) return 'Replies instantly';
    if (hours < 4) return 'Replies in a few hours';
    if (hours < 24) return 'Replies within a day';
    return 'Replies in a few days';
  };

  return (
    <div className={`bg-white rounded-2xl border border-warm-200 p-4 space-y-4 shadow-sm ${className}`}>
      <div className="flex items-center gap-3">
        <div className="relative">
          <img 
            src={seller.profile_photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(seller.name || 'User')}&background=0D9488&color=fff`} 
            alt={seller.name} 
            className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
          />
          {seller.is_location_verified && (
            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
              <div className="bg-emerald-500 text-white rounded-full p-0.5" title="Verified Local">
                <MapPin size={10} fill="currentColor" />
              </div>
            </div>
          )}
        </div>
        <div>
          <h3 className="font-bold text-midnight-700 text-sm">{seller.name || 'Anonymous User'}</h3>
          <p className="text-xs text-warm-400">Joined {joinDate}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <TrustBadge level={seller.trust_level} size="sm" />
        {seller.is_location_verified && (
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
            <MapPin size={10} /> Verified Local
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-warm-100">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-warm-400">
            <MessageCircle size={12} />
            <span className="text-[10px] font-bold uppercase tracking-wide">Response Rate</span>
          </div>
          <p className={`text-sm font-bold ${responseRate >= 80 ? 'text-emerald-600' : responseRate >= 50 ? 'text-amber-600' : 'text-warm-500'}`}>
            {responseRate > 0 ? `${responseRate}%` : 'New'}
          </p>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-warm-400">
            <Clock size={12} />
            <span className="text-[10px] font-bold uppercase tracking-wide">Reply Time</span>
          </div>
          <p className="text-sm font-bold text-midnight-700">
            {avgResponse > 0 ? getResponseText(avgResponse) : 'N/A'}
          </p>
        </div>
      </div>

      <div className="flex gap-2 pt-1 flex-col">
        {seller.phone_number && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg w-full justify-center">
              <Phone size={12} /> Phone Verified
            </div>
            <button
              onClick={() => setShowPhone(!showPhone)}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-warm-400 hover:text-midnight-700 transition-colors mx-auto"
            >
              {showPhone ? <EyeOff size={12} /> : <Eye size={12} />}
              {showPhone ? seller.phone_number : 'Tap to show phone'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
