import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  orderBy,
} from "firebase/firestore";
import { TrustBadge } from "../components/TrustBadge";
import { useToast } from "../components/Toast";
import { Seo } from "../components/Seo";
import {
  MapPin,
  Mail,
  Phone,
  Calendar,
  Star,
  Package,
  Heart,
  MessageCircle,
  ChevronLeft,
  User,
  Shield,
} from "lucide-react";

interface SellerProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  phone: string | null;
  email: string;
  trust_level: "newbie" | "verified" | "legend";
  created_at: string;
  stats: {
    total_listings: number;
    active_listings: number;
    sold_listings: number;
    avg_response_time: string;
  };
}

interface Listing {
  id: string;
  title: string;
  price: number;
  city: string;
  created_at: string;
  images: { image_url: string }[];
  status: "active" | "sold";
  views_count: number;
}

export const SellerProfile: React.FC = () => {
  const { sellerId } = useParams<{ sellerId: string }>();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [activeTab, setActiveTab] = useState<"active" | "sold">("active");

  useEffect(() => {
    if (sellerId) {
      fetchSellerProfile();
      fetchSellerListings();
    }
  }, [sellerId]);

  const fetchSellerProfile = async () => {
    try {
      const profileSnap = await getDoc(doc(db, "users", sellerId!));
      if (!profileSnap.exists()) throw new Error("Seller not found");
      const profile = profileSnap.data();

      const listingsSnap = await getDocs(
        query(collection(db, "listings"), where("userId", "==", sellerId)),
      );
      const listingsData = listingsSnap.docs.map((d) => d.data());

      const stats = {
        total_listings: listingsData.length,
        active_listings: listingsData.filter((l) => l.status === "active")
          .length,
        sold_listings: listingsData.filter((l) => l.status === "sold").length,
        avg_response_time: "Usually responds within 2 hours",
      };

      setSeller({
        id: profileSnap.id,
        full_name: profile.name || "Island Seller",
        avatar_url: profile.profilePhotoUrl || null,
        bio: profile.bio || null,
        location: profile.city || null,
        phone: profile.phoneNumber || null,
        email: profile.email || "",
        trust_level: profile.trustLevel || "newbie",
        created_at:
          profile.createdAt?.toDate?.()?.toISOString() ||
          new Date().toISOString(),
        stats,
      });
    } catch (error) {
      console.error("Error fetching seller profile:", error);
      showToast("Seller not found", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchSellerListings = async () => {
    try {
      const snap = await getDocs(
        query(
          collection(db, "listings"),
          where("userId", "==", sellerId),
          orderBy("createdAt", "desc"),
        ),
      );
      const data = snap.docs.map((d) => {
        const l = d.data();
        return {
          id: d.id,
          title: l.title,
          price: l.price,
          city: l.city,
          created_at: l.createdAt?.toDate?.()?.toISOString() || "",
          status: l.status,
          views_count: l.viewsCount || 0,
          images: (l.imageUrls || []).map((url: string) => ({
            image_url: url,
          })),
        } as Listing;
      });
      setListings(data);
    } catch (error) {
      console.error("Error fetching seller listings:", error);
    }
  };

  const filteredListings = listings.filter((listing) =>
    activeTab === "active"
      ? listing.status === "active"
      : listing.status === "sold",
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-midnight-800 mb-2">
            Seller Not Found
          </h2>
          <p className="text-warm-600 mb-4">
            This seller profile doesn't exist or has been removed.
          </p>
          <Link to="/listings" className="btn-primary">
            Browse Listings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Seo
        title={`${seller.full_name}'s Profile`}
        description={`View all listings from ${seller.full_name}, a seller based in ${seller.location || "the Andaman Islands"}.`}
        imageUrl={seller.avatar_url || undefined}
      />
      <div className="min-h-screen bg-warm-50">
        {/* Header */}
        <div className="bg-white border-b border-warm-200">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <Link
              to="/listings"
              className="inline-flex items-center gap-2 text-warm-600 hover:text-warm-800 transition-colors mb-4"
            >
              <ChevronLeft size={20} />
              Back to Listings
            </Link>

            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-warm-100 border-4 border-white shadow-lg">
                  {seller.avatar_url ? (
                    <img
                      src={seller.avatar_url}
                      alt={seller.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-500 to-ocean-600">
                      <User size={40} className="text-white" />
                    </div>
                  )}
                </div>
              </div>

              {/* Seller Info */}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <h1 className="text-2xl font-bold text-midnight-800">
                    {seller.full_name}
                  </h1>
                  <TrustBadge level={seller.trust_level} size="md" />
                </div>

                <p className="text-warm-600 mb-4">
                  Member since{" "}
                  {new Date(seller.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                  })}
                </p>

                {seller.bio && (
                  <p className="text-midnight-700 mb-4">{seller.bio}</p>
                )}

                {/* Contact Info */}
                <div className="flex flex-wrap gap-4 text-sm">
                  {seller.location && (
                    <div className="flex items-center gap-1 text-warm-600">
                      <MapPin size={16} />
                      {seller.location}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-warm-600">
                    <Mail size={16} />
                    {seller.email}
                  </div>
                  {seller.phone && (
                    <div className="flex items-center gap-1 text-warm-600">
                      <Phone size={16} />
                      {seller.phone}
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex-shrink-0">
                <div className="bg-warm-50 rounded-xl p-4 space-y-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-midnight-800">
                      {seller.stats.total_listings}
                    </div>
                    <div className="text-xs text-warm-600 uppercase tracking-wider">
                      Total Listings
                    </div>
                  </div>
                  <div className="flex gap-4 text-center">
                    <div>
                      <div className="text-lg font-bold text-teal-600">
                        {seller.stats.active_listings}
                      </div>
                      <div className="text-xs text-warm-600">Active</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-coral-500">
                        {seller.stats.sold_listings}
                      </div>
                      <div className="text-xs text-warm-600">Sold</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Listings Section */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Tabs */}
          <div className="flex gap-4 mb-6 border-b border-warm-200">
            <button
              onClick={() => setActiveTab("active")}
              className={`pb-3 px-1 font-medium text-sm transition-colors border-b-2 ${
                activeTab === "active"
                  ? "text-teal-600 border-teal-600"
                  : "text-warm-500 border-transparent hover:text-warm-700"
              }`}
            >
              Active Listings ({seller.stats.active_listings})
            </button>
            <button
              onClick={() => setActiveTab("sold")}
              className={`pb-3 px-1 font-medium text-sm transition-colors border-b-2 ${
                activeTab === "sold"
                  ? "text-teal-600 border-teal-600"
                  : "text-warm-500 border-transparent hover:text-warm-700"
              }`}
            >
              Sold Items ({seller.stats.sold_listings})
            </button>
          </div>

          {/* Listings Grid */}
          {filteredListings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredListings.map((listing) => (
                <Link
                  key={listing.id}
                  to={`/listings/${listing.id}`}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
                >
                  <div className="aspect-square bg-warm-100 relative overflow-hidden">
                    {listing.images && listing.images.length > 0 ? (
                      <img
                        src={listing.images[0].image_url}
                        alt={listing.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-warm-100">
                        <Package size={40} className="text-warm-300" />
                      </div>
                    )}

                    {/* Status Badge */}
                    <div
                      className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold ${
                        listing.status === "active"
                          ? "bg-teal-100 text-teal-700"
                          : "bg-warm-100 text-warm-700"
                      }`}
                    >
                      {listing.status === "active" ? "Available" : "Sold"}
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-midnight-800 mb-2 line-clamp-2 group-hover:text-teal-600 transition-colors">
                      {listing.title}
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-lg text-teal-600">
                        ₹{listing.price.toLocaleString("en-IN")}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-warm-500">
                        <MapPin size={12} />
                        {listing.city}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-warm-500">
                      <div className="flex items-center gap-1">
                        <Star size={12} />
                        {listing.views_count} views
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(listing.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package size={48} className="text-warm-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-midnight-800 mb-2">
                No {activeTab} listings
              </h3>
              <p className="text-warm-600">
                {activeTab === "active"
                  ? "This seller doesn't have any active listings right now."
                  : "This seller hasn't sold any items yet."}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
