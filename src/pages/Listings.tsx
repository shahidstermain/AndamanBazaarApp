
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Listing } from '../types';
import { Search, MapPin, Heart, Sparkles, Filter, X, ChevronDown, ArrowUpDown, Loader2 } from 'lucide-react';
import { useToast } from '../components/Toast';
import { isDemoListing } from '../lib/demoListings';
import { COPY } from '../lib/localCopy';

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
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [activeCategory, setActiveCategory] = useState<string | null>(searchParams.get('category'));
  const [listings, setListings] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const { showToast } = useToast();

  // Sort & Filter state
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(searchParams.get('verified') === 'true');
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Infinite scroll observer
  const sentinelRef = useRef<HTMLDivElement>(null);

  const buildQuery = useCallback((offset: number) => {
    let query = supabase
      .from('listings')
      .select('id, title, price, city, created_at, is_featured, views_count, images:listing_images(image_url)')
      .eq('status', 'active');

    const q = searchParams.get('q');
    const cat = searchParams.get('category');
    const verified = searchParams.get('verified');

    if (cat && cat !== 'all') {
      query = query.eq('category_id', cat);
    }

    if (q) {
      query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
    }

    if (verified === 'true') {
      query = query.eq('is_location_verified', true);
    }

    // Price filters
    if (minPrice && !isNaN(Number(minPrice))) {
      query = query.gte('price', Number(minPrice));
    }
    if (maxPrice && !isNaN(Number(maxPrice))) {
      query = query.lte('price', Number(maxPrice));
    }

    // Sorting
    switch (sortBy) {
      case 'price_low':
        query = query.order('price', { ascending: true });
        break;
      case 'price_high':
        query = query.order('price', { ascending: false });
        break;
      case 'most_viewed':
        query = query.order('views_count', { ascending: false, nullsFirst: false });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    query = query.range(offset, offset + PAGE_SIZE - 1);
    return query;
  }, [searchParams, sortBy, minPrice, maxPrice]);

  const fetchListings = useCallback(async (reset = true) => {
    if (reset) {
      setLoading(true);
      setPage(0);
    } else {
      setLoadingMore(true);
    }

    try {
      const offset = reset ? 0 : (page + 1) * PAGE_SIZE;
      const { data, error } = await buildQuery(offset);

      if (error) throw error;

      const results = data || [];
      if (reset) {
        setListings(results);
      } else {
        setListings(prev => [...prev, ...results]);
      }

      setHasMore(results.length === PAGE_SIZE);
      if (!reset) setPage(prev => prev + 1);
    } catch (err) {
      console.error("Error fetching listings:", err);
      setListings([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [buildQuery, page]);

  useEffect(() => {
    fetchListings(true);
    fetchFavorites();
  }, [activeCategory, searchParams.get('q'), searchParams.get('verified'), sortBy]);

  // Infinite scroll observer
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          fetchListings(false);
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('favorites')
      .select('listing_id')
      .eq('user_id', user.id);

    if (data) {
      setFavorites(new Set(data.map(f => f.listing_id)));
    }
  };

  const handleCategorySelect = (slug: string) => {
    const val = slug === 'all' ? null : slug;
    setActiveCategory(val);

    const newParams = new URLSearchParams(searchParams);
    if (val) newParams.set('category', val);
    else newParams.delete('category');
    setSearchParams(newParams);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchQuery.trim()) newParams.set('q', searchQuery.trim());
    else newParams.delete('q');
    setSearchParams(newParams);
  };

  const handleApplyPriceFilter = () => {
    if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) {
      showToast('Min price cannot be greater than max price.', 'warning');
      return;
    }
    const newParams = new URLSearchParams(searchParams);
    if (showVerifiedOnly) newParams.set('verified', 'true');
    else newParams.delete('verified');
    setSearchParams(newParams);
    fetchListings(true);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    setSortBy('newest');
    setShowVerifiedOnly(false);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('verified');
    setSearchParams(newParams);
    handleCategorySelect('all');
  };

  const toggleFavorite = async (listingId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showToast('Sign in to save items to your favorites.', 'info');
      return;
    }

    const isFav = favorites.has(listingId);
    if (isFav) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('listing_id', listingId);
      setFavorites(prev => { const n = new Set(prev); n.delete(listingId); return n; });
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, listing_id: listingId });
      setFavorites(prev => { const n = new Set(prev); n.add(listingId); return n; });
    }
  };

  const hasActiveFilters = minPrice || maxPrice || sortBy !== 'newest' || showVerifiedOnly;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-12 space-y-8">
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="max-w-3xl mx-auto relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-300 group-focus-within:text-teal-500 transition-colors pointer-events-none">
            <Search size={20} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search across the islands…"
            className="input-island h-14 pl-12 pr-12 shadow-card"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); handleCategorySelect('all'); }} type="button" title="Clear search" aria-label="Clear search" className="absolute right-4 top-1/2 -translate-y-1/2 text-warm-300 hover:text-midnight-700 transition-colors">
              <X size={18} />
            </button>
          )}
        </form>

        {/* Category + Filter/Sort Row */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 hide-scrollbar">
            {CATEGORIES.map(cat => {
              const isActive = cat.slug === 'all' ? !activeCategory : activeCategory === cat.slug;
              return (
                <button
                  key={cat.slug}
                  onClick={() => handleCategorySelect(cat.slug)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-[11px] font-bold transition-all duration-200 ${isActive
                    ? 'bg-teal-600 text-white shadow-teal-glow scale-105'
                    : 'bg-white text-warm-400 border border-warm-200 hover:border-teal-300 hover:text-teal-600'
                    }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Sort & Filter Controls */}
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-warm-200 text-xs font-bold text-midnight-700 hover:border-teal-300 transition-all shadow-card"
              >
                <ArrowUpDown size={13} className="text-teal-500" />
                <span>{SORT_LABELS[sortBy]}</span>
                <ChevronDown size={13} className={`transition-transform text-warm-300 ${showSortDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showSortDropdown && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl border border-warm-200 shadow-card-hover z-30 overflow-hidden min-w-[210px] animate-fade-in">
                  {(Object.keys(SORT_LABELS) as SortOption[]).map(key => (
                    <button
                      key={key}
                      onClick={() => { setSortBy(key); setShowSortDropdown(false); }}
                      className={`w-full text-left px-5 py-3 text-xs font-bold transition-colors ${sortBy === key ? 'bg-teal-50 text-teal-700 font-black' : 'text-midnight-700 hover:bg-warm-50'
                        }`}
                    >
                      {SORT_LABELS[key]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filter Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all shadow-card ${hasActiveFilters
                ? 'bg-teal-50 border-teal-300 text-teal-700'
                : 'bg-white border-warm-200 text-midnight-700 hover:border-teal-300'
                }`}
            >
              <Filter size={13} className={hasActiveFilters ? 'text-teal-500' : 'text-warm-400'} />
              <span>Filters</span>
              {hasActiveFilters && <span className="w-2 h-2 bg-teal-500 rounded-full" />}
            </button>
          </div>

          {/* Price Filter Panel */}
          {showFilters && (
            <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-warm-200 shadow-card-hover p-5 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-heading font-bold text-midnight-700">Price Range</h4>
                <button onClick={() => setShowFilters(false)} title="Close filters" aria-label="Close filters" className="text-warm-300 hover:text-midnight-700 transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-warm-400 uppercase tracking-widest mb-1.5 block">Min (₹)</label>
                  <input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="0" className="input-island" />
                </div>
                <span className="text-warm-200 font-black mt-5">—</span>
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-warm-400 uppercase tracking-widest mb-1.5 block">Max (₹)</label>
                  <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Any" className="input-island" />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-warm-200 px-4 py-3">
                <div>
                  <p className="text-xs font-bold text-midnight-700">Verified Sellers Only</p>
                  <p className="text-[10px] text-warm-400">GPS-verified island residents</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showVerifiedOnly}
                  onClick={() => setShowVerifiedOnly(prev => !prev)}
                  aria-label="Toggle verified sellers only"
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showVerifiedOnly ? 'bg-teal-600' : 'bg-warm-200'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${showVerifiedOnly ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </div>
              <div className="flex gap-3">
                <button onClick={handleClearFilters} className="btn-secondary flex-1 text-sm py-2.5">Clear All</button>
                <button onClick={handleApplyPriceFilter} className="btn-primary flex-[2] text-sm py-2.5">Apply Filters</button>
              </div>
            </div>
          )}
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
        ) : listings.length === 0 ? (
          <div className="col-span-full py-24 text-center space-y-5 bg-warm-50 rounded-3xl border-2 border-dashed border-warm-200 animate-fade-in">
            <div className="text-5xl animate-float">🏝️</div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-heading font-bold text-midnight-700">{COPY.EMPTY_STATE.NO_SEARCH_RESULTS}</h3>
              <p className="text-warm-400 text-sm max-w-xs mx-auto">{COPY.EMPTY_STATE.NO_LISTINGS}</p>
            </div>
            <button onClick={handleClearFilters} className="btn-primary text-sm py-2.5">Clear Filters</button>
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
