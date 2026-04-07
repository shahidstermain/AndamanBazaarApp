import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { isDemoListing } from '../lib/demoListings';
import { useToast } from '../components/Toast';
import { COPY } from '../lib/localCopy';
import { Seo } from '../components/Seo';
import { TrustBadge } from '../components/TrustBadge';
import { FreshnessBadge } from '../components/FreshnessBadge';
import { BoostBadge } from '../components/BoostBadge';
import { UrgentBadge } from '../components/UrgentBadge';
import { FeaturedSection } from '../components/FeaturedSection';
import {
  Search,
  Sparkles,
  Compass,
  ArrowRight,
  Flame,
  LayoutGrid,
  MapPin,
  Heart,
  Loader2,
  Fish,
  Leaf,
  Shell,
  BadgeCheck
} from 'lucide-react';

// ============================================================
//  CONSTANTS
// ============================================================

const ISLAND_CATEGORIES = [
  { name: 'Fresh Catch', slug: 'fresh-catch', icon: Fish, bgClass: 'bg-blue-50', textClass: 'text-blue-600' },
  { name: 'Produce', slug: 'produce', icon: Leaf, bgClass: 'bg-teal-50', textClass: 'text-teal-600' },
  { name: 'Handicrafts', slug: 'handicrafts', icon: Shell, bgClass: 'bg-purple-50', textClass: 'text-purple-600' },
  { name: 'Experiences', slug: 'experiences', icon: Compass, bgClass: 'bg-red-50', textClass: 'text-red-600' },
];


const SEARCH_PLACEHOLDERS = [
  'Search fish, coconuts, tours…',
  'Find island handicrafts…',
  'Book a local guide…',
  'Discover diving packages…',
  'Browse fresh produce…',
];

const RECENT_PAGE_SIZE = 8;
const FLASH_DEALS_ENABLED = false;

// ============================================================
//  TYPES
// ============================================================
interface Listing {
  id: string;
  title: string;
  price: number;
  city: string;
  is_featured?: boolean;
  created_at?: string;
  views_count?: number;
  images?: { image_url: string }[];
  is_demo?: boolean;
  seller?: {
    user_id: string;
    trust_level: 'newbie' | 'verified' | 'legend';
    full_name: string;
    avatar_url: string;
  }[] | null;
  last_active_at?: string;
  availability_status?: 'available' | 'sold_recently' | 'inactive';
  response_rate?: number;
  avg_response_hours?: number;
  // Optional fields present in some listings / demo data
  area?: string;
  is_official?: boolean;
  // Boost fields
  isBoosted?: boolean;
  boostTier?: 'spark' | 'boost' | 'power';
  boostExpiresAt?: any; // Firestore Timestamp
  is_urgent?: boolean;
}

// ============================================================
//  SUB-COMPONENTS
// ============================================================

interface ListingCardProps {
  listing: Listing;
  saved: boolean;
  onSave: (id: string, e: React.MouseEvent) => void;
  timeAgo?: string;
  style?: React.CSSProperties;
}

