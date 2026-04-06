import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Camera, PlusCircle, Check, MapPin, ChevronRight, AlertCircle, Loader2, X, Sparkles, Smartphone, Car, Sofa, Shirt, Home as HomeIcon, Zap, ShoppingBag, Rocket, Share2, Facebook, Link as LinkIcon, RefreshCw } from 'lucide-react';
import { compressImage } from '../lib/utils';
import { listingSchema, sanitizePlainText, detectPromptInjection, validateFileUpload } from '../lib/validation';
import { logAuditEvent, sanitizeErrorMessage } from '../lib/security';
import { ItemCondition, ItemAge, ContactPreferences, AiSuggestion } from '../types';
import { uploadListingImages } from '../lib/storage';
import { getListing, createListing, updateListing } from '../lib/database';
import { getCurrentUserId } from '../lib/auth';
import { verifyLocation } from '../lib/functions';
import { auth } from '../lib/firebase';
import {
  saveDraft, loadDraft, clearDraft, hasDraft, generateIdempotencyKey, debounce,
  ANDAMAN_CITIES, ITEM_AGE_OPTIONS, CONDITION_OPTIONS, CATEGORIES,
  loadContactPreferences, saveContactPreferences, DEFAULT_CONTACT_PREFERENCES,
} from '../lib/postAdUtils';
import { useImageUpload } from '../hooks/useImageUpload';
import { ImageUploadPreview } from '../components/ImageUploadPreview';
import { useToast } from '../components/Toast';
import { safeRandomUUID } from '../lib/random';
import { BoostListingModal } from '../components/BoostListingModal';
import { COPY } from '../lib/localCopy';

// ===== STEP COMPONENTS =====

interface StepHeaderProps {
  title: string;
  stepLabel: string;
}

const StepHeader: React.FC<StepHeaderProps> = ({ title, stepLabel }) => (
  <div className="space-y-1">
    <p className="text-[10px] text-teal-600 font-black uppercase tracking-widest">{stepLabel}</p>
    <h2 className="text-2xl font-heading font-black text-midnight-700 leading-tight">{title}</h2>
  </div>
);

const ContinueButton: React.FC<{ onClick: () => void; disabled?: boolean; label?: string; loading?: boolean }> = ({ onClick, disabled, label = 'Continue', loading }) => (
  <button
    onClick={onClick}
    disabled={disabled || loading}
    className="btn-primary w-full py-4 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
  >
    {loading ? <Loader2 className="animate-spin" size={18} /> : label}
  </button>
);

const BackButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button onClick={onClick} className="w-full text-warm-400 font-bold text-sm py-2 hover:text-midnight-700 transition-colors">
    ← Back
  </button>
);

// ===== MAIN COMPONENT =====

