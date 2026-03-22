import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Heart, 
  MessageSquare, 
  MapPin, 
  Clock, 
  Shield, 
  ChevronLeft, 
  Share2, 
  Flag,
  Rocket,
  Facebook,
  MessageCircle,
  Copy,
  Loader2,
  AlertCircle,
  Star
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { collection, doc, getDoc, getDocs, addDoc, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { getCurrentUserId } from '../lib/auth';
import { getListing, subscribeToListing } from '../lib/database';
import { ReportModal } from '../components/ReportModal';
import { TrustBadge } from '../components/TrustBadge';
import { TrustCard } from '../components/TrustCard';
import { BoostBadge } from '../components/BoostBadge';
import { UrgentBadge } from '../components/UrgentBadge';
import { Profile } from '../types';
import { Listing } from '../lib/database';
import { useToast } from '../components/Toast';
import { COPY } from '../lib/localCopy';
import { BoostListingModal } from '../components/BoostListingModal';
import { Seo } from '../components/Seo';
import { WhatsAppShare } from '../components/WhatsAppShare';

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

  const shareLink = window.location.href;
  const fbText = listing ? COPY.SHARING.FB_GROUP_TEMPLATE(listing.title, listing.price, listing.city, shareLink) : '';

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied!`, 'success');
  };

  const fetchListingDetails = async () => {
    try {
      if (!id) return;

      const userId = await getCurrentUserId();
      setCurrentUserId(userId);

      // 1. Fetch listing using new database layer
      const listingData = await getListing(id);
      if (!listingData) {
        navigate('/404');
        return;
      }
      
      setListing(listingData);

      // 2. Fetch seller profile from Firestore
      if (listingData.userId) {
        const sellerSnap = await getDoc(doc(db, 'users', listingData.userId));
        if (sellerSnap.exists()) setSeller(sellerSnap.data() as any);
      }

      // 3. Check if favorited
      if (userId) {
        const favQ = query(
          collection(db, 'favorites'),
          where('userId', '==', userId),
          where('listingId', '==', id)
        );
        const favSnap = await getDocs(favQ);
        setIsFavorited(!favSnap.empty);
      }

    } catch (error) {
      console.error('Error fetching listing details:', error);
      navigate('/404');
    } finally {
      setLoading(false);
    }
  };

  const checkFavoriteStatus = async () => {
    try {
      const userId = await getCurrentUserId();
      if (!userId || !id) return;

      const favQ = query(
        collection(db, 'favorites'),
        where('userId', '==', userId),
        where('listingId', '==', id)
      );
      const favSnap = await getDocs(favQ);
      setIsFavorited(!favSnap.empty);
    } catch (error) {
      console.error("Error checking favorite status:", error);
    }
  };

  const toggleFavorite = async () => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        showToast('Please login to favorite listings', 'error');
        return;
      }
      if (!id) return;

      if (isFavorited) {
        const favQ = query(
          collection(db, 'favorites'),
          where('userId', '==', userId),
          where('listingId', '==', id)
        );
        const favSnap = await getDocs(favQ);
        await Promise.all(favSnap.docs.map(d => deleteDoc(d.ref)));
        setIsFavorited(false);
        showToast('Removed from favorites', 'success');
      } else {
        await addDoc(collection(db, 'favorites'), {
          userId,
          listingId: id,
          createdAt: serverTimestamp(),
        });
        setIsFavorited(true);
        showToast('Added to favorites', 'success');
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      showToast('An error occurred', 'error');
    }
  };

  const shareListing = () => {
    if (navigator.share) {
      navigator.share({
        title: listing?.title,
        text: listing?.description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('Link copied to clipboard', 'success');
    }
  };

  const contactSeller = () => {
    if (!currentUserId) {
      showToast('Please login to contact seller', 'error');
      return;
    }
    navigate(`/chat/${id}`);
  };

  useEffect(() => {
    fetchListingDetails();
    checkFavoriteStatus();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const unsubscribe = subscribeToListing(id, (updatedListing) => {
      if (updatedListing) {
        setListing(updatedListing);
      } else {
        navigate('/404');
      }
    });

    return unsubscribe;
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading listing details...</p>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Listing Not Found</h2>
          <p className="text-gray-600 mb-4">This listing may have been removed or is no longer available.</p>
          <Link to="/" className="text-blue-600 hover:text-blue-700 font-medium">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Seo 
        title={`${listing.title} | AndamanBazaar`}
        description={listing.description}
      />
      
      <div className="min-h-screen bg-warm-50 pb-20">
        {/* Navigation Header */}
        <div className="bg-white border-b border-warm-200 sticky top-0 z-30">
          <div className="app-container">
            <div className="h-16 flex items-center justify-between">
              <div className="flex items-center">
                <Link
                  to="/"
                  className="p-2 rounded-full bg-white/90 backdrop-blur-sm text-midnight-700 shadow-sm"
                >
                  <ChevronLeft size={20} />
                </Link>
                {listing.is_urgent && (
                  <UrgentBadge size="md" className="ml-2" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsReportModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase tracking-widest text-warm-400 hover:text-red-600 transition-colors"
                >
                  <Flag size={14} /> Report
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="app-container pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Images & Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Product Info Card */}
              <div className="bg-white rounded-3xl p-6 md:p-8 space-y-6 shadow-sm border border-warm-200">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {listing.is_official && <TrustBadge level="official" size="md" />}
                    <span className="bg-teal-50 text-teal-700 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-teal-100">
                      Only Andaman Sellers Allowed
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex flex-col gap-2">
                      <h1 className="text-3xl md:text-4xl font-heading font-black text-midnight-700 leading-tight">
                        {listing.title}
                      </h1>
                      {(listing as any).isBoosted && (listing as any).boostTier && (
                        <div>
                          <BoostBadge tier={(listing as any).boostTier} size="md" />
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-teal-600">₹{listing.price.toLocaleString()}</p>
                      {listing.is_negotiable && (
                        <p className="text-[10px] font-bold text-warm-400 uppercase tracking-widest mt-1">Price Negotiable</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-warm-500">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <MapPin size={18} className="text-teal-600" />
                      {listing.city}{listing.area ? `, ${listing.area}` : ''}
                    </div>
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <Clock size={18} className="text-teal-600" />
                      {listing.createdAt.toDate().toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap">{listing.description}</p>
                </div>

                {/* Category and Tags */}
                <div className="mt-6 flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {listing.category}
                  </span>
                  {listing.isFeatured && (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm flex items-center">
                      <Star className="w-3 h-3 mr-1" />
                      Featured
                    </span>
                  )}
                </div>
              </div>

              {/* Share Locally Section */}
              <div className="bg-white rounded-3xl p-6 md:p-8 space-y-6 shadow-sm border border-warm-200">
                <div className="flex items-center gap-3">
                  <div className="bg-teal-50 p-3 rounded-2xl">
                    <Share2 className="text-teal-600 w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-midnight-700 uppercase tracking-tight">Share Locally</h3>
                    <p className="text-xs font-bold text-warm-400 uppercase tracking-widest">Post this deal to your groups</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* WhatsApp Share */}
                  <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-700">
                        <MessageCircle size={20} />
                        <span className="font-black text-xs uppercase tracking-widest">WhatsApp Feed</span>
                      </div>
                      <button 
                        onClick={() => copyToClipboard(whatsappText, 'WhatsApp template')}
                        className="text-emerald-600 hover:text-emerald-800 transition-colors"
                        title="Copy template"
                        aria-label="Copy WhatsApp message template"
                      >
                        <Copy size={18} />
                      </button>
                    </div>
                    <p className="text-[11px] text-emerald-800/70 font-medium leading-relaxed italic">
                      Send to your friends or travel group instantly via WhatsApp.
                    </p>
                    <WhatsAppShare url={shareLink} title={listing.title} />
                  </div>

                  {/* Facebook Share */}
                  <div className="p-5 rounded-2xl bg-blue-50 border border-blue-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-blue-700">
                        <Facebook size={20} />
                        <span className="font-black text-xs uppercase tracking-widest">FB Group Post</span>
                      </div>
                      <button 
                        onClick={() => copyToClipboard(fbText, 'FB template')}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title="Copy template"
                        aria-label="Copy Facebook post template"
                      >
                        <Copy size={18} />
                      </button>
                    </div>
                    <p className="text-[11px] text-blue-800/70 font-medium line-clamp-3 italic">
                      "{fbText.substring(0, 100)}..."
                    </p>
                    <button 
                      onClick={() => copyToClipboard(fbText, 'FB post text')}
                      className="w-full py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                    >
                      Copy for FB Group
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Seller & Actions */}
            <div className="space-y-6">
              {/* Floating Price Card for Mobile */}
              <div className="bg-white rounded-3xl p-6 shadow-xl border border-warm-200 space-y-4 sticky top-24">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-gray-500">Listing Price</p>
                  <p className="text-4xl font-extrabold text-teal-600">
                    ₹{listing.price.toLocaleString()}
                  </p>
                </div>

                <button
                  onClick={contactSeller}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center shadow-lg active:scale-95 transition-all"
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Chat with Seller
                </button>
              </div>

              {/* Seller Info */}
              {seller && (
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-warm-200">
                  <h3 className="text-lg font-bold text-midnight-700 mb-3 px-1">Meet the Seller</h3>
                  <TrustCard seller={seller} />
                </div>
              )}

              {/* Action Buttons */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-warm-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
                
                <div className="space-y-3">
                  {currentUserId !== listing.userId ? (
                    <>
                      <button
                        onClick={contactSeller}
                        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center"
                      >
                        <MessageSquare className="w-5 h-5 mr-2" />
                        Contact Seller
                      </button>
                      
                      <button
                        onClick={toggleFavorite}
                        className={`w-full px-4 py-3 rounded-lg flex items-center justify-center ${
                          isFavorited
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                        }`}
                      >
                        <Heart className={`w-5 h-5 mr-2 ${isFavorited ? 'fill-current' : ''}`} />
                        {isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsBoostModalOpen(true)}
                      className="w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold hover:shadow-lg flex items-center justify-center transition-all"
                    >
                      <Rocket className="w-5 h-5 mr-2" />
                      {(listing as any).isBoosted ? 'Extend Boost' : 'Boost This Listing'}
                    </button>
                  )}
                </div>
              </div>

              {/* Safety Tips */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Safety Tips
                </h3>
                
                <ul className="space-y-2 text-sm text-blue-800">
                  <li>• Meet in a public place for transactions</li>
                  <li>• Inspect the item before paying</li>
                  <li>• Use secure payment methods</li>
                  <li>• Verify the seller's location</li>
                  <li>• Trust your instincts</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ReportModal 
        isOpen={isReportModalOpen} 
        onClose={() => setIsReportModalOpen(false)} 
        listingId={id || ''} 
        listingTitle={listing.title} 
      />
      <BoostListingModal
        isOpen={isBoostModalOpen}
        onClose={() => setIsBoostModalOpen(false)}
        listingId={listing.id}
        listingTitle={listing.title}
      />
    </>
  );
};