const ListingCard: React.FC<ListingCardProps> = ({ listing, saved, onSave, timeAgo, style }) => {
  const imageUrl = listing.images?.length
    ? listing.images[0].image_url
    : `https://picsum.photos/seed/${listing.id}/400/400`;
  const isDemo = listing.is_demo || isDemoListing(listing.id);

  const handleClick = (e: React.MouseEvent) => {
    if (isDemo) {
      e.preventDefault();
    }
  };

  return (
    <Link
      to={isDemo ? '#' : `/listings/${listing.id}`}
      className="listing-card animate-fade-in-up"
      style={style}
      onClick={handleClick}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-warm-100 m-2 rounded-2xl">
        <img
          src={imageUrl}
          alt={listing.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />
        {/* Save/Heart Button */}
        <button
          onClick={e => onSave(listing.id, e)}
          className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-glass transition-all duration-200 active:scale-90 ${saved ? 'bg-coral-500' : 'bg-white/90 backdrop-blur-sm'}`}
          aria-label={saved ? 'Unsave listing' : 'Save listing'}
        >
          <Heart
            size={14}
            className={saved ? 'text-white fill-white' : 'text-warm-400'}
          />
        </button>
        {listing.city && (
          <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
            <div className="bg-white/95 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1 text-[9px] font-black text-midnight-700 uppercase tracking-widest shadow-sm border border-warm-100/50">
              <MapPin size={9} className="text-ocean-600" />
              {listing.city}
            </div>
            {listing.is_official && (
              <div className="bg-blue-600/90 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1 text-[8px] font-black text-white uppercase tracking-widest shadow-sm">
                Official
              </div>
            )}
          </div>
        )}
        {/* Freshness Badge */}
        <div className="absolute top-8 left-2">
          <FreshnessBadge
            lastActiveAt={listing.last_active_at}
            availabilityStatus={listing.availability_status}
            responseRate={listing.response_rate}
            avgResponseHours={listing.avg_response_hours}
            size="sm"
          />
        </div>
        {/* Trust Badge */}
        {listing.seller && listing.seller.length > 0 && listing.seller[0].trust_level && listing.seller[0].trust_level !== 'newbie' && (
          <div className="absolute bottom-2 left-2 flex items-center gap-2">
            <TrustBadge level={listing.seller[0].trust_level} size="sm" showLabel={false} />
            <Link 
              to={`/seller/${listing.seller[0].user_id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-2xs text-warm-600 hover:text-teal-600 transition-colors bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full"
            >
              {listing.seller[0].full_name}
            </Link>
          </div>
        )}
        {/* Boost Badge */}
        {listing.isBoosted && listing.boostTier && (
          <div className="absolute bottom-2 right-2 z-10">
            <BoostBadge tier={listing.boostTier} size="sm" />
          </div>
        )}
        {/* Urgent Badge */}
        {listing.is_urgent && (
          <div className="absolute top-2 right-2 z-10">
            <UrgentBadge size="sm" />
          </div>
        )}
        {/* Featured Badge */}
        {listing.is_featured && !listing.isBoosted && (
          <div className={`absolute ${listing.seller && listing.seller.length > 0 && listing.seller[0].trust_level && listing.seller[0].trust_level !== 'newbie' ? 'top-2 right-2' : 'top-2 left-2'} bg-sandy-gradient text-midnight-700 text-3xs font-black uppercase px-2 py-0.5 rounded-full`}>
            ✦ Featured
          </div>
        )}
        {/* Demo Badge */}
        {isDemo && !listing.isBoosted && (
          <div className="absolute bottom-2 right-2 bg-warm-800/60 backdrop-blur-sm text-white/90 text-3xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full z-10">
            Demo
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-3 pb-3 flex-1 flex flex-col justify-between gap-1">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1">
            <h3 className="text-xs font-semibold text-midnight-700 line-clamp-1 leading-tight pr-2 flex-1">
              {listing.title}
            </h3>
            {listing.is_official && (
              <span className="text-[8px] font-black text-blue-600 uppercase tracking-tighter shrink-0">Team</span>
            )}
          </div>
          {listing.area && (
            <p className="text-[9px] font-bold text-warm-400 uppercase tracking-widest flex items-center gap-1">
              📍 {listing.area}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="font-bold text-midnight-800 text-sm">
            ₹{listing.price?.toLocaleString('en-IN') ?? '0'}
          </span>
          <div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
            <ArrowRight size={10} className="text-gray-500" />
          </div>
        </div>
      </div>
    </Link>
  );
};

interface HorizontalCardProps {
  listing: Listing;
  rank: number;
  saved: boolean;
  onSave: (id: string, e: React.MouseEvent) => void;
}

const HorizontalListingCard: React.FC<HorizontalCardProps> = ({ listing, rank, saved, onSave }) => {
  const imageUrl = listing.images?.length
    ? listing.images[0].image_url
    : `https://picsum.photos/seed/${listing.id}/300/300`;
  const isDemo = listing.is_demo || isDemoListing(listing.id);

  const handleClick = (e: React.MouseEvent) => {
    if (isDemo) {
      e.preventDefault();
    }
  };

  return (
    <Link to={isDemo ? '#' : `/listings/${listing.id}`} className="w-44 flex-shrink-0 listing-card group" onClick={handleClick}>
      <div className="relative aspect-square overflow-hidden bg-warm-100 m-2 rounded-2xl">
        <img src={imageUrl} alt={listing.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
        {/* Location & Official Badge */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
          {listing.city && (
            <div className="bg-white/95 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1 text-[8px] font-black text-midnight-700 uppercase tracking-widest shadow-sm border border-warm-100/50">
              <MapPin size={8} className="text-ocean-600" />
              {listing.city}
            </div>
          )}
          {listing.is_official && (
            <div className="bg-blue-600/90 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1 text-[7px] font-black text-white uppercase tracking-widest shadow-sm">
              Official
            </div>
          )}
        </div>

        {/* Trust Badge or AndamanBazaar badge */}
        <div className="absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur-md rounded-xl p-2 flex items-center gap-2">
          {listing.seller && listing.seller.length > 0 && listing.seller[0].trust_level && listing.seller[0].trust_level !== 'newbie' ? (
            <div className="flex items-center gap-2 flex-1">
              <TrustBadge level={listing.seller[0].trust_level} size="sm" />
              <Link 
                to={`/seller/${listing.seller[0].user_id}`}
                onClick={(e) => e.stopPropagation()}
                className="text-[10px] text-warm-600 hover:text-teal-600 transition-colors truncate"
              >
                {listing.seller[0].full_name}
              </Link>
            </div>
          ) : (
            <>
              <div className="w-6 h-6 rounded-md bg-blue-500 flex items-center justify-center flex-shrink-0">
                <BadgeCheck size={12} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-bold">Andaman<span className="text-blue-500">Bazaar</span></div>
                <div className="text-[7px] text-gray-500 tracking-widest uppercase">Local . Trusted</div>
              </div>
            </>
          )}
        </div>

        {/* Demo Badge */}
        {isDemo && (
          <div className="absolute top-2 right-10 bg-warm-800/60 backdrop-blur-sm text-white/90 text-[7px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full z-10">
            Demo
          </div>
        )}

        <button
          onClick={e => onSave(listing.id, e)}
          className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-glass transition-all ${saved ? 'bg-coral-500' : 'bg-white/90 backdrop-blur-sm'}`}
          title={saved ? 'Unsave listing' : 'Save listing'}
          aria-label={saved ? 'Unsave listing' : 'Save listing'}
        >
          <Heart size={12} className={saved ? 'text-white fill-white' : 'text-warm-400'} />
        </button>
      </div>
      <div className="px-3 pb-3 flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <h3 className="text-[11px] font-semibold text-midnight-700 line-clamp-1 leading-tight flex-1">
            {listing.title}
          </h3>
          {listing.is_official && (
            <span className="text-[7px] font-black text-blue-600 uppercase tracking-tighter shrink-0">Team</span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="font-bold text-midnight-800 text-xs">
            ₹{listing.price?.toLocaleString('en-IN') ?? '0'}
          </span>
          {listing.area && (
             <span className="text-[8px] font-bold text-warm-400 uppercase tracking-tight truncate max-w-[60px]">
               {listing.area}
             </span>
          )}
        </div>
      </div>
    </Link>
  );
};

const ListingCardSkeleton = () => (
  <div className="premium-card overflow-hidden">
    <div className="m-2 aspect-square rounded-2xl skeleton" />
    <div className="px-3 pb-3 space-y-2">
      <div className="h-3 skeleton w-3/4" />
      <div className="h-4 skeleton w-1/4" />
    </div>
  </div>
);

const HorizontalCardSkeleton = () => (
  <div className="w-44 flex-shrink-0 listing-card">
    <div className="aspect-square m-2 rounded-2xl skeleton" />
    <div className="px-3 pb-3 space-y-2">
      <div className="h-3 skeleton w-5/6" />
      <div className="h-4 skeleton w-1/3" />
    </div>
  </div>
);


// ============================================================
//  MAIN HOME COMPONENT
// ============================================================
export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Data state
  const [featuredListings, setFeaturedListings] = useState<Listing[]>([]);
  const [trendingListings, setTrendingListings] = useState<Listing[]>([]);
  const [recentListings, setRecentListings] = useState<Listing[]>([]);
  const [boostedListings, setBoostedListings] = useState<Listing[]>([]);
  const [urgentListings, setUrgentListings] = useState<Listing[]>([]);
  const [loadingUrgent, setLoadingUrgent] = useState(false);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [savedListings, setSavedListings] = useState<Set<string>>(new Set());

  // Flash deal timer (countdown)
  const [flashTime, setFlashTime] = useState(3 * 3600 + 47 * 60 + 22);

  useEffect(() => {
    fetchFeatured();
    fetchTrending();
    fetchBoosted();
    fetchUrgentListings();
    fetchRecent(0);
  }, []);

  // Cycling search placeholder
  useEffect(() => {
    const t = setInterval(() => {
      setPlaceholderIdx(i => (i + 1) % SEARCH_PLACEHOLDERS.length);
    }, 3000);
    return () => clearInterval(t);
  }, []);


  // Flash deal countdown
  useEffect(() => {
    const t = setInterval(() => {
      setFlashTime(s => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const fetchFeatured = async () => {
    setLoadingFeatured(true);
    try {
      const snap = await getDocs(
        query(collection(db, 'listings'),
          where('status', '==', 'active'),
          where('isFeatured', '==', true),
          orderBy('createdAt', 'desc'),
          limit(10)
        )
      );
      setFeaturedListings(snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[]);
    } catch (err) {
      console.error('Featured fetch error:', err);
      setFeaturedListings([]);
    } finally {
      setLoadingFeatured(false);
    }
  };

  const fetchTrending = async () => {
    setLoadingTrending(true);
    try {
      const snap = await getDocs(
        query(collection(db, 'listings'),
          where('status', '==', 'active'),
          orderBy('viewsCount', 'desc'),
          limit(6)
        )
      );
      setTrendingListings(snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[]);
    } catch (err) {
      console.error('Trending fetch error:', err);
      setTrendingListings([]);
    } finally {
      setLoadingTrending(false);
    }
  };

  const fetchBoosted = async () => {
    try {
      const snap = await getDocs(
        query(collection(db, 'listings'),
          where('status', '==', 'active'),
          where('isBoosted', '==', true),
          where('boostExpiresAt', '>', Timestamp.now()),
          orderBy('boostExpiresAt', 'desc'),
          limit(6)
        )
      );
      setBoostedListings(snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[]);
    } catch (err) {
      console.error('Boosted fetch error:', err);
      setBoostedListings([]);
    }
  };

  const fetchUrgentListings = async () => {
    setLoadingUrgent(true);
    try {
      const snap = await getDocs(
        query(collection(db, 'listings'),
          where('status', '==', 'active'),
          where('is_urgent', '==', true),
          orderBy('createdAt', 'desc'),
          limit(6)
        )
      );
      setUrgentListings(snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[]);
    } catch (err) {
      console.error('Urgent fetch error:', err);
      setUrgentListings([]);
    } finally {
      setLoadingUrgent(false);
    }
  };

  const fetchRecent = async (pageIndex: number) => {
    if (pageIndex === 0) setLoadingRecent(true);
    else setLoadingMore(true);
    try {
      const snap = await getDocs(
        query(collection(db, 'listings'),
          where('status', '==', 'active'),
          orderBy('createdAt', 'desc'),
          limit((pageIndex + 1) * RECENT_PAGE_SIZE)
        )
      );
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      const paged = all.slice(pageIndex * RECENT_PAGE_SIZE);
      setRecentListings(prev => pageIndex === 0 ? all.slice(0, RECENT_PAGE_SIZE) : [...prev, ...paged]);
      setHasMore(all.length === (pageIndex + 1) * RECENT_PAGE_SIZE);
      setPage(pageIndex);
    } catch (err) {
      console.error('Recent fetch error:', err);
      if (pageIndex === 0) setRecentListings([]);
    } finally {
      setLoadingRecent(false);
      setLoadingMore(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(searchQuery.trim() ? `/listings?q=${encodeURIComponent(searchQuery.trim())}` : '/listings');
  };

  const toggleSave = useCallback(async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const user = auth.currentUser;
    if (!user) {
      showToast('Sign in to save items to your favorites.', 'info');
      return;
    }
    setSavedListings(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, [showToast]);

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const formatTimer = (s: number) => {
    const h = String(Math.floor(s / 3600)).padStart(2, '0');
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return { h, m, ss };
  };

  const { h, m, ss } = formatTimer(flashTime);

  return (
    <>
      <Seo 
        title="Andaman's Local Marketplace" 
        description="Buy & Sell locally in Andaman — no mainland scams. Your trusted community marketplace for the Andaman & Nicobar Islands."
      />
      <div className="min-h-screen bg-warm-50 pb-28 md:pb-12">

      {/* ── HERO — IMMERSIVE OCEAN ── */}
      <section className="relative overflow-hidden wave-divider bg-gradient-ocean-deep">
        {/* Atmospheric light orbs */}
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-20 blur-3xl pointer-events-none bg-radial-teal-glow" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[300px] h-[300px] rounded-full opacity-15 blur-3xl pointer-events-none bg-radial-sandy-glow" />

        <div className="relative z-10 px-4 pt-16 pb-24 md:pt-24 md:pb-32 text-center">
          <div className="app-container space-y-8 max-w-3xl mx-auto">
            {/* Tag */}
            <div className="reveal">
              <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full text-white/90 text-[11px] md:text-xs font-bold uppercase tracking-[0.15em]">
                <span className="w-2 h-2 rounded-full bg-teal-300 animate-pulse" />
                Buy & Sell locally in Andaman
              </span>
            </div>

            {/* Display Heading */}
            <div className="reveal reveal-delay-1">
              <h1 className="font-display text-5xl md:text-6xl xl:text-7xl text-white leading-[1.1] tracking-tight">
                Buy & Sell{' '}
                <br className="md:hidden" />
                <span className="relative">
                  <span className="bg-gradient-to-r from-teal-200 via-teal-300 to-sandy-300 bg-clip-text text-transparent">in Paradise.</span>
                </span>
              </h1>
            </div>

            {/* Subtext */}
            <div className="reveal reveal-delay-2">
              <p className="text-teal-100/70 text-base md:text-lg max-w-md mx-auto leading-relaxed font-sans">
                {COPY.HOME.HERO_SUBTITLE}
              </p>
            </div>

            {/* Search */}
            <div className="reveal reveal-delay-3 max-w-lg mx-auto">
              <form onSubmit={handleSearch}>
                <div className="relative group">
                  <div className="absolute inset-0 bg-white/5 rounded-full blur-xl group-hover:bg-white/10 transition-all duration-500" />
                  <div className="relative flex items-center bg-white/15 backdrop-blur-xl border border-white/25 rounded-full shadow-elevated overflow-hidden hover:bg-white/20 transition-all duration-500">
                    <div className="pl-5 flex items-center pointer-events-none">
                      <Search size={18} className="text-white/50" />
                    </div>
                    <input
                      id="home-search-input"
                      name="q"
                      aria-label="Search listings"
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder={SEARCH_PLACEHOLDERS[placeholderIdx]}
                      className="flex-1 px-4 py-4 bg-transparent text-white placeholder-white/40 text-sm md:text-base outline-none font-sans"
                    />
                    <button
                      type="submit"
                      className="mr-1.5 my-1.5 bg-white text-midnight-700 text-sm font-heading font-bold px-4 md:px-6 py-2.5 rounded-full hover:bg-teal-50 transition-colors active:scale-95 flex-shrink-0"
                    >
                      <span className="hidden md:inline">Search</span>
                      <Search size={16} className="md:hidden" />
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Trust indicators */}
            <div className="reveal reveal-delay-4 flex flex-wrap items-center justify-center gap-6 text-white/40 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <BadgeCheck size={14} className="text-teal-300/70" />
                GPS Verified Sellers
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin size={14} className="text-coral-300/70" />
                All Islands Covered
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── ISLAND CATEGORY GRID ── */}
      <section className="px-4 pt-10 mb-10">
        <div className="app-container">
          <div className="section-header reveal">
            <h2 className="font-heading font-extrabold text-xl text-midnight-700 tracking-tight">Browse Categories</h2>
            <Link to="/listings" className="section-link">See all <ArrowRight size={14} /></Link>
          </div>
          <div className="grid grid-cols-4 md:grid-cols-4 gap-3 md:gap-5">
            {ISLAND_CATEGORIES.map((cat, i) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.slug}
                  to={`/listings?category=${cat.slug}`}
                  className={`reveal group flex flex-col items-center gap-3 p-4 md:p-6 rounded-3xl bg-white border border-warm-200/60 hover:border-teal-200 transition-all duration-500 hover:shadow-card-hover`}
                  style={{ animationDelay: `${(i + 1) * 80}ms` }}
                >
                  <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center ${cat.bgClass} group-hover:scale-110 transition-transform duration-500 ease-out-expo`}
                  >
                    <Icon size={28} className={cat.textClass} />
                  </div>
                  <span className="text-[11px] md:text-sm font-bold text-midnight-700 text-center leading-tight">{cat.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── AI TRIP PLANNER PROMO ── */}
      <section className="px-4 mb-10">
        <div className="app-container">
          <Link 
            to="/planner" 
            className="group relative block rounded-[32px] overflow-hidden bg-midnight-900 shadow-elevated transition-transform active:scale-[0.98]"
          >
            {/* Mesh Background */}
            <div className="absolute inset-0 bg-mesh opacity-30 group-hover:opacity-40 transition-opacity" />
            <div className="absolute inset-0 bg-gradient-to-br from-ocean-600/40 to-transparent pointer-events-none" />
            
            <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="max-w-xl">
                <div className="flex items-center gap-2 mb-4">
                  <div className="bg-teal-500/20 backdrop-blur-md px-3 py-1 rounded-full border border-teal-500/30 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-teal-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-teal-300">Beta Early Access</span>
                  </div>
                </div>
                <h2 className="text-3xl md:text-5xl font-display font-black text-white leading-tight mb-4">
                  Plan your perfect <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-emerald-300">Island Escape</span> with AI
                </h2>
                <p className="text-white/60 text-base md:text-lg font-medium leading-relaxed mb-6">
                  Personalized itineraries, ferry schedules, and island-hopping logic — generated in seconds for your unique travel style.
                </p>
                <div className="flex items-center gap-4">
                  <span className="bg-white text-midnight-900 px-6 py-3 rounded-2xl font-heading font-black text-sm transition-all group-hover:shadow-ocean-glow">
                    Start Planning
                  </span>
                  <div className="flex -space-x-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-10 h-10 rounded-full border-2 border-midnight-900 bg-warm-200 overflow-hidden shadow-lg">
                        <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="User" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    <div className="w-10 h-10 rounded-full border-2 border-midnight-900 bg-teal-500 flex items-center justify-center text-[10px] font-black text-white shadow-lg">
                      500+
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative md:w-1/3 flex justify-center">
                <div className="w-64 h-64 md:w-80 md:h-80 relative">
                  <div className="absolute inset-0 bg-teal-500/20 rounded-full blur-3xl animate-pulse" />
                  <div className="relative z-10 w-full h-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-[40px] p-6 shadow-2xl rotate-3 group-hover:rotate-6 transition-transform duration-700">
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-12 bg-white/5 rounded-xl border border-white/5 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                      ))}
                      <div className="h-20 bg-teal-500/20 rounded-xl border border-teal-500/20 flex items-center justify-center">
                        <Compass className="text-teal-400 animate-spin-slow" size={32} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* ── FLASH DEALS ── */}
      {FLASH_DEALS_ENABLED && (
      <section className="px-4 mb-10">
        <div className="app-container">
          <div className="relative rounded-[28px] overflow-hidden reveal">
            {/* Layered gradient background */}
            <div className="absolute inset-0 bg-gradient-flash" />
            <div className="absolute inset-0 opacity-20 bg-flash-highlight" />

            <div className="relative z-10 p-6 md:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Flame size={18} className="text-white/90" />
                    <span className="text-white/80 text-xs font-heading font-extrabold uppercase tracking-[0.15em]">Flash Deals</span>
                  </div>
                  <p className="text-white font-display text-2xl md:text-3xl leading-tight">Ends in</p>
                </div>

                <div className="flex items-center gap-2">
                  {[h, m, ss].map((val, i) => (
                    <React.Fragment key={i}>
                      <div className="bg-midnight-700/80 backdrop-blur-sm text-white text-center px-3 py-2 rounded-xl min-w-[44px]">
                        <div className="text-xl font-heading font-black leading-none">{val}</div>
                        <div className="text-[8px] text-white/40 uppercase font-bold mt-0.5">{['HRS', 'MIN', 'SEC'][i]}</div>
                      </div>
                      {i < 2 && <span className="text-white/60 font-bold text-lg">:</span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <Link
                to="/listings?sort=price_low"
                className="mt-5 flex w-full items-center justify-center gap-2 bg-white text-midnight-700 font-heading font-bold text-sm py-3 rounded-2xl hover:bg-teal-50 transition-all duration-300 active:scale-[0.98] shadow-lg"
              >
                View Flash Deals <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* ── FEATURED LISTINGS ── */}
      <FeaturedSection
        listings={featuredListings as any[]}
        loading={loadingFeatured}
        savedListings={savedListings}
        onSave={toggleSave}
      />

      {/* ── URGENT DEALS ── */}
      {urgentListings.length > 0 && (
      <section className="px-4 mb-10">
        <div className="app-container">
          <div className="section-header px-0 reveal">
            <div>
              <h2 className="font-heading font-extrabold text-xl text-midnight-700 tracking-tight flex items-center gap-2">
                ⚡ <span className="text-red-600">Urgent</span> Deals
              </h2>
              <p className="text-xs text-warm-400 font-medium mt-1">Must go fast! Great local offers</p>
            </div>
            <Link to="/listings?urgent=true" className="section-link text-red-600 font-bold">See All <ArrowRight size={14} /></Link>
          </div>
          <div className="overflow-x-auto hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            <div className="flex gap-4 w-max pb-2">
              {loadingUrgent
                ? [1, 2, 3].map(n => <HorizontalCardSkeleton key={n} />)
                : urgentListings.map((listing, i) => (
                  <HorizontalListingCard
                    key={listing.id}
                    listing={listing}
                    rank={i + 1}
                    saved={savedListings.has(listing.id)}
                    onSave={toggleSave}
                  />
                ))
              }
            </div>
          </div>
        </div>
      </section>
      )}

      {/* ── TRENDING ON THE ISLANDS ── */}
      <section className="px-4 mb-10">
        <div className="app-container">
          <div className="section-header px-0 reveal">
            <div>
              <h2 className="font-heading font-extrabold text-xl text-midnight-700 tracking-tight flex items-center gap-2">
                Today's <span className="text-coral-500">Hot Picks</span>
              </h2>
              <p className="text-xs text-warm-400 font-medium mt-1">Sample listings from across the islands</p>
            </div>
            <Link to="/listings?sort=popular" className="section-link">All <ArrowRight size={14} /></Link>
          </div>
          <div className="overflow-x-auto hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            <div className="flex gap-4 w-max pb-2">
              {loadingTrending
                ? [1, 2, 3].map(n => <HorizontalCardSkeleton key={n} />)
                : trendingListings.length === 0 ? (
                  <div className="empty-state py-12 px-8 text-center rounded-3xl border-2 border-dashed border-warm-200 bg-warm-50 min-w-[280px]">
                    <h3 className="font-heading font-bold text-midnight-700 mb-1">🔥 No trending items</h3>
                    <p className="text-sm text-warm-400 mb-4">Post something amazing to get featured here!</p>
                    <Link to="/post" className="btn-primary text-sm py-2.5 inline-block">
                      Post a Free Listing
                    </Link>
                  </div>
                ) : trendingListings.slice(0, 5).map((listing, i) => (
                  <HorizontalListingCard
                    key={listing.id}
                    listing={listing}
                    rank={i + 1}
                    saved={savedListings.has(listing.id)}
                    onSave={toggleSave}
                  />
                ))
              }
            </div>
          </div>
        </div>
      </section>

      {/* ── ISLAND VERIFIED STRIP ── */}
      <section className="px-4 mb-10">
        <div className="app-container">
          <div className="relative rounded-[28px] overflow-hidden reveal bg-gradient-verified">
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-30 blur-2xl bg-radial-verified-glow" />
            <div className="relative p-6 md:p-8 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-teal-600/10 flex items-center justify-center">
                  <BadgeCheck size={18} className="text-teal-600" />
                </div>
                <h3 className="font-heading font-extrabold text-teal-800 text-base md:text-lg">Island Verified Sellers</h3>
              </div>
              <p className="text-teal-700/60 text-sm md:text-base leading-relaxed">
                GPS-verified locals from across the Andaman Islands. Trade with confidence.
              </p>
              <Link
                to="/listings?verified=true"
                className="inline-flex items-center gap-1.5 text-teal-700 text-sm font-heading font-bold hover:gap-2.5 transition-all duration-300"
              >
                Browse verified listings <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FRESH ARRIVALS GRID (boosted listings first) ── */}
      <section className="px-4 mb-10">
        <div className="app-container">
          <div className="section-header reveal">
            <div>
              <h2 className="font-heading font-extrabold text-xl text-midnight-700 tracking-tight">Fresh Arrivals</h2>
              <p className="text-xs text-warm-400 font-medium mt-1">Just listed today</p>
            </div>
            <Link to="/listings" className="section-link">All <ArrowRight size={14} /></Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {loadingRecent
              ? [1, 2, 3, 4].map(n => <ListingCardSkeleton key={n} />)
              : (() => {
                  // Merge boosted listings at the top, then non-boosted recent
                  const boostedIds = new Set(boostedListings.map(l => l.id));
                  const nonBoosted = recentListings.filter(l => !boostedIds.has(l.id));
                  const merged = [...boostedListings, ...nonBoosted];
                  return merged.length === 0 ? (
                    <div className="col-span-full empty-state py-16 text-center rounded-3xl border-2 border-dashed border-warm-200 bg-warm-50">
                      <h3 className="font-heading font-bold text-midnight-700 text-lg mb-2">✨ No fresh arrivals</h3>
                      <p className="text-sm text-warm-400 mb-4">Be the first to post your local goods today!</p>
                      <Link to="/post" className="btn-primary text-sm py-2.5 inline-block">
                        Post a Free Listing
                      </Link>
                    </div>
                  ) : merged.map((listing, i) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      saved={savedListings.has(listing.id)}
                      onSave={toggleSave}
                      timeAgo={formatTimeAgo(listing.created_at)}
                      style={{ animationDelay: `${i * 50}ms` }}
                    />
                  ));
                })()
            }
          </div>
          {
            hasMore && !loadingRecent && (
              <div className="flex justify-center mt-10">
                <button
                  onClick={() => fetchRecent(page + 1)}
                  disabled={loadingMore}
                  className="group bg-white text-midnight-700 font-heading font-bold px-8 py-3.5 rounded-full border border-warm-200 shadow-card hover:shadow-card-hover hover:border-teal-200 transition-all duration-500 disabled:opacity-50 flex items-center gap-2 ease-out-expo"
                >
                  {loadingMore && <Loader2 size={16} className="animate-spin" />}
                  {loadingMore ? COPY.LOADING.PULL_REFRESH : 'Load More Listings'}
                  {!loadingMore && <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />}
                </button>
              </div>
            )
          }
        </div>
      </section>

      {/* ── SEASONAL SPOTLIGHT ── */}
      <section className="px-4 mb-12">
        <div className="app-container">
          <div className="relative rounded-[32px] overflow-hidden reveal">
            <div className="absolute inset-0 bg-gradient-ocean-deep" />
            <div className="absolute inset-0 opacity-30 bg-seasonal-highlight" />

            <div className="relative z-10 p-8 md:p-12">
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] font-bold text-sandy-400 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
                🌊 Seasonal Spotlight
              </span>
              <h3 className="text-white font-display text-3xl md:text-4xl mt-5 mb-3 leading-tight">
                Tourist Season
                <br />
                is Here
              </h3>
              <p className="text-white/50 text-sm md:text-base mb-6 max-w-sm leading-relaxed">
                Nov–May is peak season. Find the best experiences, stays and local products from verified island sellers.
              </p>
              <Link
                to="/listings?category=tourism"
                className="inline-flex items-center gap-2 bg-white text-midnight-700 font-heading font-bold text-sm py-3 px-6 rounded-full hover:bg-teal-50 transition-colors active:scale-95"
              >
                Explore Season Picks <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
    </>
  );
};
