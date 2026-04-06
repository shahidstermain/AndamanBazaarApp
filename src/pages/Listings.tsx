import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { TrustBadge } from '../components/TrustBadge';
import { FreshnessBadge } from '../components/FreshnessBadge';
import { Search, MapPin, Heart, Sparkles, Filter, X, ChevronDown, ArrowUpDown, Loader2, Bell } from 'lucide-react';
import { useToast } from '../components/Toast';
import { isDemoListing } from '../lib/demoListings';
import { UrgentBadge } from '../components/UrgentBadge';
import { Seo } from '../components/Seo';
import { FilterSidebar, FilterState, DurationOption } from '../components/FilterSidebar';

const CATEGORIES = [
  { label: '🌊 All', slug: 'all' },
  { label: '🐟 Fresh Catch', slug: 'fresh-catch' },
  { label: '🥥 Produce', slug: 'produce' },
  { label: '🐚 Handicrafts', slug: 'handicrafts' },
  { label: '🤿 Experiences', slug: 'experiences' },
  { label: '🏠 Rentals', slug: 'rentals' },
  { label: '⚡ Services', slug: 'services' },
  { label: '🛒 General', slug: 'other' },
  { label: '🏖️ Tourism', slug: 'tourism' },
];

const AREAS = [
  { label: '🏝️ All Areas', value: '' },
  { label: '🌆 Port Blair', value: 'Port Blair' },
  { label: '🏖️ Havelock Island', value: 'Havelock' },
  { label: '🏝️ Neil Island', value: 'Neil Island' },
  { label: '🌴 Diglipur', value: 'Diglipur' },
  { label: '🌊 Car Nicobar', value: 'Car Nicobar' },
  { label: '🏞️ Mayabunder', value: 'Mayabunder' },
];

const CONDITIONS = [
  { label: 'All Conditions', value: '' },
  { label: 'New', value: 'new' },
  { label: 'Used', value: 'used' },
  { label: 'Refurbished', value: 'refurbished' },
];

const DATE_RANGES = [
  { label: 'Any time', value: '' },
  { label: 'Last 24 hours', value: '1' },
  { label: 'Last 7 days', value: '7' },
  { label: 'Last 30 days', value: '30' },
];

const PAGE_SIZE = 20;

type SortOption = 'newest' | 'price_low' | 'price_high' | 'most_viewed';

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest First',
  price_low: 'Price: Low → High',
  price_high: 'Price: High → Low',
  most_viewed: 'Most Viewed',
};

