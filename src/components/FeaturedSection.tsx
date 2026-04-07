import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, MapPin, Heart } from 'lucide-react';

// ============================================================
// FeaturedSection — premium horizontal showcase for featured listings
// Applied to listings with isFeatured=true, with golden accents
// ============================================================

interface FeaturedListing {
    id: string;
    title: string;
    price: number;
    city?: string;
    images?: { image_url: string }[];
    is_demo?: boolean;
}

interface FeaturedSectionProps {
    listings: FeaturedListing[];
    loading?: boolean;
    savedListings: Set<string>;
    onSave: (id: string, e: React.MouseEvent) => void;
}

const FeaturedCardSkeleton = () => (
    <div className="w-56 flex-shrink-0 rounded-3xl overflow-hidden bg-white border border-amber-100">
        <div className="aspect-[4/3] skeleton" />
        <div className="p-3 space-y-2">
            <div className="h-3 skeleton w-3/4" />
            <div className="h-4 skeleton w-1/3" />
        </div>
    </div>
);

export const FeaturedSection: React.FC<FeaturedSectionProps> = ({
    listings,
    loading = false,
    savedListings,
    onSave,
}) => {
    if (!loading && listings.length === 0) return null;

    return (
        <section className="px-4 mb-10">
            <div className="app-container">
                {/* Section header with golden accent */}
                <div className="section-header px-0 reveal">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-sm">
                            <Sparkles size={14} className="text-white" />
                        </div>
                        <div>
                            <h2 className="font-heading font-extrabold text-lg text-midnight-700 tracking-tight">
                                ✨ Featured
                            </h2>
                            <p className="text-[10px] text-amber-600 font-semibold uppercase tracking-widest">
                                Premium listings
                            </p>
                        </div>
                    </div>
                    <Link
                        to="/listings?featured=true"
                        className="section-link text-amber-600 hover:text-amber-700"
                    >
                        View all <ArrowRight size={14} />
                    </Link>
                </div>

                {/* Horizontal scrollable cards */}
                <div className="overflow-x-auto hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                    <div className="flex gap-4 w-max pb-2">
                        {loading
                            ? [1, 2, 3].map(n => <FeaturedCardSkeleton key={n} />)
                            : listings.map((listing) => {
                                const imageUrl = listing.images?.length
                                    ? listing.images[0].image_url
                                    : `https://picsum.photos/seed/${listing.id}/400/300`;
                                const saved = savedListings.has(listing.id);

                                return (
                                    <Link
                                        key={listing.id}
                                        to={listing.is_demo ? '#' : `/listings/${listing.id}`}
                                        className="w-56 flex-shrink-0 rounded-3xl overflow-hidden bg-white border border-amber-100/60 shadow-sm hover:shadow-lg hover:border-amber-200 transition-all duration-500 group"
                                    >
                                        <div className="relative aspect-[4/3] overflow-hidden">
                                            <img
                                                src={imageUrl}
                                                alt={listing.title}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                loading="lazy"
                                            />
                                            {/* Golden featured badge */}
                                            <div className="absolute top-2 left-2 inline-flex items-center gap-1 bg-gradient-to-r from-amber-400 to-amber-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
                                                <Sparkles size={8} />
                                                Featured
                                            </div>
                                            {listing.city && (
                                                <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1 text-[9px] font-bold text-midnight-700">
                                                    <MapPin size={8} className="text-ocean-600" />
                                                    {listing.city}
                                                </div>
                                            )}
                                            <button
                                                onClick={(e) => onSave(listing.id, e)}
                                                className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-glass transition-all ${saved ? 'bg-coral-500' : 'bg-white/90 backdrop-blur-sm'}`}
                                                aria-label={saved ? 'Unsave listing' : 'Save listing'}
                                            >
                                                <Heart size={12} className={saved ? 'text-white fill-white' : 'text-warm-400'} />
                                            </button>
                                        </div>
                                        <div className="p-3 space-y-1">
                                            <h3 className="text-xs font-semibold text-midnight-700 line-clamp-1">
                                                {listing.title}
                                            </h3>
                                            <span className="font-bold text-midnight-800 text-sm">
                                                ₹{listing.price?.toLocaleString('en-IN') ?? '0'}
                                            </span>
                                        </div>
                                    </Link>
                                );
                            })
                        }
                    </div>
                </div>
            </div>
        </section>
    );
};

export default FeaturedSection;
