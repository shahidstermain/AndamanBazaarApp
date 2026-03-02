import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Profile as ProfileType, Listing } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { ReportModal } from '../components/ReportModal';
import {
  Edit3, CheckCircle, Rocket, Share2, Trash2, MoreVertical, Heart, Globe, ShoppingBag, Calendar, Camera, Eye, Save, X, Loader2, MapPin, ShieldCheck, Award, LogOut, MessageCircle, Star
} from 'lucide-react';
import { profileUpdateSchema, validateFileUpload, sanitizePlainText } from '../lib/validation';
import { logAuditEvent, sanitizeErrorMessage } from '../lib/security';
import { logout } from '../lib/auth';
import { useToast } from '../components/Toast';
import { BoostListingModal } from '../components/BoostListingModal';
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/auth'); return; }

      const { data: profileData, error: profileError } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (profileError) throw profileError;
      setProfile(profileData);

      const { data: statsData, error: statsError } = await supabase.from('listings').select('status').eq('user_id', user.id);
      if (statsError) throw statsError;

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
      const { data: { user } } = await supabase.auth.getUser();
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
        const fileName = `${user.id}/avatar_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
        if (data.publicUrl) {
          avatarUrl = data.publicUrl;
        }
      }

      const { error: updateError } = await supabase.from('profiles').update({ name: sanitizedName, city: validationResult.data.city, phone_number: validationResult.data.phone_number, profile_photo_url: avatarUrl }).eq('id', user.id);
      if (updateError) throw updateError;

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (pageIndex > 0) setLoadingMore(true);
    try {
      const from = pageIndex * PROFILE_PAGE_SIZE;
      const to = from + PROFILE_PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', activeTab)
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      if (pageIndex === 0) {
        setListings(data || []);
      } else {
        setListings(prev => [...prev, ...(data || [])]);
      }
      setHasMoreListings((data || []).length === PROFILE_PAGE_SIZE);
      setListingPage(pageIndex);
    } catch (err) {
      console.error('Error fetching user listings:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const fetchSavedItems = async (pageIndex: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (pageIndex > 0) setLoadingMore(true);
    try {
      const from = pageIndex * PROFILE_PAGE_SIZE;
      const to = from + PROFILE_PAGE_SIZE - 1;

      // 1. Fetch favorites (paginated)
      const { data: favoritedData, error: favError } = await supabase
        .from('favorites')
        .select('listing_id, id')
        .eq('user_id', user.id)
        .range(from, to);

      if (favError) throw favError;
      if (!favoritedData || favoritedData.length === 0) {
        if (pageIndex === 0) setListings([]);
        setHasMoreListings(false);
        return;
      }

      // 2. Fetch corresponding listings
      const listingIds = favoritedData.map(f => f.listing_id);
      const { data: listingData, error: listError } = await supabase
        .from('listings')
        .select('*')
        .in('id', listingIds);

      if (listError) throw listError;
      if (pageIndex === 0) {
        setListings(listingData || []);
      } else {
        setListings(prev => [...prev, ...(listingData || [])]);
      }
      setHasMoreListings(favoritedData.length === PROFILE_PAGE_SIZE);
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('favorites').delete().eq('user_id', user.id).eq('listing_id', id);
    if (!error) setListings(prev => prev.filter(l => l.id !== id));
  };

  const handleMarkAsSold = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const { error } = await supabase.from('listings').update({ status: 'sold' }).eq('id', id);
      if (error) throw error;
      setListings(prev => prev.filter(l => l.id !== id));
      fetchProfileAndStats();
      setActiveMenuId(null);
    } catch (err) { showToast('Could not update listing status.', 'error'); }
  };

  const handleDeleteListing = async () => {
    if (!deleteConfirmationId) return;
    try {
      const { error } = await supabase.from('listings').update({ status: 'deleted', deleted_at: new Date().toISOString() }).eq('id', deleteConfirmationId);
      if (error) throw error;
      setListings(prev => prev.filter(l => l.id !== deleteConfirmationId));
      fetchProfileAndStats();
      setDeleteConfirmationId(null);
      setActiveMenuId(null);
      showToast('Listing has been removed.', 'success');
    } catch (err) { showToast('Could not delete listing.', 'error'); }
  };

  const handleShareListing = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/#/listings/${id}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Check out this listing on AndamanBazaar!', url });
      else { await navigator.clipboard.writeText(url); showToast('Link copied to clipboard!', 'success'); }
    } catch (err) { console.error('Error sharing:', err); }
    setActiveMenuId(null);
  };

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center bg-neutral">
      <Loader2 className="w-12 h-12 animate-spin text-accent" />
      <p className="mt-4 font-black uppercase tracking-widest text-sm text-secondary">Loading Profile...</p>
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
                <button onClick={() => setIsEditing(true)} className="bg-base-100/10 backdrop-blur-xl text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-base-100/20 transition-all flex items-center gap-2 border border-base-100/20 shadow-lg"><Edit3 size={16} /> Edit Profile</button>
                <button onClick={handleLogout} className="bg-red-500/80 backdrop-blur-xl text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-red-500 transition-all flex items-center gap-2 border border-red-500/50 shadow-lg"><LogOut size={16} /> Logout</button>
              </>
            ) : (
              <>
                <button onClick={() => { setIsEditing(false); setAvatarPreview(profile?.profile_photo_url || null); }} className="bg-base-100/10 backdrop-blur-xl text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-base-100/20 transition-all flex items-center gap-2 border border-base-100/20" disabled={isSaving}><X size={16} /> Cancel</button>
                <button onClick={handleSaveProfile} className="bg-accent text-primary px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-accent/80 transition-all flex items-center gap-2 shadow-xl" disabled={isSaving}>{isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save</button>
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
                  <h3 className="text-5xl md:text-6xl font-heading font-black tracking-tight leading-tight">{profile?.name || 'Local Islander'}</h3>
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
                    {profile?.is_location_verified && (
                      <div className="flex items-center space-x-2 px-5 py-3 bg-green-500/10 text-green-700 rounded-2xl border-2 border-green-500/20 shadow-sm">
                        <ShieldCheck size={18} />
                        <span className="text-sm font-black uppercase tracking-widest">Verified Resident</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-center gap-10 md:bg-base-100 md:p-6 md:rounded-[32px] md:border-2 md:border-secondary/10 md:shadow-sm">
              <div className="text-center cursor-pointer" onClick={() => setActiveTab('active')}><p className="text-4xl font-heading font-black text-primary leading-none transition-colors">{stats.active}</p><p className="text-sm font-black text-secondary uppercase tracking-widest mt-2">Active Ads</p></div>
              <div className="w-px h-12 bg-secondary/20 hidden md:block"></div>
              <div className="text-center cursor-pointer" onClick={() => setActiveTab('sold')}><p className="text-4xl font-heading font-black text-primary leading-none transition-colors">{stats.sold}</p><p className="text-sm font-black text-secondary uppercase tracking-widest mt-2">Items Sold</p></div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-center mb-10">
        <div className="inline-flex bg-secondary/10 p-2 rounded-[24px] border border-secondary/20">
          {[{ id: 'active', label: 'My Listings', icon: <Globe size={16} /> }, { id: 'sold', label: 'Sale History', icon: <ShoppingBag size={16} /> }, { id: 'saved', label: 'Favorites', icon: <Heart size={16} /> }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-8 py-4 rounded-2xl font-black uppercase text-sm tracking-widest transition-all flex items-center space-x-3 ${activeTab === tab.id ? 'bg-base-100 shadow-xl text-primary border border-secondary/10' : 'text-secondary hover:text-primary'}`}>{tab.icon}<span>{tab.label}</span></button>
          ))}
        </div>
      </div>

      <div className="space-y-4 max-w-3xl mx-auto px-2">
        {listings.length === 0 ? (
          <div className="py-24 text-center bg-base-100 rounded-[40px] border-4 border-dashed border-secondary/10 animate-in fade-in">
            <h3 className="text-3xl font-heading font-black tracking-tight">No Items Here!</h3>
            <p className="text-secondary font-bold text-lg max-w-sm mx-auto mt-2">{COPY.EMPTY_STATE.PROFILE_NO_LISTINGS}</p>
            <Link to="/post" className="mt-8 inline-block bg-accent text-primary px-10 py-4 rounded-2xl font-black uppercase text-sm tracking-widest shadow-2xl active:scale-95 transition-all">Create a Listing</Link>
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

              {activeTab !== 'saved' && (
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-warm-100">
                  <button onClick={() => navigate(`/post?edit=${item.id}`)} className="py-2 px-2 rounded-lg border border-warm-200 text-warm-600 font-medium text-xs hover:bg-warm-50 transition-colors">
                    Edit
                  </button>
                  <button onClick={e => item.id && handleMarkAsSold(item.id, e)} disabled={item.status === 'sold'} className="py-2 px-2 rounded-lg border border-warm-200 text-warm-600 font-medium text-xs hover:bg-warm-50 transition-colors disabled:opacity-50">
                    Mark Sold
                  </button>
                  <button onClick={() => item.id && setBoostingListing({ id: item.id, title: item.title })} disabled={item.status !== 'active'} className="py-2 px-2 rounded-lg bg-coral-500 text-white font-semibold text-xs shadow-md shadow-coral-500/20 hover:opacity-90 transition-opacity flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-warm-300 disabled:shadow-none">
                    <Rocket size={14} /> {item.is_featured ? 'Extend' : 'Boost'}
                  </button>
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