export const Listings: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  // Unified filter state
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(searchParams.get('verified') === 'true');
  const [showUrgentOnly, setShowUrgentOnly] = useState(searchParams.get('urgent') === 'true');
  const [activeCategory, setActiveCategory] = useState<string | null>(searchParams.get('category'));
  const [activeArea, setActiveArea] = useState<string>(searchParams.get('area') || '');
  const [activeCondition, setActiveCondition] = useState<string>(searchParams.get('condition') || '');
  const [activeDateRange, setActiveDateRange] = useState<string>(searchParams.get('dateRange') || '');
  const [filters, setFilters] = useState<FilterState>({
    location: searchParams.get('area') || '',
    category: searchParams.get('category') ? (CATEGORIES.find(c => c.slug === searchParams.get('category'))?.label.replace(/[^a-zA-Z\s]/g, '').trim() || '') : '',
    minPrice: '',
    maxPrice: '',
    durations: [],
  });
  const [listings, setListings] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const { showToast } = useToast();

  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchListings = useCallback(async (reset = true) => {
    if (reset) {
      setLoading(true);
      setPage(0);
    } else {
      setLoadingMore(true);
    }

    try {
      const q = searchQuery.toLowerCase();
      
      const constraints: any[] = [where('status', '==', 'active')];
      
      if (filters.category && filters.category !== 'All Categories') {
        const catSlug = filters.category.toLowerCase().replace(/\s+/g, '-');
        constraints.push(where('categoryId', '==', catSlug));
      }
      if (filters.location && filters.location !== 'All Locations') {
         constraints.push(where('city', '==', filters.location));
      }
      
      if (showVerifiedOnly) constraints.push(where('isLocationVerified', '==', true));
      if (showUrgentOnly) constraints.push(where('is_urgent', '==', true));

      switch (sortBy) {
        case 'price_low': constraints.push(orderBy('price', 'asc')); break;
        case 'price_high': constraints.push(orderBy('price', 'desc')); break;
        case 'most_viewed': constraints.push(orderBy('viewsCount', 'desc')); break;
        default: constraints.push(orderBy('createdAt', 'desc')); break;
      }

      const snap = await getDocs(query(collection(db, 'listings'), ...constraints));
      let results = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

      if (q) {
        results = results.filter(l =>
          l.title?.toLowerCase().includes(q) || l.description?.toLowerCase().includes(q)
        );
      }
      if (filters.minPrice !== '' && !isNaN(Number(filters.minPrice))) {
        results = results.filter(l => (l.price ?? 0) >= Number(filters.minPrice));
      }
      if (filters.maxPrice !== '' && !isNaN(Number(filters.maxPrice))) {
        results = results.filter(l => (l.price ?? 0) <= Number(filters.maxPrice));
      }
      if (filters.durations.length > 0) {
        results = results.filter(l => {
          if (!l.durationMinutes) return false;
          const mins = l.durationMinutes;
          if (filters.durations.includes('< 2 hours') && mins < 120) return true;
          if (filters.durations.includes('Half Day') && mins >= 120 && mins <= 360) return true;
          if (filters.durations.includes('Full Day') && mins > 360) return true;
          return false;
        });
      }

      const offset = reset ? 0 : (page + 1) * PAGE_SIZE;
      const paged = results.slice(offset, offset + PAGE_SIZE);

      if (reset) {
        setListings(paged);
      } else {
        setListings(prev => [...prev, ...paged]);
      }

      setHasMore(results.length > offset + PAGE_SIZE);
      if (!reset) setPage(prev => prev + 1);
      setError(null);
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError('Failed to load listings. Please check your connection.');
      setListings([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [searchQuery, sortBy, filters, page, showVerifiedOnly, showUrgentOnly]);

  const handleSaveSearch = async () => {
    if (!auth.currentUser) {
      showToast('Please login to save searches', 'error');
      return;
    }
    try {
      await addDoc(collection(db, 'saved_searches'), {
        userId: auth.currentUser.uid,
        query: searchQuery,
        category: filters.category,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        area: filters.location,
        createdAt: serverTimestamp(),
      });
      showToast('Search saved! You\'ll be notified of new listings.', 'success');
    } catch (err) {
      console.error('Error saving search:', err);
      showToast('Failed to save search', 'error');
    }
  };

  useEffect(() => {
    void fetchListings(true);
    void fetchFavorites();
  }, [filters, searchQuery, showVerifiedOnly, showUrgentOnly, sortBy]);

  // Infinite scroll observer
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          void fetchListings(false);
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, fetchListings]);

  // Bug 18: Close sort dropdown on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showSortDropdown) {
        setShowSortDropdown(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showSortDropdown]);

  const fetchFavorites = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const snap = await getDocs(
        query(collection(db, 'favorites'), where('userId', '==', user.uid))
      );
      setFavorites(new Set(snap.docs.map(d => d.data().listingId as string)));
    } catch (err) {
      console.error('Error fetching favorites:', err);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void fetchListings(true);
  };

  const toggleFavorite = async (listingId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const user = auth.currentUser;
    if (!user) {
      showToast('Sign in to save items to your favorites.', 'info');
      return;
    }

    const isFav = favorites.has(listingId);
    if (isFav) {
      const snap = await getDocs(
        query(collection(db, 'favorites'), where('userId', '==', user.uid), where('listingId', '==', listingId))
      );
      await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
      setFavorites(prev => { const n = new Set(prev); n.delete(listingId); return n; });
    } else {
      await addDoc(collection(db, 'favorites'), {
        userId: user.uid,
        listingId,
        createdAt: serverTimestamp(),
      });
      setFavorites(prev => { const n = new Set(prev); n.add(listingId); return n; });
    }
  };

  const hasActiveFilters = filters.minPrice !== '' || filters.maxPrice !== '' || sortBy !== 'newest' || showVerifiedOnly || showUrgentOnly || filters.location !== '' || filters.category !== '' || filters.durations.length > 0;

  const pageTitle = searchQuery ? `Search results for "${searchQuery}"` : filters.category && filters.category !== 'All Categories' ? `Listings in ${filters.category}` : 'Browse All Listings';
  const pageDescription = `Find local goods, services, and produce for sale in the Andaman & Nicobar Islands. ${searchQuery ? `Results for ${searchQuery}.` : ''}`;

  return (
    <>
      <Seo title={pageTitle} description={pageDescription} />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Mobile Filter Toggle */}
          <div className="lg:hidden flex items-center justify-between mb-4">
            <h1 className="text-2xl font-black text-midnight-700">Explore</h1>
            <button
              onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-warm-200 rounded-xl shadow-sm text-sm font-bold text-midnight-700"
            >
              <Filter size={16} className="text-teal-600" />
              Filters
              {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-teal-500" />}
            </button>
          </div>

          {/* Sidebar */}
          <div className={`w-full lg:w-72 flex-shrink-0 ${isMobileFiltersOpen ? 'block' : 'hidden lg:block'}`}>
            <FilterSidebar filters={filters} onChange={setFilters} className="sticky top-24 z-20" />
          </div>

          {/* Main Content */}
          <div className="flex-1 space-y-6">
            
            {/* Search Bar & Sort Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-warm-200 shadow-sm">
              <form onSubmit={handleSearchSubmit} className="relative flex-1">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-400">
                  <Search size={18} />
                </div>
                <input
                  id="search-input"
                  name="q"
                  aria-label="Search listings"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search across the islands…"
                  className="w-full h-12 pl-12 pr-12 bg-warm-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-teal-500/20 transition-all"
                />
                {searchQuery && (
                  <button aria-label="Clear search" title="Clear search" onClick={() => { setSearchQuery(''); handleSearchSubmit({ preventDefault: () => {} } as any); }} type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-warm-300 hover:text-midnight-700">
                    <X size={16} />
                  </button>
                )}
              </form>

              <div className="flex items-center gap-3">
                {/* Sort Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl bg-warm-50 text-xs font-bold text-midnight-700 hover:bg-warm-100 transition-colors"
                  >
                    <ArrowUpDown size={14} className="text-teal-600" />
                    <span className="whitespace-nowrap">{SORT_LABELS[sortBy]}</span>
                    <ChevronDown size={14} className="text-warm-400" />
                  </button>
                  {showSortDropdown && (
                    <div className="absolute top-full right-0 mt-2 bg-white rounded-xl border border-warm-200 shadow-xl z-30 min-w-[200px] overflow-hidden">
                      {(Object.keys(SORT_LABELS) as SortOption[]).map(key => (
                        <button
                          key={key}
                          onClick={() => { setSortBy(key); setShowSortDropdown(false); }}
                          className={`w-full text-left px-5 py-3 text-xs font-bold transition-colors ${sortBy === key ? 'bg-teal-50 text-teal-700' : 'text-midnight-700 hover:bg-warm-50'}`}
                        >
                          {SORT_LABELS[key]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleSaveSearch}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-warm-50 text-xs font-bold text-midnight-700 hover:bg-warm-100 transition-colors"
                  title="Save Search"
                >
                  <Bell size={14} className="text-warm-400" />
                  <span className="hidden sm:inline">Save</span>
                </button>
              </div>

              {/* Toggles Row */}
              <div className="flex items-center gap-4 px-2 overflow-x-auto no-scrollbar">
                <button
                  role="switch"
                  aria-checked={showVerifiedOnly ? "true" : "false"}
                  onClick={() => setShowVerifiedOnly(!showVerifiedOnly)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                    showVerifiedOnly 
                      ? 'bg-teal-500 text-white shadow-teal-mnm' 
                      : 'bg-warm-50 text-warm-400 hover:bg-warm-100'
                  }`}
                >
                  <Sparkles size={12} className={showVerifiedOnly ? 'animate-pulse' : ''} />
                  Verified
                </button>

                <button
                  role="switch"
                  aria-checked={showUrgentOnly ? "true" : "false"}
                  onClick={() => setShowUrgentOnly(!showUrgentOnly)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                    showUrgentOnly 
                      ? 'bg-coral-500 text-white shadow-coral-mnm' 
                      : 'bg-warm-50 text-warm-400 hover:bg-warm-100'
                  }`}
                >
                  <Bell size={12} className={showUrgentOnly ? 'animate-bounce-subtle' : ''} />
                  Urgent
                </button>
              </div>
            </div>

      {/* Results Count */}
      {!loading && listings.length > 0 && (
        <div className="flex items-center justify-between mb-6">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {listings.length} {listings.length === 1 ? 'item' : 'items'}{hasMore ? '+' : ''} found
          </p>
        </div>
      )}

      {/* Listings Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
        {loading ? (
          [1, 2, 3, 4, 5, 6, 7, 8].map(n => <ListingSkeleton key={n} />)
        ) : error ? (
          <div className="col-span-full py-24 text-center space-y-5 bg-red-50 rounded-3xl border-2 border-dashed border-red-200 animate-fade-in">
            <div className="text-5xl animate-bounce">⚠️</div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-heading font-bold text-red-700">Connection Trouble</h3>
              <p className="text-red-600/80 text-sm max-w-xs mx-auto">{error}</p>
            </div>
            <button 
              onClick={() => void fetchListings(true)} 
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95"
            >
              Try Again
            </button>
          </div>
        ) : listings.length === 0 ? (
          <div className="col-span-full py-24 text-center space-y-5 bg-warm-50 rounded-3xl border-2 border-dashed border-warm-200 animate-fade-in">
            <div className="text-5xl animate-float">🏝️</div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-heading font-bold text-midnight-700">
                {searchQuery ? `No results for "${searchQuery}"` : 'No listings found in this category'}
              </h3>
              <p className="text-warm-400 text-sm max-w-xs mx-auto">
                {hasActiveFilters 
                  ? "Try adjusting your filters or search for 'All' to see more results."
                  : "We couldn't find any listings here. Check back later or be the first to post!"}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
              {hasActiveFilters ? (
                <button onClick={() => setFilters({ location: '', category: '', minPrice: '', maxPrice: '', durations: [] })} className="btn-secondary text-sm py-2.5">Clear Filters</button>
              ) : (
                <Link to="/post" className="btn-primary text-sm py-2.5">Post a Listing</Link>
              )}
            </div>
          </div>
        ) : (
          listings.map((listing) => (
            <ListingItem
              key={listing.id}
              listing={listing}
              isFavorited={favorites.has(listing.id)}
              onToggleFavorite={(e) => toggleFavorite(listing.id, e)}
            />
          ))
        )}
      </div>

      {/* Infinite Scroll Sentinel */}
      {hasMore && !loading && listings.length > 0 && (
        <div ref={sentinelRef} className="flex items-center justify-center py-12">
          {loadingMore && (
            <div className="flex items-center gap-3">
              <Loader2 size={20} className="animate-spin text-ocean-600" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading more...</span>
            </div>
          )}
        </div>
      )}
          </div>
        </div>
      </div>
    </>
  );
};

