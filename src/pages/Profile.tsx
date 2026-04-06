import React, { useState, useEffect, useRef } from 'react';
import { auth, db, storage } from '../lib/firebase';
import { collection, doc, getDoc, getDocs, query, where, orderBy, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Profile as ProfileType, Listing } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { ReportModal } from '../components/ReportModal';
import { Edit3, CheckCircle, Rocket, Share2, Trash2, MoreVertical, Heart, Globe, ShoppingBag, Calendar, Camera, Eye, Save, X, Loader2, MapPin, ShieldCheck, Award, LogOut, MessageCircle, Star, ArrowUpDown, RefreshCw } from 'lucide-react';
import { TrustBadge } from '../components/TrustBadge';
import { profileUpdateSchema, validateFileUpload, sanitizePlainText } from '../lib/validation';
import { logAuditEvent, sanitizeErrorMessage } from '../lib/security';
import { logout } from '../lib/auth';
import { useToast } from '../components/Toast';
import { BoostListingModal } from '../components/BoostListingModal';
import { BoostNudge } from '../components/BoostNudge';
import { COPY } from '../lib/localCopy';

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'sold' | 'saved'>('active');
  const [selectedForReport, setSelectedForReport] = useState<{ id: string, title: string } | null>(null);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  const [boostingListing, setBoostingListing] = useState<{ id: string, title: string } | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stats, setStats] = useState({ active: 0, sold: 0 });
  const menuRef = useRef<HTMLDivElement | null>(null);
  const PROFILE_PAGE_SIZE = 20;
  const [listingPage, setListingPage] = useState(0);
  const [hasMoreListings, setHasMoreListings] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const bypassAuth =
    import.meta.env.VITE_E2E_BYPASS_AUTH === 'true' ||
    new URLSearchParams(window.location.search).get('e2e') === '1';

  useEffect(() => {
    fetchProfileAndStats();
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setListings([]);
    setListingPage(0);
    setHasMoreListings(true);
    activeTab === 'saved' ? fetchSavedItems(0) : fetchUserListings(0);
    setActiveMenuId(null);
  }, [activeTab]);

  useEffect(() => {
    if (profile) {
      setEditName(profile.name || '');
      setEditCity(profile.city || '');
      setEditPhone(profile.phone_number || '');
      setAvatarPreview(profile.profile_photo_url || null);
    }
  }, [profile]);

  const fetchProfileAndStats = async () => {
    setLoading(true);
    try {
      if (bypassAuth) {
        setProfile({
          id: 'e2e-user',
          email: 'e2e@example.com',
          name: 'E2E User',
          city: 'Port Blair',
          is_location_verified: false,
          total_listings: 0,
          successful_sales: 0,
          trust_level: 'newbie',
          created_at: new Date().toISOString(),
        } as ProfileType);
        setStats({ active: 0, sold: 0 });
        return;
      }

      const user = auth.currentUser;
      if (!user) { navigate('/auth'); return; }

      const profileSnap = await getDoc(doc(db, 'users', user.uid));
      if (!profileSnap.exists()) throw new Error('Profile not found');
      setProfile({ id: profileSnap.id, ...profileSnap.data() } as any);

      const statsSnap = await getDocs(
        query(collection(db, 'listings'), where('userId', '==', user.uid))
      );
      const statsData = statsSnap.docs.map(d => d.data());

      const newStats = { active: 0, sold: 0 };
      statsData.forEach((l: any) => {
        if (l.status === 'active') newStats.active++;
        else if (l.status === 'sold') newStats.sold++;
      });
      setStats(newStats);
    } catch (err) {
      console.error('Error fetching data:', err);
      showToast('Could not load your profile data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const sanitizedName = sanitizePlainText(editName);
      const validationResult = profileUpdateSchema.safeParse({ name: sanitizedName, phone_number: sanitizePlainText(editPhone), city: sanitizePlainText(editCity) });

      if (!validationResult.success) {
        showToast(validationResult.error.issues[0].message, 'error');
        setIsSaving(false);
        return;
      }

      let avatarUrl: string | null = profile?.profile_photo_url || null;
      if (avatarFile) {
        const fileValidation = validateFileUpload(avatarFile, { maxSizeMB: 5, allowedTypes: ['image/jpeg', 'image/png', 'image/webp'] });
        if (!fileValidation.valid) {
          showToast(fileValidation.error || 'An unknown file validation error occurred.', 'error');
          setIsSaving(false);
          return;
        }
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `avatars/${user.uid}/avatar_${Date.now()}.${fileExt}`;
        const storageRef = ref(storage, fileName);
        await uploadBytes(storageRef, avatarFile);
        avatarUrl = await getDownloadURL(storageRef);
      }

      await updateDoc(doc(db, 'users', user.uid), {
        name: sanitizedName,
        city: validationResult.data.city,
        phoneNumber: validationResult.data.phone_number,
        profilePhotoUrl: avatarUrl,
        updatedAt: serverTimestamp(),
      });

      await fetchProfileAndStats();
      showToast(COPY.SUCCESS.SETTINGS_SAVED, 'success');
      setIsEditing(false);
      setAvatarFile(null);
    } catch (err: any) {
      const safeError = sanitizeErrorMessage(err);
      showToast(`Failed to save profile: ${safeError}`, 'error');
      if (profile?.id) {
        await logAuditEvent({ action: 'profile_update_failed', resource_type: 'profile', resource_id: profile.id, status: 'failed', metadata: { error: safeError } });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) navigate('/auth');
    else showToast(result.error || 'Logout failed. Please try again.', 'error');
  };

  const fetchUserListings = async (pageIndex: number) => {
    const user = bypassAuth ? { uid: 'e2e-user' } : auth.currentUser;
    if (!user) return;

    if (bypassAuth) {
      if (pageIndex === 0) setListings([]);
      setHasMoreListings(false);
      return;
    }

    if (pageIndex > 0) setLoadingMore(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, 'listings'),
          where('userId', '==', user.uid),
          where('status', '==', activeTab),
          orderBy('createdAt', 'desc')
        )
      );
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      const paged = data.slice(pageIndex * PROFILE_PAGE_SIZE, (pageIndex + 1) * PROFILE_PAGE_SIZE);
      if (pageIndex === 0) {
        setListings(paged);
      } else {
        setListings(prev => [...prev, ...paged]);
      }
      setHasMoreListings(paged.length === PROFILE_PAGE_SIZE);
      setListingPage(pageIndex);
    } catch (err) {
      console.error('Error fetching user listings:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const fetchSavedItems = async (pageIndex: number) => {
    const user = bypassAuth ? { uid: 'e2e-user' } : auth.currentUser;
    if (!user) return;

    if (bypassAuth) {
      if (pageIndex === 0) setListings([]);
      setHasMoreListings(false);
      return;
    }

    if (pageIndex > 0) setLoadingMore(true);
    try {
      const favSnap = await getDocs(
        query(collection(db, 'favorites'), where('userId', '==', user.uid))
      );
      const allFavs = favSnap.docs.map(d => d.data());
      const paged = allFavs.slice(pageIndex * PROFILE_PAGE_SIZE, (pageIndex + 1) * PROFILE_PAGE_SIZE);

      if (paged.length === 0) {
        if (pageIndex === 0) setListings([]);
        setHasMoreListings(false);
        return;
      }

      const listingSnaps = await Promise.all(
        paged.map(f => getDoc(doc(db, 'listings', f.listingId)))
      );
      const listingData = listingSnaps
        .filter(s => s.exists())
        .map(s => ({ id: s.id, ...s.data() })) as any[];

      if (pageIndex === 0) {
        setListings(listingData);
      } else {
        setListings(prev => [...prev, ...listingData]);
      }
      setHasMoreListings(paged.length === PROFILE_PAGE_SIZE);
      setListingPage(pageIndex);
    } catch (err) {
      console.error('Error fetching saved items:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleUnfavorite = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const user = auth.currentUser;
    if (!user) return;
    const favSnap = await getDocs(
      query(collection(db, 'favorites'), where('userId', '==', user.uid), where('listingId', '==', id))
    );
    await Promise.all(favSnap.docs.map(d => deleteDoc(d.ref)));
    setListings(prev => prev.filter(l => l.id !== id));
  };

  const handleMarkAsSold = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'listings', id), { status: 'sold' });
      setListings(prev => prev.filter(l => l.id !== id));
      fetchProfileAndStats();
      setActiveMenuId(null);
    } catch (err) { showToast('Could not update listing status.', 'error'); }
  };

  const handleDeleteListing = async () => {
    if (!deleteConfirmationId) return;
    try {
      await updateDoc(doc(db, 'listings', deleteConfirmationId), {
        status: 'deleted',
        deletedAt: serverTimestamp(),
      });
      setListings(prev => prev.filter(l => l.id !== deleteConfirmationId));
      fetchProfileAndStats();
      setDeleteConfirmationId(null);
      setActiveMenuId(null);
      showToast(COPY.TOAST.LISTING_DELETED, 'success');
    } catch (err) { showToast('Could not delete listing.', 'error'); }
  };

  const handleBumpListing = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const user = auth.currentUser;
      if (!user) return;
      const idToken = await user.getIdToken();
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
      const response = await fetch(
        `https://us-central1-${projectId}.cloudfunctions.net/bumpListing`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ listing_id: id }),
        }
      );
      const data = await response.json();
      if (data?.success) {
        showToast('Bumped! Teri listing ab top pe hai 🚀', 'success');
        setListings([]);
        setListingPage(0);
        fetchUserListings(0);
      } else if (data?.error === 'cooldown_active') {
        const nextDate = new Date(data.next_eligible);
        showToast(`Next bump available on ${nextDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`, 'info');
      } else {
        showToast('Could not bump listing.', 'error');
      }
    } catch (err) {
      console.error('Bump error:', err);
      showToast('Could not bump listing.', 'error');
    }
  };

  const handleShareListing = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/listings/${id}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Check out this listing on AndamanBazaar!', url });
      else { await navigator.clipboard.writeText(url); showToast(COPY.TOAST.SAVE_SUCCESS, 'success'); }
    } catch (err) { console.error('Error sharing:', err); }
    setActiveMenuId(null);
  };

  const handleWhatsAppShare = (id: string, title: string, price: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/listings/${id}?utm_source=whatsapp&utm_medium=share`;
    const text = encodeURIComponent(`${title} \u2014 \u20b9${price.toLocaleString('en-IN')}\n${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener');
    setActiveMenuId(null);
  };

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center bg-neutral">
      <Loader2 className="w-12 h-12 animate-spin text-accent" />
      <p className="mt-4 font-black uppercase tracking-widest text-sm text-secondary">{COPY.LOADING.AUTH}</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 pb-12 animate-slide-up bg-neutral text-primary">
      {deleteConfirmationId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-primary/70 backdrop-blur-md animate-in fade-in">
          <div className="bg-base-100 p-8 rounded-[40px] shadow-2xl max-w-md w-full text-center space-y-6">
            <div className="w-24 h-24 bg-red-500/10 text-red-500 rounded-[32px] flex items-center justify-center mx-auto"><Trash2 size={40} strokeWidth={2.5} /></div>
            <h2 className="text-3xl font-heading font-black tracking-tight">Delete Listing?</h2>
            <p className="text-secondary font-bold text-base">This action is permanent and cannot be undone.</p>
            <div className="flex gap-4 pt-4">
              <button onClick={() => setDeleteConfirmationId(null)} className="flex-1 py-4 rounded-2xl font-black text-secondary hover:text-primary transition-colors uppercase text-sm tracking-widest">Cancel</button>
              <button onClick={handleDeleteListing} className="flex-[1.5] py-4 rounded-2xl font-black bg-red-500 text-white shadow-xl shadow-red-500/20 active:scale-95 transition-all uppercase text-sm tracking-widest">Delete</button>
            </div>
          </div>
        </div>
      )}

      <section className="mb-12">
        <div className="relative h-64 md:h-80 bg-primary rounded-b-[48px] shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-primary to-primary"></div>
          <div className="absolute top-6 right-6 z-20 flex gap-3">
            {!isEditing ? (
              <>
                <button onClick={() => setIsEditing(true)} className="bg-white/10 backdrop-blur-xl text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-white/20 transition-all flex items-center gap-2 border border-white/20 shadow-lg"><Edit3 size={16} /> Edit Profile</button>
                <button onClick={handleLogout} className="bg-red-500/80 backdrop-blur-xl text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-red-500 transition-all flex items-center gap-2 border border-red-500/50 shadow-lg"><LogOut size={16} /> Logout</button>
              </>
            ) : (
              <>
                <button onClick={() => { setIsEditing(false); setAvatarPreview(profile?.profile_photo_url || null); }} className="bg-white/10 backdrop-blur-xl text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-white/20 transition-all flex items-center gap-2 border border-white/20" disabled={isSaving}><X size={16} /> Cancel</button>
                <button onClick={handleSaveProfile} className="bg-teal-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-teal-700 transition-all flex items-center gap-2 shadow-xl" disabled={isSaving}>{isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save</button>
              </>
            )}
          </div>
          <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 md:left-12 md:translate-x-0">
            <div className="relative group">
              <div className={`w-40 h-40 md:w-48 md:h-48 rounded-full border-[10px] border-base-100 bg-secondary/20 shadow-2xl overflow-hidden flex items-center justify-center transition-all duration-500 ${isEditing ? 'ring-8 ring-accent/20' : ''}`}>
                <img src={avatarPreview || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.id}`} alt="Profile" className="w-full h-full object-cover" />
                {isEditing && (
                  <div className="absolute inset-0 bg-primary/60 backdrop-blur-sm flex items-center justify-center cursor-pointer group-hover:bg-primary/70 transition-colors" onClick={() => fileInputRef.current?.click()}>
                    <div className="flex flex-col items-center text-white space-y-2">
                      <Camera size={36} strokeWidth={2.5} />
                      <span className="text-xs font-black uppercase tracking-widest">Update Photo</span>
                    </div>
                  </div>
                )}
                <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileSelect} />
              </div>
              {profile?.is_location_verified && !isEditing && (
                <div className="absolute bottom-2 right-2 w-12 h-12 bg-accent text-primary rounded-full flex items-center justify-center shadow-xl border-4 border-base-100"><ShieldCheck size={28} strokeWidth={2.5} /></div>
              )}
            </div>
            {!isEditing && !profile?.profile_photo_url && (
              <p className="text-center text-sm text-warm-400 font-medium mt-3 max-w-[200px]">{COPY.PROFILE.COMPLETION_NUDGE}</p>
            )}
          </div>
        </div>

        <div className="mt-24 md:mt-6 md:ml-64 px-4 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4 text-center md:text-left">
              {isEditing ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 max-w-md mx-auto md:mx-0">
                  <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full text-4xl font-heading font-black text-primary border-b-4 border-secondary/20 focus:border-accent outline-none pb-2 bg-transparent" placeholder="Full Name" />
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                      <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
                      <input value={editCity} onChange={e => setEditCity(e.target.value)} className="w-full pl-12 pr-4 py-4 text-base font-bold text-primary border-2 border-secondary/20 rounded-2xl focus:border-accent outline-none bg-secondary/10" placeholder="City" />
                    </div>
                    <input value={editPhone} onChange={e => setEditPhone(e.target.value)} className="flex-1 px-4 py-4 text-base font-bold text-primary border-2 border-secondary/20 rounded-2xl focus:border-accent outline-none bg-secondary/10" placeholder="Phone (optional)" />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                    <h3 className="text-5xl md:text-6xl font-heading font-black tracking-tight leading-tight">{profile?.name || 'Local Islander'}</h3>
                    {profile?.trust_level && (
                      <TrustBadge level={profile.trust_level} size="md" />
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                    <div className="flex items-center space-x-2 px-5 py-3 bg-secondary/10 text-secondary rounded-2xl border-2 border-secondary/20 shadow-sm">
                      <Calendar size={18} className="text-accent" />
                      <span className="text-sm font-black uppercase tracking-widest">Joined in {profile?.created_at ? new Date(profile.created_at).getFullYear() : '2024'}</span>
                    </div>
                    {profile?.city && (
                      <div className="flex items-center space-x-2 px-5 py-3 bg-secondary/10 text-secondary rounded-2xl border-2 border-secondary/20 shadow-sm">
                        <MapPin size={18} className="text-accent" />
                        <span className="text-sm font-black uppercase tracking-widest">
                          {profile.area ? `${profile.area}, ` : ''}{profile.city}
                        </span>
                      </div>
                    )}
                    {profile?.is_location_verified && (() => {
                      const verifiedAt = profile.location_verified_at ? new Date(profile.location_verified_at).getTime() : 0;
                      const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
                      const needsReverification = !verifiedAt || (Date.now() - verifiedAt > ninetyDaysMs);
                      
                      return (
                        <div className="flex flex-col items-center gap-1">
                          <div className={`flex items-center space-x-2 px-5 py-3 rounded-2xl border-2 shadow-sm ${
                            needsReverification
                              ? 'bg-amber-500/10 text-amber-700 border-amber-500/20'
                              : 'bg-green-500/10 text-green-700 border-green-500/20'
                          }`}>
                            <ShieldCheck size={18} />
                            <span className="text-sm font-black uppercase tracking-widest">Verified Resident</span>
                          </div>
                          <span className="text-[10px] font-bold text-warm-400">
                            {needsReverification
                              ? 'Re-verification required'
                              : `Verified ${new Date(profile.location_verified_at!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                            }
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-center gap-10 md:bg-white md:p-6 md:rounded-[32px] md:border-2 md:border-warm-200 md:shadow-sm">
              <div className="text-center cursor-pointer" onClick={() => setActiveTab('active')}><p className="text-4xl font-heading font-black text-midnight-700 leading-none transition-colors">{stats.active}</p><p className="text-sm font-black text-warm-600 uppercase tracking-widest mt-2">Active Ads</p></div>
              <div className="w-px h-12 bg-warm-200 hidden md:block"></div>
              <div className="text-center cursor-pointer" onClick={() => setActiveTab('sold')}><p className="text-4xl font-heading font-black text-midnight-700 leading-none transition-colors">{stats.sold}</p><p className="text-sm font-black text-warm-600 uppercase tracking-widest mt-2">Items Sold</p></div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-center mb-10">
        <div className="inline-flex bg-warm-100 p-2 rounded-[24px] border border-warm-200">
          {[{ id: 'active', label: 'My Listings', icon: <Globe size={16} /> }, { id: 'sold', label: 'Sale History', icon: <ShoppingBag size={16} /> }, { id: 'saved', label: 'Favorites', icon: <Heart size={16} /> }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-8 py-4 rounded-2xl font-black uppercase text-sm tracking-widest transition-all flex items-center gap-3 ${activeTab === tab.id ? 'bg-white shadow-xl text-midnight-700 border border-warm-200' : 'text-warm-600 hover:text-midnight-700'}`}>{tab.icon}<span>{tab.label}</span></button>
          ))}
        </div>
      </div>

      <div className="space-y-4 max-w-3xl mx-auto px-2">
        {listings.length === 0 ? (
          <div className="py-24 text-center bg-white rounded-[40px] border-4 border-dashed border-warm-200 animate-in fade-in">
            <h3 className="text-3xl font-heading font-black tracking-tight text-midnight-700">No Items Here!</h3>
            <p className="text-warm-600 font-bold text-lg max-w-sm mx-auto mt-2">{COPY.EMPTY_STATE.PROFILE_NO_LISTINGS}</p>
            <Link to="/post" className="mt-8 inline-block bg-teal-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-sm tracking-widest shadow-2xl active:scale-95 transition-all hover:bg-teal-700">Create a Listing</Link>
          </div>
        ) : (
          listings.map(item => (
            <div key={item.id} className="relative bg-white rounded-2xl p-3 shadow-soft border border-warm-200">
              <div className="flex gap-3 mb-3">
                <Link to={`/listings/${item.id}`} className="block relative w-28 h-28 flex-shrink-0">
                  <img src={item.images?.[0]?.image_url || `https://picsum.photos/seed/list-${item.id}/800/600`} className="w-full h-full object-cover rounded-xl bg-warm-100" alt={item.title} />
                  {item.status === 'sold' && <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-midnight-800/90 backdrop-blur-sm rounded text-[10px] font-bold text-white uppercase tracking-wide">Sold</div>}
                  {item.status === 'active' && <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-green-500/90 backdrop-blur-sm rounded text-[10px] font-bold text-white uppercase tracking-wide">Active</div>}
                  {item.is_featured && <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded shadow text-[10px] font-bold uppercase flex items-center gap-0.5"><Star size={8} fill="currentColor" /> Featured</div>}
                </Link>
                <div className="flex-1 min-w-0 flex flex-col py-0.5">
                  <div className="flex justify-between items-start">
                    <Link to={`/listings/${item.id}`} className="block">
                      <h3 className="text-sm font-semibold text-midnight-800 leading-snug line-clamp-2 pr-1 hover:text-teal-600 transition-colors">{item.title}</h3>
                    </Link>
                    <div className="relative">
                      {activeTab === 'saved' ? (
                        <button onClick={e => item.id && handleUnfavorite(item.id, e)} aria-label="Remove from saved" className="p-1 -mr-1 -mt-1 text-coral-500 hover:bg-coral-50 rounded-full transition-colors"><Heart size={20} fill="currentColor" /></button>
                      ) : (
                        <button onClick={e => { e.preventDefault(); e.stopPropagation(); setActiveMenuId(activeMenuId === item.id ? null : item.id); }} aria-label="More options" className="p-1 -mr-1 -mt-1 text-warm-500 hover:bg-warm-100 rounded-full transition-colors"><MoreVertical size={20} /></button>
                      )}

                      {/* Three-dot Dropdown */}
                      {activeMenuId === item.id && (
                        <div ref={menuRef} className="absolute top-8 right-0 w-48 bg-white rounded-2xl shadow-xl border border-warm-100 p-2 z-[60] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                          <div className="space-y-1">
                            {item.id && <button onClick={e => handleWhatsAppShare(item.id, item.title, item.price, e)} className="w-full flex items-center space-x-3 p-3 hover:bg-green-50 rounded-xl transition-colors group text-left"><MessageCircle size={16} className="text-green-600" /><span className="text-sm font-bold text-green-700">WhatsApp</span></button>}
                            {item.id && <button onClick={e => { setActiveMenuId(null); handleShareListing(item.id, e); }} className="w-full flex items-center space-x-3 p-3 hover:bg-warm-50 rounded-xl transition-colors group text-left"><Share2 size={16} className="text-warm-500" /><span className="text-sm font-bold text-midnight-700">Share</span></button>}
                            {item.id && <button onClick={() => setDeleteConfirmationId(item.id)} className="w-full flex items-center space-x-3 p-3 hover:bg-red-50 rounded-xl transition-colors group text-red-600 text-left"><Trash2 size={16} /><span className="text-sm font-bold">Delete</span></button>}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-base font-bold text-teal-600 mt-0.5">₹{item.price?.toLocaleString('en-IN')}</p>

                  <div className="flex flex-col gap-1 mt-auto">
                    <div className="flex items-center text-xs text-warm-500">
                      <MapPin size={14} className="mr-1 text-warm-400" />
                      <span className="truncate">{item.city}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-warm-500 font-medium">
                      <div className="flex items-center bg-warm-50 px-1.5 py-0.5 rounded">
                        <Eye size={14} className="mr-1 text-teal-500" /> {item.views_count || 0}
                      </div>
                      <div className="flex items-center bg-warm-50 px-1.5 py-0.5 rounded">
                        <MessageCircle size={14} className="mr-1 text-teal-500" /> 0
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {activeTab === 'active' && item.status === 'active' && (
                <BoostNudge
                  listingId={item.id}
                  listingTitle={item.title}
                  hoursSinceCreated={item.created_at ? (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60) : 0}
                  chatCount={0}
                  viewCount={item.views_count || 0}
                  onBoostClick={() => setBoostingListing({ id: item.id, title: item.title })}
                  className="mt-3 mx-1"
                />
              )}

              {activeTab !== 'saved' && (
                <div className={`grid ${item.status === 'sold' ? 'grid-cols-3' : 'grid-cols-4'} gap-2 pt-3 mt-3 border-t border-warm-100`}>
                  <button onClick={() => navigate(`/post?edit=${item.id}`)} className="py-2 px-2 rounded-lg border border-warm-200 text-warm-600 font-medium text-xs hover:bg-warm-50 transition-colors">
                    Edit
                  </button>
                  {item.status === 'sold' ? (
                    <button onClick={() => navigate(`/post?relist=${item.id}`)} className="py-2 px-2 rounded-lg bg-teal-600 text-white font-semibold text-xs shadow-md shadow-teal-600/20 hover:opacity-90 transition-opacity flex items-center justify-center gap-1 col-span-2">
                      <RefreshCw size={14} /> Relist as New
                    </button>
                  ) : (
                    <>
                      <button onClick={e => item.id && handleBumpListing(item.id, e)} disabled={item.status !== 'active'} className="py-2 px-2 rounded-lg border border-teal-200 text-teal-600 font-medium text-xs hover:bg-teal-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1">
                        <ArrowUpDown size={12} /> Bump
                      </button>
                      <button onClick={e => item.id && handleMarkAsSold(item.id, e)} disabled={item.status !== 'active'} className="py-2 px-2 rounded-lg border border-warm-200 text-warm-600 font-medium text-xs hover:bg-warm-50 transition-colors disabled:opacity-50">
                        Mark Sold
                      </button>
                      <button onClick={() => item.id && setBoostingListing({ id: item.id, title: item.title })} disabled={item.status !== 'active'} className="py-2 px-2 rounded-lg bg-coral-500 text-white font-semibold text-xs shadow-md shadow-coral-500/20 hover:opacity-90 transition-opacity flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-warm-300 disabled:shadow-none">
                        <Rocket size={14} /> {(item as any).isBoosted ? 'Extend' : 'Boost'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {hasMoreListings && listings.length > 0 && (
        <div className="flex justify-center mt-10">
          <button
            onClick={() => {
              const nextPage = listingPage + 1;
              activeTab === 'saved' ? fetchSavedItems(nextPage) : fetchUserListings(nextPage);
            }}
            disabled={loadingMore}
            className="flex items-center gap-2 bg-slate-100 text-slate-700 px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            {loadingMore ? <Loader2 size={16} className="animate-spin" /> : null}
            {loadingMore ? 'Loading…' : 'Load More'}
          </button>
        </div>
      )}

      <ReportModal isOpen={!!selectedForReport} onClose={() => setSelectedForReport(null)} listingId={selectedForReport?.id || ''} listingTitle={selectedForReport?.title || ''} />
      {boostingListing && <BoostListingModal isOpen={!!boostingListing} onClose={() => setBoostingListing(null)} listingId={boostingListing.id} listingTitle={boostingListing.title} />}
    </div>
  );
};