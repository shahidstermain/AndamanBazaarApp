
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ReportModal } from '../components/ReportModal';
import { TrustBadge } from '../components/TrustBadge';
import { Listing, Profile } from '../types';
import { MapPin, Shield, Share2, MessageSquare, Heart, ChevronLeft, AlertCircle, Edit3, Loader2, Tag, Clock, ShieldCheck, Package, Phone, MessageCircle, BadgeCheck, Rocket, Star } from 'lucide-react';
import { useToast } from '../components/Toast';
import { BoostListingModal } from '../components/BoostListingModal';
import { COPY } from '../lib/localCopy';

export const ListingDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [listing, setListing] = useState<Listing | null>(null);
  const [seller, setSeller] = useState<Profile | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isBoostModalOpen, setIsBoostModalOpen] = useState(false);
  const [similarListings, setSimilarListings] = useState<any[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const { showToast } = useToast();

  const incrementViews = async () => {
    if (!id) return;
    try {
      await supabase.rpc('increment_listing_views', { listing_id: id });
    } catch (err) {
      console.warn("Failed to increment views:", err);
    }
  };

  const fetchListingDetails = async () => {
    try {
      if (!id) return;

      const { data: userData, error: userError } = await (supabase.auth as any).getUser();
      const user = userData?.user;
      if (userError) {
        console.warn("Error getting user:", userError);
      }
      setCurrentUserId(user?.id || null);

      // 1. Fetch basic listing data without joins
      const { data: listingData, error: listingError } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (listingError) throw listingError;
      if (!listingData) {
        setListing(null);
        return;
      }

      // 2. Fetch images separately
      const { data: imagesData } = await supabase
        .from('listing_images')
        .select('*')
        .eq('listing_id', id)
        .order('display_order', { ascending: true });

      const fullListing = {
        ...listingData,
        images: imagesData || []
      };

      setListing(fullListing);

      // 3. Fetch seller separately
      if (listingData.user_id) {
        const { data: sellerData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', listingData.user_id)
          .single();
        if (sellerData) setSeller(sellerData);
      }

    } catch (err) {
      console.error("Error fetching listing:", err);
    } finally {
      setLoading(false);
    }
  };

  const checkFavoriteStatus = async () => {
    try {
      const { data: userData, error: userError } = await (supabase.auth as any).getUser();
      const user = userData?.user;
      if (userError) {
        console.warn("Error getting user:", userError);
      }
      if (!user || !id) return;

      const { data } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('listing_id', id)
        .single();

      setIsFavorited(!!data);
    } catch (err) {
      console.error("Error checking favorite:", err);
    }
  };

  const toggleFavorite = async () => {
    try {
      const { data: userData, error: userError } = await (supabase.auth as any).getUser();
      const user = userData?.user;
      if (userError) {
        console.warn("Error getting user:", userError);
      }
      if (!user) {
        showToast('Sign in to save items to your favorites.', 'info');
        return;
      }
      if (!id) return;

      if (isFavorited) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('listing_id', id);

        if (error) {
          showToast('Failed to remove from favorites', 'error');
          return;
        }
        setIsFavorited(false);
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({ user_id: user.id, listing_id: id });

        if (error) {
          showToast('Failed to add to favorites', 'error');
          return;
        }
        setIsFavorited(true);
      }
    } catch (err) {
      console.error("Error toggling favorite:", err);
    }
  };

  const fetchSimilarListings = useCallback(async () => {
    if (!id || !listing?.category_id) return;
    setLoadingSimilar(true);
    try {
      const { data } = await supabase
        .from('listings')
        .select('id, title, price, city, created_at, is_featured, views_count, images:listing_images(image_url)')
        .eq('category_id', listing.category_id)
        .eq('status', 'active')
        .neq('id', id)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(6);
      
      setSimilarListings(data || []);
    } catch (err) {
      console.warn('Failed to fetch similar listings:', err);
    } finally {
      setLoadingSimilar(false);
    }
  }, [id, listing?.category_id]);

  useEffect(() => {
    const loadData = async () => {
      await fetchListingDetails();
      await checkFavoriteStatus();
      incrementViews();
    };
    
    loadData();
  }, [id]);

  useEffect(() => {
    if (listing?.category_id) {
      fetchSimilarListings();
    }
  }, [listing?.category_id, id, fetchSimilarListings]);

  const handleWhatsAppShare = () => {
    if (!listing) return;
    const text = encodeURIComponent(
      `${listing.title} — ₹${listing.price.toLocaleString('en-IN')}\n${window.location.href}${window.location.href.includes('?') ? '&' : '?'}utm_source=whatsapp&utm_medium=share`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener');
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareTitle = listing?.title || 'AndamanBazaar Listing';
    const shareText = `Check out this ${listing?.title} on AndamanBazaar!`;

    try {
      if (navigator.share) {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareUrl);
        showToast(COPY.TOAST.SAVE_SUCCESS, 'success');
      }
    } catch (err: any) {
      // User cancelled share dialog, or share failed — copy to clipboard as fallback
      if (err?.name !== 'AbortError' && err?.message !== 'Share canceled') {
        try {
          await navigator.clipboard.writeText(shareUrl);
          showToast(COPY.TOAST.SAVE_SUCCESS, 'success');
        } catch {
          showToast('Could not copy link.', 'error');
        }
      }
    }
  };

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="aspect-[4/3] skeleton rounded-3xl" />
          <div className="h-8 skeleton w-3/4 rounded-xl" />
          <div className="h-12 skeleton w-1/4 rounded-xl" />
          <div className="space-y-3">
            <div className="h-4 skeleton w-full rounded" />
            <div className="h-4 skeleton w-5/6 rounded" />
            <div className="h-4 skeleton w-4/6 rounded" />
          </div>
        </div>
        <div className="skeleton h-64 rounded-3xl" />
      </div>
    </div>
  );

  if (!listing) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-6 p-4 text-center">
      <div className="text-6xl animate-float">🏝️</div>
      <h2 className="text-2xl font-heading font-bold text-midnight-700">Item Not Found</h2>
      <p className="text-warm-400 text-sm">This listing may have been removed or sold.</p>
      <Link to="/listings" className="btn-primary">Back to Market</Link>
    </div>
  );

  const mainImage = listing.images && listing.images.length > 0
    ? listing.images[activeImage]?.image_url
    : `https://picsum.photos/seed/item-det-${id}/1000/750`;

  const images = listing.images && listing.images.length > 0
    ? listing.images
    : [{ image_url: mainImage, id: 'default' }];

  const handleMarkAsSold = async () => {
    if (!id || !isOwner) {
      showToast('You can only mark your own listings as sold.', 'error');
      return;
    }
    try {
      const { error } = await supabase
        .from('listings')
        .update({ status: 'sold' })
        .eq('id', id);

      if (error) throw error;
      setListing(prev => prev ? { ...prev, status: 'sold' } : null);
      showToast('Listing marked as sold!', 'success');
    } catch (err) {
      console.error("Error marking as sold:", err);
      showToast('Failed to update listing status', 'error');
    }
  };

  const isOwner = currentUserId === listing.user_id;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-slide-up">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Gallery & Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Main Image */}
          <div className="relative group">
            <div className="aspect-[4/3] bg-warm-100 rounded-3xl overflow-hidden shadow-card border border-warm-200">
              <img src={mainImage} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt={listing.title} loading="eager" />
            </div>

            <button
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className="absolute top-4 left-4 w-11 h-11 bg-white/90 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-glass border border-white/50 active:scale-95 transition-transform z-10 text-midnight-700"
            >
              <ChevronLeft size={24} strokeWidth={2.5} />
            </button>

            <div className="absolute top-4 right-4 flex flex-col gap-2">
              <button
                onClick={toggleFavorite}
                aria-label={isFavorited ? 'Remove from favourites' : 'Save to favourites'}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-glass border border-white/50 transition-all z-10 ${isFavorited ? 'bg-coral-500 text-white' : 'bg-white/90 backdrop-blur-sm text-warm-400'
                  }`}
              >
                <Heart fill={isFavorited ? 'currentColor' : 'none'} size={20} strokeWidth={2.5} />
              </button>
              <button
                onClick={handleWhatsAppShare}
                aria-label="Share on WhatsApp"
                className="w-11 h-11 bg-green-500 rounded-2xl flex items-center justify-center shadow-glass border border-green-400/50 text-white z-10 hover:bg-green-600 transition-colors"
              >
                <MessageSquare size={20} strokeWidth={2.5} />
              </button>
              <button
                onClick={handleShare}
                aria-label="Share listing"
                className="w-11 h-11 bg-white/90 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-glass border border-white/50 text-warm-400 z-10 hover:text-teal-600 transition-colors"
              >
                <Share2 size={20} strokeWidth={2.5} />
              </button>
            </div>

            {images.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1 hide-scrollbar">
                {images.map((img: any, idx: number) => (
                  <button
                    key={img.id || idx}
                    onClick={() => setActiveImage(idx)}
                    aria-label={`View photo ${idx + 1}`}
                    className={`flex-shrink-0 w-18 h-18 rounded-xl overflow-hidden border-2 transition-all w-[72px] h-[72px] ${activeImage === idx ? 'border-teal-500 scale-95 shadow-teal-glow' : 'border-warm-200'
                      }`}
                  >
                    <img src={img.image_url} className="w-full h-full object-cover" alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-8">
            {/* Sold Banner */}
            {listing.status === 'sold' && (
              <div className="bg-coral-50 border border-coral-200 rounded-2xl p-4 flex items-center gap-3">
                <BadgeCheck size={20} className="text-coral-600 flex-shrink-0" />
                <span className="font-bold text-coral-700 text-sm">This item has already been sold</span>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-teal-50 text-teal-700 text-[10px] font-bold px-3 py-1.5 rounded-full border border-teal-100 uppercase tracking-wider">
                  {listing.category_id || 'Item'}
                </span>
                <span className="bg-warm-100 text-midnight-700 text-[10px] font-bold px-3 py-1.5 rounded-full border border-warm-200 uppercase tracking-wider">
                  {listing.condition?.replace('_', ' ') || 'Good'}
                </span>
                {listing.is_negotiable && (
                  <span className="bg-sandy-50 text-sandy-700 text-[10px] font-bold px-3 py-1.5 rounded-full border border-sandy-200 uppercase tracking-wider">
                    Negotiable
                  </span>
                )}
                {listing.is_featured && (
                  <span className="bg-gradient-to-r from-amber-400 to-amber-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                    <Star size={10} fill="currentColor" /> Featured
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-4xl font-heading font-black text-midnight-700 tracking-tight leading-tight">
                {listing.title}
              </h1>
              <div className="flex items-baseline gap-4">
                <span className="text-3xl md:text-4xl font-heading font-black text-teal-600">
                  ₹{listing.price.toLocaleString('en-IN')}
                </span>
                {listing.is_negotiable && listing.min_price && (
                  <span className="text-sm font-bold text-warm-400">
                    Min ₹{listing.min_price.toLocaleString('en-IN')}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-heading font-bold text-midnight-700">Description</h3>
              <p className="text-midnight-700/80 text-base leading-relaxed max-w-2xl whitespace-pre-wrap">
                {listing.description}
              </p>
            </div>

            {/* Item Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'City', value: listing.city, icon: <MapPin size={13} /> },
                { label: 'Area', value: listing.area || 'N/A', icon: <MapPin size={13} /> },
                { label: 'Views', value: `${listing.views_count || 0} views`, icon: null },
                ...(listing.item_age ? [{ label: 'Age', value: listing.item_age.replace('_', ' '), icon: <Clock size={13} /> }] : []),
              ].map(spec => (
                <div key={spec.label} className="p-4 bg-white rounded-2xl border border-warm-200 shadow-card flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-warm-400 uppercase tracking-widest flex items-center gap-1">
                    {spec.icon}{spec.label}
                  </span>
                  <span className="font-bold text-midnight-700 text-sm capitalize">{spec.value}</span>
                </div>
              ))}
            </div>

            {/* Warranty & Accessories */}
            {(listing.has_warranty || listing.has_invoice || (listing.accessories && listing.accessories.length > 0)) && (
              <div className="space-y-3">
                <h3 className="text-base font-heading font-bold text-midnight-700">Extras & Warranty</h3>
                <div className="flex flex-wrap gap-2">
                  {listing.has_warranty && (
                    <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-2 rounded-xl border border-emerald-200 text-xs font-bold">
                      <ShieldCheck size={14} />
                      Warranty{listing.warranty_expiry ? ` until ${new Date(listing.warranty_expiry).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}` : ''}
                    </div>
                  )}
                  {listing.has_invoice && (
                    <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-xl border border-blue-200 text-xs font-bold">
                      <Package size={14} /> Original Invoice
                    </div>
                  )}
                  {listing.accessories && listing.accessories.map((acc: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 bg-warm-100 text-midnight-700 px-3 py-2 rounded-xl border border-warm-200 text-xs font-bold">
                      <Tag size={12} />{acc}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contact Preferences */}
            {listing.contact_preferences && (
              <div className="space-y-3">
                <h3 className="text-base font-heading font-bold text-midnight-700">Contact Preferences</h3>
                <div className="flex flex-wrap gap-2">
                  {listing.contact_preferences.chat && (
                    <Link to={isOwner ? '#' : `/chats/${listing.id}`} className={`flex items-center gap-2 bg-teal-50 text-teal-700 px-3 py-2 rounded-xl border border-teal-100 text-xs font-bold ${!isOwner && 'hover:bg-teal-100 transition-colors'}`}>
                      <MessageCircle size={14} /> In-App Chat
                    </Link>
                  )}
                  {listing.contact_preferences.phone && seller?.phone_number && (
                    <a href={`tel:${seller.phone_number}`} className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-2 rounded-xl border border-emerald-100 text-xs font-bold hover:bg-emerald-100 transition-colors">
                      <Phone size={14} /> Call {seller.phone_number}
                    </a>
                  )}
                  {listing.contact_preferences.whatsapp && seller?.phone_number && (
                    <a href={`https://wa.me/${seller.phone_number.replace(/\D/g, '')}?text=Hi, I saw your listing for ${listing.title} on AndamanBazaar.`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-xl border border-green-100 text-xs font-bold hover:bg-green-100 transition-colors">
                      <MessageSquare size={14} /> WhatsApp
                    </a>
                  )}
                </div>
              </div>
            )}
            {/* Similar Listings */}
            {similarListings.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-warm-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-heading font-bold text-midnight-700">You might also like</h3>
                  <Link to={`/listings?category=${listing.category_id}`} className="text-sm font-bold text-teal-600 hover:text-teal-700">
                    See all
                  </Link>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
                  {similarListings.map((item: any) => (
                    <Link
                      key={item.id}
                      to={`/listings/${item.id}`}
                      className="flex-shrink-0 w-48 bg-white rounded-2xl border border-warm-200 shadow-card overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      <div className="aspect-square bg-warm-100 relative">
                        <img
                          src={item.images?.[0]?.image_url || `https://picsum.photos/seed/${item.id}/400/400`}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {item.is_featured && (
                          <span className="absolute top-2 right-2 px-2 py-0.5 bg-amber-400 text-white text-[10px] font-bold rounded-full">
                            Featured
                          </span>
                        )}
                      </div>
                      <div className="p-3 space-y-1">
                        <h4 className="font-bold text-midnight-700 text-sm line-clamp-1">{item.title}</h4>
                        <p className="text-teal-600 font-bold text-sm">₹{item.price?.toLocaleString('en-IN')}</p>
                        <p className="text-warm-400 text-xs flex items-center gap-1">
                          <MapPin size={10} /> {item.city}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Seller Card */}
        <div className="lg:sticky lg:top-28 space-y-5">
          <div className="bg-white rounded-3xl p-6 shadow-card border border-warm-200 space-y-5">
            <div className="flex items-center gap-4 pb-5 border-b border-warm-200">
              <div className="w-14 h-14 rounded-2xl bg-warm-100 border-2 border-warm-200 overflow-hidden flex-shrink-0">
                <img
                  src={seller?.profile_photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${seller?.id || 'User'}`}
                  alt="Seller"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="font-heading font-black text-midnight-700 text-base leading-none">
                    {seller?.name || seller?.email?.split('@')[0] || 'Seller'}
                  </h4>
                  {seller?.is_location_verified && (
                    <span className="w-5 h-5 bg-teal-600 text-white rounded-full flex items-center justify-center text-[10px]" title="Island Verified">✓</span>
                  )}
                  {seller?.trust_level && seller.trust_level !== 'newbie' && (
                    <TrustBadge level={seller.trust_level} size="sm" showLabel={false} />
                  )}
                </div>
                <p className="text-[10px] font-bold text-warm-400 uppercase tracking-widest mt-1">
                  Member since {seller?.created_at ? new Date(seller.created_at).getFullYear() : '2024'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {isOwner ? (
                <div className="space-y-3">
                  <Link to={`/post?edit=${listing.id}`} className="btn-secondary w-full text-sm py-3 gap-2">
                    <Edit3 size={16} /> Edit My Listing
                  </Link>
                  {listing.status === 'active' && (
                    <>
                      <button
                        onClick={handleMarkAsSold}
                        className="w-full bg-warm-100 text-warm-500 font-bold py-3 px-6 rounded-2xl flex items-center justify-center gap-2 hover:bg-warm-200 active:scale-[0.98] transition-all text-sm"
                      >
                        <BadgeCheck size={16} /> Mark as Sold
                      </button>
                      <button
                        onClick={() => setIsBoostModalOpen(true)}
                        className="w-full bg-gradient-to-r from-coral-500 to-coral-600 text-white font-bold py-3 px-6 rounded-2xl shadow-lg shadow-coral-500/20 flex items-center justify-center gap-2 hover:from-coral-600 hover:to-coral-700 active:scale-[0.98] transition-all text-sm"
                      >
                        <Rocket size={16} />
                        {listing.is_featured ? 'Extend Boost' : 'Boost My Listing'}
                      </button>
                    </>
                  )}
                </div>
              ) : listing.status === 'sold' ? (
                <div className="w-full bg-warm-100 text-warm-400 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border border-warm-200 cursor-not-allowed">
                  <BadgeCheck size={16} /> Item Sold
                </div>
              ) : (
                <Link to={`/chats/${id}`} className="btn-primary w-full text-sm py-3 gap-2">
                  <MessageSquare size={16} /> Chat Now
                </Link>
              )}
            </div>
          </div>

          <button
            onClick={() => setIsReportModalOpen(true)}
            className="w-full py-3 text-[10px] font-bold text-warm-400 uppercase tracking-widest flex items-center justify-center gap-2 hover:text-coral-500 transition-colors"
          >
            <AlertCircle size={14} /> Report Listing
          </button>
        </div>
      </div>

      <ReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} listingId={id || ''} listingTitle={listing.title} />
      <BoostListingModal
        isOpen={isBoostModalOpen}
        onClose={() => setIsBoostModalOpen(false)}
        listingId={listing.id}
        listingTitle={listing.title}
      />
    </div >
  );
};