export const CreateListing: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const relistId = searchParams.get('relist');
  const sourceId = editId || relistId;
  const isRelist = !!relistId;
  const preCategory = searchParams.get('cat');
  const bypassAuth = import.meta.env.VITE_E2E_BYPASS_AUTH === 'true' || searchParams.get('e2e') === '1';

  // Step management
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!sourceId);
  const [showDraftSheet, setShowDraftSheet] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { showToast } = useToast();

  // Form state
  const { uploads: photos, addFiles, removeUpload, retryUpload, setUploads: setPhotos } = useImageUpload({ maxFiles: 8, maxSizeMB: 10 });
  const [deletedPhotoIds, setDeletedPhotoIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<string | null>(preCategory);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [isNegotiable, setIsNegotiable] = useState(true);
  const [minPrice, setMinPrice] = useState('');
  const [condition, setCondition] = useState<ItemCondition>('good');
  const [itemAge, setItemAge] = useState<ItemAge | null>(null);
  const [accessories, setAccessories] = useState<string[]>([]);
  const [accessoryInput, setAccessoryInput] = useState('');
  const [city, setCity] = useState('Port Blair');
  const [area, setArea] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [contactPrefs, setContactPrefs] = useState<ContactPreferences>(DEFAULT_CONTACT_PREFERENCES);
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [idempotencyKey] = useState(generateIdempotencyKey());
  const [createdListingId, setCreatedListingId] = useState<string | null>(null);
  const [isBoostModalOpen, setIsBoostModalOpen] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);

  const debouncedSave = useCallback(
    debounce((uid: string) => {
      saveDraft(uid, {
        step, category: category || undefined, title, description, price, condition,
        is_negotiable: isNegotiable, min_price: minPrice, item_age: itemAge || undefined,
        city, area, contact_preferences: contactPrefs,
        image_previews: photos.map(p => p.preview).slice(0, 3),
        idempotency_key: idempotencyKey, accessories, is_urgent: isUrgent,
      });
    }, 3000),
    [step, category, title, description, price, condition, isNegotiable, city, area, contactPrefs, photos, idempotencyKey, isUrgent]
  );

  useEffect(() => {
    if (userId && !sourceId && step < 6) debouncedSave(userId);
  }, [userId, step, title, description, price, category, condition, city, area, debouncedSave, editId]);

  useEffect(() => {
    const init = async () => {
      const userId = bypassAuth
        ? 'e2e-user'
        : await getCurrentUserId();
      if (!userId) { navigate('/auth'); return; }
      setUserId(userId);

      if (bypassAuth) {
        setIsVerified(true);
        setCity('Port Blair');
        setArea('Aberdeen');
      } else {
        setIsVerified(true);
        setCity('Port Blair');
        setArea('Aberdeen');
      }

      setContactPrefs(loadContactPreferences());

      if (sourceId) {
        try {
          const listing = await getListing(sourceId);
          if (listing) {
            setTitle(listing.title);
            setPrice(listing.price.toString());
            setDescription(listing.description || '');
            setCity(listing.city);
            setArea(listing.area || '');
            setCondition(listing.condition || 'good');
            setItemAge((listing.itemAge as ItemAge) || null);
            setAccessories(listing.accessories || []);
            setIsNegotiable(listing.isNegotiable ?? true);
            setMinPrice(listing.minPrice?.toString() || '');
            setIsUrgent(listing.is_urgent || false);
            setContactPrefs(listing.contactPreferences || DEFAULT_CONTACT_PREFERENCES);
            if (listing.category) {
              const cat = CATEGORIES.find(c => c.id === listing.category);
              setCategory(cat ? cat.name : listing.category);
            }
            if (listing.images) {
              setPhotos(
                listing.images
                  .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0))
                  .map((img: any) => ({
                    id: img.id,
                    preview: img.url,
                    status: 'success',
                    progress: 100,
                    retryCount: 0,
                  }))
              );
            }
            setStep(1);
          }
        } catch (err) { console.error('Fetch listing error:', err); }
        setFetching(false);
      } else {
        if (hasDraft(userId)) {
          setShowDraftSheet(true);
        }
        if (preCategory) {
          const cat = CATEGORIES.find(c => c.id === preCategory);
          if (cat) setCategory(cat.name);
        }
      }
    };
    init();
  }, [sourceId, navigate, preCategory]);

  const resumeDraft = () => {
    if (!userId) return;
    const draft = loadDraft(userId);
    if (!draft) { setShowDraftSheet(false); return; }
    setTitle(draft.title || '');
    setDescription(draft.description || '');
    setPrice(draft.price || '');
    setCategory(draft.category || null);
    setCondition(draft.condition || 'good');
    setItemAge(draft.item_age || null);
    setAccessories(draft.accessories || []);
    setIsNegotiable(draft.is_negotiable ?? true);
    setMinPrice(draft.min_price || '');
    setCity(draft.city || 'Port Blair');
    setArea(draft.area || '');
    setIsUrgent(draft.is_urgent || false);
    setContactPrefs(draft.contact_preferences || DEFAULT_CONTACT_PREFERENCES);
    setStep(draft.step || 1);
    setShowDraftSheet(false);
  };

  const discardDraft = () => {
    if (userId) clearDraft(userId);
    setShowDraftSheet(false);
  };

  const TOTAL_STEPS = 2;
  const nextStep = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); setStep(s => s + 1); };
  const prevStep = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); setStep(s => s - 1); };
  const goToStep = (s: number) => { window.scrollTo({ top: 0, behavior: 'smooth' }); setStep(s); };

  const handleFiles = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    const fileArray = Array.from(selectedFiles);
    addFiles(fileArray);

    // AI suggestion for first image
    if (photos.length === 0 && fileArray[0] && !aiSuggestion) {
      getAiSuggestion(fileArray[0]);
    }
  };

  const handleRemovePhoto = (id: string) => {
    const photo = photos.find(p => p.id === id);
    if (photo?.id && !photo.file) { // If it's an existing server-side image
      setDeletedPhotoIds(prev => [...prev, photo.id]);
    }
    removeUpload(id);
  };

  const getAiSuggestion = async (imageFile: File) => {
    try {
      const functionUrl = import.meta.env.VITE_FIREBASE_AI_SUGGEST_FUNCTION;
      const user = auth.currentUser;
      if (!functionUrl || !user) return;
      setAiLoading(true);
      const reader = new FileReader();
      const base64 = await new Promise<string>(res => { reader.onload = () => res((reader.result as string).split(',')[1]); reader.readAsDataURL(imageFile); });
      const idToken = await user.getIdToken();
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: {
            mimeType: imageFile.type || 'image/webp',
            data: base64,
          },
        }),
      });
      if (!response.ok) {
        throw new Error('AI suggestion request failed');
      }
      const json = await response.json() as AiSuggestion;
      setAiSuggestion(json);
      if (json.suggested_condition) setCondition(json.suggested_condition);
      if (json.suggested_category) {
        const cat = CATEGORIES.find(c => c.id === json.suggested_category);
        if (cat) setCategory(cat.name);
      }
    } catch (e) { console.warn('AI suggestion failed:', e); }
    finally { setAiLoading(false); }
  };

  const handleVerifyLocation = async () => {
    setIsVerifying(true);
    try {
      if (!navigator.geolocation) {
        showToast('GPS is not supported by your browser.', 'error');
        setIsVerifying(false);
        return;
      }
      
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => 
        navigator.geolocation.getCurrentPosition(resolve, reject, { 
          timeout: 15000, 
          enableHighAccuracy: true,
          maximumAge: 0 
        })
      );
      
      const { latitude, longitude } = pos.coords;
      
      const data = await verifyLocation({ latitude, longitude, userId: auth.currentUser?.uid || '' });
      
      if (!data.success) {
        console.error('Verification error:', data.error);
        showToast('Verification service unavailable. Please try again later.', 'error');
        setIsVerifying(false);
        return;
      }
      
      if ((data as any).code === 'RATE_LIMITED') {
        const retryMinutes = Math.ceil(((data as any).retryAfterSeconds || 3600) / 60);
        showToast(`Too many attempts. Please try again in ${retryMinutes} minutes.`, 'warning');
      } else if (data.verified) {
        setIsVerified(true);
        showToast((data as any).message || 'Island residency verified!', 'success');
        if ((data as any).warning) {
          setTimeout(() => showToast((data as any).warning, 'warning'), 2000);
        }
      } else {
        const errorMsg = data.error || 'Location could not be verified as Andaman & Nicobar Islands.';
        showToast(errorMsg, 'error');
      }
    } catch (err) {
      console.error('GPS error:', err);
      showToast('Could not access location. Please enable GPS and try again.', 'error');
    }
    setIsVerifying(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Please login first.');

      const sanitizedTitle = sanitizePlainText(title);
      const sanitizedDescription = sanitizePlainText(description);
      const sanitizedArea = sanitizePlainText(area);

      if (detectPromptInjection(sanitizedTitle) || detectPromptInjection(sanitizedDescription)) {
        showToast('Your listing contains suspicious content. Please revise and try again.', 'error');
        await logAuditEvent({ action: 'listing_creation_blocked', status: 'blocked', metadata: { reason: 'prompt_injection_detected' } });
        setLoading(false);
        return;
      }

      const catId = category ? CATEGORIES.find(c => c.name === category)?.id || category.toLowerCase() : '';
      const validationResult = listingSchema.safeParse({
        title: sanitizedTitle,
        description: sanitizedDescription,
        price: parseFloat(price),
        category_id: catId,
        condition,
        item_age: itemAge,
        accessories,
        city,
        area: sanitizedArea,
        is_negotiable: isNegotiable,
        min_price: minPrice ? parseFloat(minPrice) : null,
        contact_preferences: contactPrefs
      });

      if (!validationResult.success) {
        showToast(validationResult.error.issues[0].message, 'error');
        setLoading(false);
        return;
      }

      const firestorePayload: Record<string, any> = {
        userId: user.uid,
        title: sanitizedTitle,
        price: parseFloat(price),
        description: sanitizedDescription,
        city,
        area: sanitizedArea,
        category: catId,
        condition,
        itemAge,
        accessories,
        status: 'active',
        isNegotiable: isNegotiable,
        is_urgent: isUrgent,
        minPrice: minPrice ? parseFloat(minPrice) : null,
        contactPreferences: contactPrefs,
        idempotencyKey: editId ? undefined : idempotencyKey,
        ...(isRelist ? { relistedFrom: relistId } : {})
      };
      Object.keys(firestorePayload).forEach(k => firestorePayload[k] === undefined && delete firestorePayload[k]);

      let newListingId = editId;
      if (editId && !isRelist) {
        await updateListing(editId, firestorePayload);
        await logAuditEvent({ action: 'listing_updated', resource_type: 'listing', resource_id: editId, status: 'success' });
      } else {
        const created = await createListing(firestorePayload as any);
        newListingId = created.id;
        await logAuditEvent({ action: isRelist ? 'listing_relisted' : 'listing_created', resource_type: 'listing', resource_id: created.id, status: 'success', metadata: { category: catId, city, ...(isRelist ? { relisted_from: relistId } : {}) } });
      }
      setCreatedListingId(newListingId);

      if (!newListingId) throw new Error('No listing ID available');

      // Upload new photos
      const newPhotos = photos.filter(p => p.file);
      const existingImages = photos
        .filter(p => !p.file && p.preview)
        .map((p, i) => ({ id: p.id || '', url: p.preview, alt: `Image ${i + 1}` }));

      let uploadedImages: Array<{ id: string; url: string; alt: string }> = [];
      if (newPhotos.length > 0) {
        const uploads = await uploadListingImages(newPhotos.map(p => p.file!), newListingId);
        uploadedImages = uploads.map((upload, index) => ({
          id: upload.path.split('/').pop() || '',
          url: upload.url,
          alt: `Image ${existingImages.length + index + 1}`
        }));
      }

      const finalImages = [...existingImages, ...uploadedImages];
      await updateListing(newListingId, { images: finalImages } as any);

      saveContactPreferences(contactPrefs);
      if (userId) clearDraft(userId);

      setStep(5);
    } catch (err: any) {
      const safeError = sanitizeErrorMessage(err);
      showToast(safeError, 'error');
      await logAuditEvent({ action: editId ? 'listing_update_failed' : (isRelist ? 'listing_relist_failed' : 'listing_creation_failed'), status: 'failed', metadata: { error: safeError } });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 bg-warm-50">
      <Loader2 className="h-10 w-10 animate-spin text-teal-500" />
      <p className="text-xs font-bold uppercase tracking-widest text-warm-400">Loading listing…</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-32">
      {/* Draft resume sheet */}
      {showDraftSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-8 space-y-6 shadow-2xl">
            <div className="w-10 h-1 bg-warm-200 rounded-full mx-auto" />
            <div className="text-center space-y-1">
              <div className="text-4xl mb-2">📝</div>
              <h3 className="text-xl font-heading font-bold text-midnight-700">Continue your draft?</h3>
              <p className="text-warm-400 text-sm">You have an unsaved listing. Want to pick up where you left off?</p>
            </div>
            <div className="space-y-3">
              <ContinueButton onClick={resumeDraft} label="Continue Editing" />
              <button onClick={discardDraft} className="w-full py-3 bg-warm-100 text-midnight-700 rounded-2xl font-bold text-sm">Start Fresh</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-card-hover overflow-hidden border border-warm-200">
        {/* Teal progress bar */}
        {step <= TOTAL_STEPS && (
          <div className="h-1.5 bg-warm-100">
            <div
              className={`h-full bg-teal-gradient transition-all duration-500 ${step === 1 ? 'w-1/2' : 'w-full'}`}
            />
          </div>
        )}

        <div className="p-8 md:p-12">
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <StepHeader title={editId ? 'Update Photos' : isRelist ? 'Relist — Confirm Photos' : 'Add Photos'} stepLabel={`Step 1 of ${TOTAL_STEPS} — Photos`} />
              {isRelist && (
                <div className="flex items-center gap-3 p-4 bg-teal-50 rounded-2xl border border-teal-100">
                  <RefreshCw size={18} className="text-teal-500" />
                  <div>
                    <span className="text-teal-700 text-sm font-bold block">Relisting from a previous ad</span>
                    <span className="text-teal-600 text-xs">All details have been carried over. Review and publish!</span>
                  </div>
                </div>
              )}
              <div
                onClick={() => photos.length < 8 && fileInputRef.current?.click()}
                className={`min-h-[240px] border-2 border-dashed border-warm-200 rounded-3xl flex flex-col items-center justify-center bg-warm-50 transition-all p-6 group ${photos.length < 8 ? 'hover:bg-teal-50 hover:border-teal-300 cursor-pointer' : 'cursor-default'}`}
              >
                <input type="file" multiple accept="image/*" hidden ref={fileInputRef} onChange={e => handleFiles(e.target.files)} />
                {photos.length === 0 ? (
                  <>
                    <Camera size={48} className="text-warm-300 mb-3 group-hover:text-teal-400 transition-colors" />
                    <span className="font-heading font-bold text-midnight-700 text-lg">{COPY.CREATE_LISTING.PHOTO_HINT}</span>
                    <span className="font-medium text-warm-400 text-sm mt-1">Up to 8 · AI-optimized automatically</span>
                  </>
                ) : (
                  <div className="flex gap-3 overflow-x-auto w-full p-1 hide-scrollbar">
                    {photos.map((item, i) => (
                      <ImageUploadPreview
                        key={item.id}
                        item={item}
                        index={i}
                        onRemove={handleRemovePhoto}
                        onRetry={retryUpload}
                      />
                    ))}
                    {photos.length < 8 && (
                      <div className="w-28 h-28 flex items-center justify-center bg-warm-100 rounded-2xl border-2 border-dashed border-warm-200 text-warm-300 flex-shrink-0 group-hover:border-teal-300 group-hover:text-teal-400 transition-colors">
                        <PlusCircle size={28} />
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-center text-warm-400 text-sm font-medium">{photos.length} of 8 photos added</p>
              {aiLoading && (
                <div className="flex items-center gap-3 p-4 bg-teal-50 rounded-2xl border border-teal-100">
                  <Sparkles size={18} className="text-teal-500 animate-pulse" />
                  <span className="text-teal-700 text-sm font-bold">AI is analyzing your photo…</span>
                </div>
              )}
              {/* Basic Details Section */}
              <div className="space-y-6 pt-6 border-t border-warm-100">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-warm-400 uppercase tracking-widest">Title</label>
                    <span className="text-xs font-medium text-warm-300">{title.length}/100</span>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. Fresh Snapper from Havelock"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    maxLength={100}
                    className="input-island"
                  />
                  {aiSuggestion?.suggested_title && title !== aiSuggestion.suggested_title && (
                    <button onClick={() => setTitle(aiSuggestion.suggested_title!)} className="flex items-center gap-2 px-4 py-2 bg-teal-50 rounded-full text-teal-700 text-sm font-bold border border-teal-100 hover:bg-teal-100 transition-colors">
                      <Sparkles size={13} className="text-teal-500" /> Use AI Suggestion
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-warm-400 uppercase tracking-widest">Category</label>
                  <select
                    value={category || ''}
                    onChange={e => setCategory(e.target.value)}
                    className="input-island"
                    title="Select a category"
                  >
                    <option value="" disabled>Select a category</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-warm-400 uppercase tracking-widest">Price (₹)</label>
                  <input
                    type="number"
                    placeholder={COPY.CREATE_LISTING.PRICE_PLACEHOLDER}
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    className="w-full p-4 bg-white rounded-2xl border border-warm-200 focus:border-teal-400 focus:ring-4 focus:ring-teal-100 outline-none font-heading font-black text-2xl text-midnight-700 transition-all"
                  />
                  {aiSuggestion?.estimated_price_range && (
                    <p className="text-xs font-bold text-teal-600 px-1">
                      💡 Market Range: ₹{aiSuggestion.estimated_price_range.low}–₹{aiSuggestion.estimated_price_range.high}
                    </p>
                  )}
                  <div className="flex items-center justify-between px-1 pt-2">
                    <label htmlFor="isNegotiable" className="text-sm font-bold text-midnight-700">Negotiable</label>
                    <input id="isNegotiable" title="Toggle negotiability" type="checkbox" role="switch" checked={isNegotiable} onChange={e => setIsNegotiable(e.target.checked)} className="toggle toggle-accent" />
                  </div>
                  <div className="flex items-center justify-between px-1 pt-2 border-t border-warm-100/50 mt-2">
                    <div className="flex items-center gap-2">
                      <label htmlFor="isUrgent" className="text-sm font-bold text-midnight-700">Urgent Sale</label>
                      <Sparkles size={14} className="text-amber-500 fill-amber-100" />
                    </div>
                    <input id="isUrgent" title="Mark as urgent" type="checkbox" role="switch" checked={isUrgent} onChange={e => setIsUrgent(e.target.checked)} className="toggle toggle-warning" />
                  </div>
                  {isUrgent && (
                    <p className="text-[10px] font-bold text-amber-600 px-1 mt-1">
                      ⚡ Urgent tag helps you sell faster by attracting quick buyers.
                    </p>
                  )}
                  {isNegotiable && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-warm-400 uppercase tracking-widest">Min Price (Optional)</label>
                      <input type="number" aria-label="Minimum accepted price" placeholder="Hidden from buyers" value={minPrice} onChange={e => setMinPrice(e.target.value)} className="input-island text-sm" />
                    </div>
                  )}
                </div>
              </div>

              <ContinueButton onClick={nextStep} disabled={photos.length === 0 || !title || !category || !price || photos.some(p => p.status === 'compressing' || p.status === 'error')} />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <StepHeader title="Category & Details" stepLabel={`Step 2 of ${TOTAL_STEPS} — Details`} />
              <div className="space-y-2">
                <label className="text-xs font-bold text-warm-400 uppercase tracking-widest leading-loose">What are you listing today?</label>
                <div className="flex flex-col gap-3">
                  {CATEGORIES.map(cat => {
                    const iconMap: Record<string, any> = {
                      mobiles: Smartphone, vehicles: Car, home: Sofa, fashion: Shirt, property: HomeIcon, services: Zap, other: ShoppingBag
                    };
                    const labelMap: Record<string, string> = {
                      mobiles: 'Mobiles, Tablets & Accessories', vehicles: 'Cars, Bikes & Scooters', home: 'Furniture, Appliances & Decor', fashion: 'Fashion, Clothing & Watch', property: 'Property & Real Estate', services: 'Services & Jobs', other: 'Everything Else'
                    };
                    const subMap: Record<string, string> = {
                      mobiles: 'Phones, Accessories', vehicles: 'Cars, Bikes, Scooters', home: 'Sofas, Beds, Kitchen', fashion: 'Men, Women, Kids', property: 'Rent, Sale, Land', services: 'Cleaning, Plumber, Handyman', other: 'Miscellaneous'
                    };
                    const Icon = iconMap[cat.id] || ShoppingBag;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setCategory(cat.name)}
                        className={`w-full flex items-center justify-between p-4 bg-white rounded-xl border transition-all text-left shadow-sm ${category === cat.name
                          ? 'border-teal-400 bg-teal-50 ring-2 ring-teal-100 shadow-teal-glow'
                          : 'border-warm-200 hover:border-teal-200 active:scale-[0.98]'
                          }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${category === cat.name ? 'bg-teal-600 text-white shadow-sm' : 'bg-warm-100 text-midnight-600'}`}>
                            <Icon size={24} />
                          </div>
                          <div>
                            <span className={`block font-bold text-sm leading-tight ${category === cat.name ? 'text-teal-800' : 'text-midnight-700'}`}>{labelMap[cat.id] || cat.name}</span>
                            <span className="block text-xs text-warm-400 mt-1">{subMap[cat.id] || cat.name}</span>
                          </div>
                        </div>
                        <ChevronRight className={category === cat.name ? 'text-teal-500' : 'text-warm-300'} />
                      </button>
                    )
                  })}
                </div>
                {preCategory && ['fresh-catch', 'produce'].includes(preCategory) && (
                  <p className="text-sm text-teal-600 font-medium mt-2 px-1">{COPY.CREATE_LISTING.CATEGORY_FISH}</p>
                )}
                {category === 'Vehicles' && (
                  <p className="text-sm text-teal-600 font-medium mt-2 px-1">{COPY.CREATE_LISTING.CATEGORY_VEHICLES}</p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-warm-400 uppercase tracking-widest">Title</label>
                  <span className="text-xs font-medium text-warm-300">{title.length}/100</span>
                </div>
                <input
                  type="text"
                  placeholder="e.g. Fresh Snapper from Havelock"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  maxLength={100}
                  className="input-island"
                />
                {aiSuggestion?.suggested_title && title !== aiSuggestion.suggested_title && (
                  <button onClick={() => setTitle(aiSuggestion.suggested_title!)} className="flex items-center gap-2 px-4 py-2 bg-teal-50 rounded-full text-teal-700 text-sm font-bold border border-teal-100 hover:bg-teal-100 transition-colors">
                    <Sparkles size={13} className="text-teal-500" /> Use AI Suggestion
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-warm-400 uppercase tracking-widest">Description</label>
                  <span className="text-xs font-medium text-warm-300">{description.length}/2000</span>
                </div>
                <textarea
                  placeholder="Describe the item — condition, any included accessories, story..."
                  rows={5}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  maxLength={2000}
                  className="input-island resize-none"
                />
                {aiSuggestion?.suggested_description && description !== aiSuggestion.suggested_description && (
                  <button onClick={() => setDescription(aiSuggestion.suggested_description!)} className="flex items-center gap-2 px-4 py-2 bg-teal-50 rounded-full text-teal-700 text-sm font-bold border border-teal-100 hover:bg-teal-100 transition-colors">
                    <Sparkles size={13} className="text-teal-500" /> Use AI Description
                  </button>
                )}
              </div>
              <ContinueButton onClick={nextStep} disabled={!category || !title || !description} />
              <BackButton onClick={prevStep} />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <StepHeader title="Price & Location" stepLabel={`Step 3 of ${TOTAL_STEPS} — Details`} />

              <div className="space-y-4 p-5 bg-warm-50 rounded-3xl border border-warm-200">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-warm-400 uppercase tracking-widest">Expected Price (₹)</label>
                  <input
                    type="number"
                    placeholder={COPY.CREATE_LISTING.PRICE_PLACEHOLDER}
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    className="w-full p-4 bg-white rounded-2xl border border-warm-200 focus:border-teal-400 focus:ring-4 focus:ring-teal-100 outline-none font-heading font-black text-2xl text-midnight-700 transition-all"
                  />
                  {aiSuggestion?.estimated_price_range && (
                    <p className="text-xs font-bold text-teal-600 px-1">
                      💡 Market Range: ₹{aiSuggestion.estimated_price_range.low}–₹{aiSuggestion.estimated_price_range.high}
                    </p>
                  )}
                </div>

                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between px-1">
                    <label htmlFor="isNegotiable" className="text-sm font-bold text-midnight-700">Negotiable</label>
                    <input id="isNegotiable" title="Toggle negotiability" type="checkbox" role="switch" checked={isNegotiable} onChange={e => setIsNegotiable(e.target.checked)} className="toggle toggle-accent" />
                  </div>
                  {isNegotiable && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-warm-400 uppercase tracking-widest">Minimum Accepted Price (Optional)</label>
                      <input type="number" aria-label="Minimum accepted price" placeholder="Hidden from buyers" value={minPrice} onChange={e => setMinPrice(e.target.value)} className="input-island" />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-warm-400 uppercase tracking-widest">Condition</label>
                <div className="grid grid-cols-2 gap-3">
                  {CONDITION_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setCondition(opt.value as ItemCondition)}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${condition === opt.value ? 'bg-teal-50 border-teal-400' : 'bg-warm-50 border-warm-200 hover:border-teal-200'
                        }`}
                    >
                      <span className={`font-bold text-sm ${condition === opt.value ? 'text-teal-700' : 'text-midnight-700'}`}>{opt.label}</span>
                      <p className="text-[10px] text-warm-400 leading-tight mt-0.5">{opt.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-warm-400 uppercase tracking-widest">Item Age</label>
                <div className="grid grid-cols-3 gap-2">
                  {ITEM_AGE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setItemAge(opt.value as ItemAge)}
                      className={`py-3 px-1 rounded-xl border-2 text-center transition-all text-[10px] uppercase tracking-tight font-bold ${itemAge === opt.value ? 'bg-teal-50 border-teal-400 text-teal-700' : 'bg-warm-50 border-warm-200 text-midnight-700'
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-warm-400 uppercase tracking-widest">Included Accessories</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Charger, Box"
                    value={accessoryInput}
                    onChange={e => setAccessoryInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), accessoryInput.trim() && setAccessories(prev => [...prev.slice(-14), accessoryInput.trim()]), setAccessoryInput(''))}
                    className="flex-1 input-island"
                  />
                  <button
                    onClick={() => { if (accessoryInput.trim()) { setAccessories(prev => [...prev.slice(-14), accessoryInput.trim()]); setAccessoryInput(''); } }}
                    className="px-5 bg-teal-600 text-white rounded-2xl font-bold text-sm hover:bg-teal-700 transition-colors active:scale-95"
                  >Add</button>
                </div>
                {accessories.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {accessories.map((acc, i) => (
                      <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-700 border border-teal-100 rounded-full text-[11px] font-bold">
                        {acc}
                        <button onClick={() => setAccessories(prev => prev.filter((_, idx) => idx !== i))} aria-label="Remove accessory" className="hover:text-coral-500"><X size={11} /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-warm-100">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-warm-400 uppercase tracking-widest">Island/City</label>
                  <select
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    title="Select island or city"
                    aria-label="Island or City"
                    className="input-island"
                  >
                    {ANDAMAN_CITIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-warm-400 uppercase tracking-widest">Local Area</label>
                  <input placeholder="e.g. Garacharma" value={area} onChange={e => setArea(e.target.value)} className="input-island" />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-warm-400 uppercase tracking-widest">Contact Preferences</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-4 p-4 bg-warm-50 rounded-2xl border border-warm-200 cursor-pointer">
                    <input type="checkbox" checked={true} disabled className="w-5 h-5 rounded accent-teal-600" />
                    <span className="font-bold text-midnight-700">In-app Chat</span>
                    <span className="text-xs text-warm-400 ml-auto">Always on</span>
                  </label>
                  <label className="flex items-center gap-4 p-4 bg-warm-50 rounded-2xl border border-warm-200 cursor-pointer hover:border-teal-200 transition-colors">
                    <input type="checkbox" checked={contactPrefs.phone || false} onChange={e => setContactPrefs((p: ContactPreferences) => ({ ...p, phone: e.target.checked }))} className="w-5 h-5 rounded accent-teal-600" />
                    <span className="font-bold text-midnight-700">Show My Phone Number</span>
                  </label>
                  <label className="flex items-center gap-4 p-4 bg-warm-50 rounded-2xl border border-warm-200 cursor-pointer hover:border-teal-200 transition-colors">
                    <input type="checkbox" checked={contactPrefs.whatsapp || false} onChange={e => setContactPrefs((p: ContactPreferences) => ({ ...p, whatsapp: e.target.checked }))} className="w-5 h-5 rounded accent-teal-600" />
                    <span className="font-bold text-midnight-700">Receive WhatsApp Messages</span>
                  </label>
                </div>
              </div>

              <ContinueButton onClick={nextStep} disabled={!price || !area} label="Review Listing" />
              <BackButton onClick={prevStep} />
            </div>
          )}


          {step === 5 && (
            <div className="text-center py-12 space-y-6 animate-fade-in">
              <div className="text-7xl animate-float">🏝️</div>
              <div className="space-y-2">
                <h2 className="text-3xl font-heading font-black text-midnight-700">{editId ? 'Listing Updated!' : isRelist ? 'Relisted!' : 'Published!'}</h2>
                <p className="text-warm-400 font-medium">{COPY.SUCCESS.LISTING_PUBLISHED}</p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-700 rounded-full text-sm font-bold mt-2 border border-teal-100">
                  <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" /> Live Now
                </div>
              </div>

              {/* Social Sharing */}
              {createdListingId && !editId && (
                <div className="pt-6 border-t border-warm-100 mt-6 animate-fade-in delay-200">
                  <h3 className="font-bold text-midnight-700 text-sm uppercase tracking-widest mb-4">Share your listing</h3>
                  <div className="flex justify-center gap-4">
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/listings/${createdListingId}`;
                        const text = `Check out my new listing on AndamanBazaar: ${title}`;
                        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
                        logAuditEvent({ action: 'share_intent', resource_type: 'listing', resource_id: createdListingId, metadata: { platform: 'whatsapp' } });
                      }}
                      className="w-14 h-14 rounded-2xl bg-[#25D366]/10 text-[#25D366] flex items-center justify-center hover:bg-[#25D366]/20 hover:scale-105 transition-all shadow-sm"
                      title="Share on WhatsApp"
                      aria-label="Share on WhatsApp"
                    >
                      <Share2 size={24} />
                    </button>
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/listings/${createdListingId}`;
                        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
                        logAuditEvent({ action: 'share_intent', resource_type: 'listing', resource_id: createdListingId, metadata: { platform: 'facebook' } });
                      }}
                      className="w-14 h-14 rounded-2xl bg-[#1877F2]/10 text-[#1877F2] flex items-center justify-center hover:bg-[#1877F2]/20 hover:scale-105 transition-all shadow-sm"
                      title="Share on Facebook"
                      aria-label="Share on Facebook"
                    >
                      <Facebook size={24} />
                    </button>
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/listings/${createdListingId}`;
                        navigator.clipboard.writeText(url);
                        showToast(COPY.TOAST.SAVE_SUCCESS, 'success');
                        logAuditEvent({ action: 'share_intent', resource_type: 'listing', resource_id: createdListingId, metadata: { platform: 'copy_link' } });
                      }}
                      className="w-14 h-14 rounded-2xl bg-warm-100 text-midnight-600 flex items-center justify-center hover:bg-warm-200 hover:scale-105 transition-all shadow-sm"
                      title="Copy Link"
                      aria-label="Copy Link"
                    >
                      <LinkIcon size={24} />
                    </button>
                  </div>
                </div>
              )}

              {/* Upsell to Boost */}
              {createdListingId && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-6 border border-amber-200 mt-6 shadow-sm hover:shadow-md transition-shadow text-left">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white flex-shrink-0 shadow-inner">
                      <Rocket size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-midnight-700 text-lg mb-1 tracking-tight">Sell it 3x faster</h3>
                      <p className="text-sm text-warm-500 font-medium mb-4">
                        Feature your ad at the top of the {category || 'marketplace'} category and home page.
                      </p>
                      <button
                        onClick={() => setIsBoostModalOpen(true)}
                        className="w-full bg-midnight-700 hover:bg-midnight-800 text-white font-bold py-3 px-6 rounded-2xl transition-all shadow-md flex justify-center items-center gap-2"
                      >
                        Boost My Ad Now
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-6 border-t border-warm-100 mt-6">
                <button onClick={() => navigate(createdListingId ? `/listings/${createdListingId}` : '/listings')} className="btn-primary w-full py-4">View My Listing</button>
                <button
                  onClick={() => { setStep(1); setPhotos([]); setTitle(''); setDescription(''); setPrice(''); setCategory(null); setCondition('good'); setCreatedListingId(null); }}
                  className="btn-secondary w-full py-4"
                >Post Another Ad</button>
                <button onClick={() => navigate('/profile')} className="w-full py-3 text-warm-400 font-bold text-sm hover:text-midnight-700 transition-colors">Go to Profile</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Boost Modal */}
      {createdListingId && (
        <BoostListingModal
          isOpen={isBoostModalOpen}
          onClose={() => setIsBoostModalOpen(false)}
          listingId={createdListingId}
          listingTitle={title}
        />
      )}
    </div>
  );
};