const ListingSkeleton: React.FC = () => (
  <div className="bg-white border-2 border-slate-100 rounded-[32px] flex flex-col h-96 overflow-hidden p-3 space-y-4">
    <div className="relative aspect-square bg-slate-100 rounded-[24px] animate-pulse"></div>
    <div className="p-2 space-y-3">
      <div className="h-6 w-3/4 bg-slate-100 rounded animate-pulse"></div>
      <div className="h-4 w-1/2 bg-slate-50 rounded animate-pulse"></div>
      <div className="mt-4 flex justify-between">
        <div className="h-4 w-12 bg-slate-50 rounded"></div>
        <div className="h-4 w-12 bg-slate-50 rounded"></div>
      </div>
    </div>
  </div>
);

const ListingItem: React.FC<{ listing: any, isFavorited: boolean, onToggleFavorite: (e: React.MouseEvent) => void }> = ({ listing, isFavorited, onToggleFavorite }) => {
  const imageUrl = listing.images && listing.images.length > 0
    ? listing.images[0].image_url
    : `https://picsum.photos/seed/list-${listing.id}/600/600`;
  const isDemo = listing.is_demo || isDemoListing(listing.id);

  const handleClick = (e: React.MouseEvent) => {
    if (isDemo) {
      e.preventDefault();
    }
  };

  return (
    <Link to={isDemo ? '#' : `/listings/${listing.id}`} className="listing-card group" onClick={handleClick}>
      <div className="relative aspect-square bg-warm-100 m-2 rounded-2xl overflow-hidden">
        <img
          src={imageUrl}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
          alt={listing.title}
        />
        {/* Urgent Badge */}
        {listing.is_urgent && (
          <div className="absolute top-2 left-2 z-10">
            <UrgentBadge size="sm" />
          </div>
        )}
        <button
          onClick={onToggleFavorite}
          className={`absolute top-2 right-2 w-9 h-9 rounded-full flex items-center justify-center shadow-glass z-10 transition-all active:scale-90 ${isFavorited ? 'bg-coral-500' : 'bg-white/90 backdrop-blur-sm'
            }`}
          aria-label={isFavorited ? 'Unsave' : 'Save'}
        >
          <Heart size={15} className={isFavorited ? 'text-white fill-white' : 'text-warm-400'} strokeWidth={2} />
        </button>
        {listing.is_featured && (
          <div className="absolute top-2 left-2 bg-sandy-gradient text-midnight-700 text-[8px] font-black uppercase px-2 py-0.5 rounded-full z-10 flex items-center gap-1">
            <Sparkles size={8} /> Featured
          </div>
        )}
        {listing.city && (
          <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1 text-[9px] font-bold text-midnight-700 shadow-sm z-10">
            <MapPin size={8} className="text-teal-500" />{listing.city}
          </div>
        )}
        {/* Freshness Badge */}
        <div className="absolute top-8 left-2 z-10">
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
          <div className="absolute bottom-8 left-2 flex items-center gap-2 z-10">
            <TrustBadge level={listing.seller[0].trust_level} size="sm" showLabel={false} />
            <Link 
              to={`/seller/${listing.seller[0].user_id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] text-warm-600 hover:text-teal-600 transition-colors bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full"
            >
              {listing.seller[0].full_name}
            </Link>
          </div>
        )}
        {/* Demo Badge */}
        {isDemo && (
          <div className="absolute bottom-2 right-2 bg-warm-800/60 backdrop-blur-sm text-white/90 text-[7px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full z-10">
            Demo
          </div>
        )}
      </div>
      <div className="px-3 pb-3 flex flex-col flex-1">
        <span className="font-heading font-black text-teal-600 text-base">₹{listing.price?.toLocaleString('en-IN')}</span>
        <h3 className="text-[12px] font-bold text-midnight-700 line-clamp-2 leading-tight mt-0.5 group-hover:text-teal-600 transition-colors">{listing.title}</h3>
      </div>
    </Link>
  );
};
