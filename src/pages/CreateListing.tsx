import React, { useState, useRef, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, auth, storage } from '../lib/firebase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Camera, PlusCircle, Check, MapPin, ChevronRight, AlertCircle, Loader2, X, Sparkles, Smartphone, Car, Sofa, Shirt, Home as HomeIcon, Zap, ShoppingBag, Rocket, Share2, Facebook, Link as LinkIcon } from 'lucide-react';
import { compressImage } from '../lib/utils';
import { listingSchema, sanitizePlainText, detectPromptInjection, validateFileUpload } from '../lib/validation';
import { logAuditEvent, sanitizeErrorMessage } from '../lib/security';
import { ItemCondition, ItemAge, ContactPreferences, AiSuggestion } from '../types';
import {
  saveDraft, loadDraft, clearDraft, hasDraft, generateIdempotencyKey, debounce,
  ANDAMAN_CITIES, ITEM_AGE_OPTIONS, CONDITION_OPTIONS, CATEGORIES,
  loadContactPreferences, saveContactPreferences, DEFAULT_CONTACT_PREFERENCES,
} from '../lib/postAdUtils';
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
  const preCategory = searchParams.get('cat');
  const bypassAuth = import.meta.env.VITE_E2E_BYPASS_AUTH === 'true' || searchParams.get('e2e') === '1';

  // Step management
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!editId);
  const [showDraftSheet, setShowDraftSheet] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { showToast } = useToast();

  // Form state
  const [photos, setPhotos] = useState<{ file?: File; preview: string; id?: string }[]>([]);
  const [deletedPhotoIds, setDeletedPhotoIds] = useState<string[]>([]);
  const [processingImages, setProcessingImages] = useState(false);
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

  const debouncedSave = useCallback(
    debounce((uid: string) => {
      saveDraft(uid, {
        step, category: category || undefined, title, description, price, condition,
        is_negotiable: isNegotiable, min_price: minPrice, item_age: itemAge || undefined,
        city, area, contact_preferences: contactPrefs,
        image_previews: photos.map(p => p.preview).slice(0, 3),
        idempotency_key: idempotencyKey, accessories,
      });
    }, 3000),
    [step, category, title, description, price, condition, isNegotiable, city, area, contactPrefs, photos, idempotencyKey]
  );

  useEffect(() => {
    if (userId && !editId && step < 6) debouncedSave(userId);
  }, [userId, step, title, description, price, category, condition, city, area, debouncedSave, editId]);

  useEffect(() => {
    const init = async () => {
      const user = bypassAuth
        ? ({ uid: 'e2e-user', email: 'e2e@example.com' } as any)
        : auth.currentUser;
      if (!user) { navigate('/auth'); return; }
      setUserId(user.uid);

      if (bypassAuth) {
        setIsVerified(true);
        setCity('Port Blair');
        setArea('Aberdeen');
      } else {
        const profileSnap = await getDoc(doc(db, 'profiles', user.uid));
        const profile = profileSnap.exists() ? profileSnap.data() : null;
        
        if (profile?.is_location_verified) {
          const verifiedAt = profile.location_verified_at ? new Date(profile.location_verified_at).getTime() : 0;
          const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
          const needsReverification = !verifiedAt || (Date.now() - verifiedAt > ninetyDaysMs);
          
          if (needsReverification) {
            setIsVerified(false);
          } else {
            setIsVerified(true);
          }
        }

        if (profile?.city) setCity(profile.city);
        if (profile?.area) setArea(profile.area || '');
      }

      setContactPrefs(loadContactPreferences());

      if (editId) {
        try {
          const listingSnap = await getDoc(doc(db, 'listings', editId));
          const listing = listingSnap.exists() ? { id: listingSnap.id, ...listingSnap.data() } as any : null;
          if (listing) {
            // Fetch listing images from subcollection
            const imagesSnap = await getDocs(query(collection(db, 'listing_images'), where('listing_id', '==', editId)));
            listing.images = imagesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setTitle(listing.title);
            setPrice(listing.price.toString());
            setDescription(listing.description || '');
            setCity(listing.city);
            setArea(listing.area || '');
            setCondition(listing.condition || 'good');
            setItemAge(listing.item_age || null);
            setAccessories(listing.accessories || []);
            setIsNegotiable(listing.is_negotiable ?? true);
            setMinPrice(listing.min_price?.toString() || '');
            setContactPrefs(listing.contact_preferences || DEFAULT_CONTACT_PREFERENCES);
            if (listing.category_id) {
              const cat = CATEGORIES.find(c => c.id === listing.category_id);
              setCategory(cat ? cat.name : listing.category_id);
            }
            if (listing.images) {
              setPhotos(listing.images.sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0)).map((img: any) => ({ preview: img.image_url, id: img.id })));
            }
            setStep(1);
          }
        } catch (err) { console.error('Fetch listing error:', err); }
        setFetching(false);
      } else {
        if (hasDraft(user.uid)) {
          setShowDraftSheet(true);
        }
        if (preCategory) {
          const cat = CATEGORIES.find(c => c.id === preCategory);
          if (cat) setCategory(cat.name);
        }
      }
    };
    init();
  }, [editId, navigate, preCategory]);

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
    setContactPrefs(draft.contact_preferences || DEFAULT_CONTACT_PREFERENCES);
    setStep(draft.step || 1);
    setShowDraftSheet(false);
  };

  const discardDraft = () => {
    if (userId) clearDraft(userId);
    setShowDraftSheet(false);
  };

  const TOTAL_STEPS = 4;
  const nextStep = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); setStep(s => s + 1); };
  const prevStep = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); setStep(s => s - 1); };
  const goToStep = (s: number) => { window.scrollTo({ top: 0, behavior: 'smooth' }); setStep(s); };

  const handleFiles = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    const remaining = 8 - photos.length;
    if (remaining <= 0) { showToast('Maximum 8 photos allowed', 'error'); return; }
    setProcessingImages(true);
    const files = Array.from(selectedFiles).slice(0, remaining);
    const newPhotos: typeof photos = [];
    for (const file of files) {
      const validation = validateFileUpload(file, { maxSizeMB: 10, allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'] });
      if (!validation.valid) { showToast(validation.error || 'An unknown file validation error occurred.', 'error'); continue; }

      try {
        const compressed = await compressImage(file);
        const preview = URL.createObjectURL(compressed);
        newPhotos.push({ file: compressed, preview });
      } catch (error) {
        console.error("Image compression failed", error);
        showToast('Failed to process image', 'error');
      }
    }
    setPhotos(prev => [...prev, ...newPhotos]);
    setProcessingImages(false);

    const firstFile = newPhotos[0]?.file;
    if (photos.length === 0 && firstFile && !aiSuggestion) {
      getAiSuggestion(firstFile);
    }
  };

  const removePhoto = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const photo = photos[index];
    if (photo.id) setDeletedPhotoIds(prev => [...prev, photo.id!]);
    if (photo.preview.startsWith('blob:')) URL.revokeObjectURL(photo.preview);
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const getAiSuggestion = async (imageFile: File) => {
    try {
      const apiKey = import.meta.env.VITE_API_KEY;
      if (!apiKey) return;
      setAiLoading(true);
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const reader = new FileReader();
      const base64 = await new Promise<string>(res => { reader.onload = () => res((reader.result as string).split(',')[1]); reader.readAsDataURL(imageFile); });
      const result = await model.generateContent([
        { inlineData: { mimeType: 'image/webp', data: base64 } },
        `Analyze this product image for a local marketplace listing in the Andaman Islands, India. 
        Return ONLY valid JSON with these fields:
        {
          "suggested_title": "concise title max 80 chars",
          "suggested_description": "2-3 compelling sentences",
          "suggested_category": "one of: mobiles,vehicles,home,fashion,property,services,other",
          "suggested_condition": "one of: new,like_new,good,fair",
          "estimated_price_range": {"low": number, "high": number}
        }`
      ]);
      const text = result.response.text();
      const json = JSON.parse(text.replace(/```json\n?|```/g, '').trim()) as AiSuggestion;
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
      
      const functions = getFunctions();
      const verifyLocation = httpsCallable(functions, 'verifyLocation');
      let data: any;
      try {
        const result = await verifyLocation({ latitude, longitude });
        data = result.data;
      } catch (fnErr: any) {
        console.error('Verification error:', fnErr);
        showToast('Verification service unavailable. Please try again later.', 'error');
        setIsVerifying(false);
        return;
      }
      
      if (data?.code === 'RATE_LIMITED') {
        const retryMinutes = Math.ceil((data.retryAfterSeconds || 3600) / 60);
        showToast(`Too many attempts. Please try again in ${retryMinutes} minutes.`, 'warning');
      } else if (data?.verified) {
        setIsVerified(true);
        showToast(data.message || 'Island residency verified!', 'success');
        if (data.warning) {
          setTimeout(() => showToast(data.warning, 'warning'), 2000);
        }
      } else {
        const errorMsg = data?.error || 'Location could not be verified as Andaman & Nicobar Islands.';
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

      const payload: Record<string, any> = {
        user_id: user.uid,
        title: sanitizedTitle,
        price: parseFloat(price),
        description: sanitizedDescription,
        city,
        area: sanitizedArea,
        category_id: catId,
        condition,
        item_age: itemAge,
        accessories,
        status: 'active',
        is_negotiable: isNegotiable,
        min_price: minPrice ? parseFloat(minPrice) : null,
        contact_preferences: contactPrefs,
        idempotency_key: editId ? undefined : idempotencyKey
      };
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

      let newListingId = editId;
      if (editId) {
        const listingRef = doc(db, 'listings', editId);
        await updateDoc(listingRef, payload);
        if (deletedPhotoIds.length > 0) {
          for (const pid of deletedPhotoIds) {
            await deleteDoc(doc(db, 'listing_images', pid));
          }
        }
        await logAuditEvent({ action: 'listing_updated', resource_type: 'listing', resource_id: editId, status: 'success' });
      } else {
        const newDocRef = await addDoc(collection(db, 'listings'), { ...payload, created_at: new Date().toISOString() });
        newListingId = newDocRef.id;
        await logAuditEvent({ action: 'listing_created', resource_type: 'listing', resource_id: newDocRef.id, status: 'success', metadata: { category: catId, city } });
      }
      setCreatedListingId(newListingId);

      // Preserve UI order by using each photo's index as display_order.
      const newPhotosWithIndex = photos.map((p, index) => ({ ...p, desiredIndex: index })).filter(p => p.file);

      for (const item of newPhotosWithIndex) {
        const { file, desiredIndex } = item;
        const fileName = `listings/${user.uid}/${safeRandomUUID()}.webp`;
        const storageRef = ref(storage, fileName);
        try {
          await uploadBytes(storageRef, file!, { contentType: 'image/webp' });
          const publicUrl = await getDownloadURL(storageRef);
          if (newListingId && publicUrl) {
            await addDoc(collection(db, 'listing_images'), { listing_id: newListingId, image_url: publicUrl, display_order: desiredIndex });
          }
        } catch (uploadErr) {
          console.warn('Image upload failed, skipping:', uploadErr);
          continue;
        }
      }

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        if (photo.id) {
          // Update existing photo's order to match current UI state
          await updateDoc(doc(db, 'listing_images', photo.id), { display_order: i });
        }
      }

      saveContactPreferences(contactPrefs);
      if (userId) clearDraft(userId);

      setStep(5);
    } catch (err: any) {
      const safeError = sanitizeErrorMessage(err);
      showToast(safeError, 'error');
      await logAuditEvent({ action: editId ? 'listing_update_failed' : 'listing_creation_failed', status: 'failed', metadata: { error: safeError } });
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
              className={`h-full bg-teal-gradient transition-all duration-500 ${step === 1 ? 'w-1/4' :
                step === 2 ? 'w-2/4' :
                  step === 3 ? 'w-3/4' :
                    'w-full'
                }`}
            />
          </div>
        )}

        <div className="p-8 md:p-12">
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <StepHeader title={editId ? 'Update Photos' : 'Add Photos'} stepLabel={`Step 1 of ${TOTAL_STEPS} — Photos`} />
              <div
                onClick={() => !processingImages && fileInputRef.current?.click()}
                className={`min-h-[240px] border-2 border-dashed border-warm-200 rounded-3xl flex flex-col items-center justify-center bg-warm-50 hover:bg-teal-50 hover:border-teal-300 transition-all cursor-pointer p-6 group ${processingImages ? 'opacity-60 cursor-wait' : ''
                  }`}
              >
                <input type="file" multiple accept="image/*" hidden ref={fileInputRef} onChange={e => handleFiles(e.target.files)} disabled={processingImages} />
                {processingImages ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 size={36} className="text-teal-500 animate-spin" />
                    <span className="font-bold text-midnight-700 text-sm">Optimizing Images…</span>
                  </div>
                ) : photos.length === 0 ? (
                  <>
                    <Camera size={48} className="text-warm-300 mb-3 group-hover:text-teal-400 transition-colors" />
                    <span className="font-heading font-bold text-midnight-700 text-lg">{COPY.CREATE_LISTING.PHOTO_HINT}</span>
                    <span className="font-medium text-warm-400 text-sm mt-1">Up to 8 · AI-optimized automatically</span>
                  </>
                ) : (
                  <div className="flex gap-3 overflow-x-auto w-full p-1 hide-scrollbar">
                    {photos.map((p, i) => (
                      <div key={i} className="relative w-28 h-28 rounded-2xl overflow-hidden flex-shrink-0 shadow-card border-2 border-white">
                        <img src={p.preview} className="w-full h-full object-cover" alt={`Photo ${i + 1}`} />
                        {i === 0 && (
                          <div className="absolute top-1.5 left-1.5 bg-teal-600 text-white rounded-full px-2 py-0.5 text-[9px] font-black uppercase">Cover</div>
                        )}
                        <button
                          onClick={e => removePhoto(i, e)}
                          aria-label="Remove photo"
                          className="absolute top-1.5 right-1.5 bg-coral-500/90 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-coral-glow hover:bg-coral-600 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {photos.length < 8 && (
                      <div className="w-28 h-28 flex items-center justify-center bg-warm-100 rounded-2xl border-2 border-dashed border-warm-200 text-warm-300 flex-shrink-0">
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
              <ContinueButton onClick={nextStep} disabled={photos.length === 0 || processingImages} />
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

          {step === 4 && (
            <div className="space-y-6 animate-fade-in">
              <StepHeader title="Review & Publish" stepLabel={`Step 4 of ${TOTAL_STEPS} — Final Review`} />

              {/* Preview card */}
              <div className="p-5 bg-warm-50 rounded-3xl border border-warm-200 flex items-center gap-5 text-left shadow-card">
                {photos[0] && <img src={photos[0].preview} className="w-24 h-24 rounded-2xl object-cover shadow-card border-2 border-white flex-shrink-0" alt="Cover" />}
                <div className="flex-1 overflow-hidden">
                  <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest mb-1">{category}</p>
                  <p className="font-heading font-black text-midnight-700 truncate text-xl">{title}</p>
                  <p className="text-2xl font-heading font-black text-teal-600 mt-1">₹{parseFloat(price || '0').toLocaleString('en-IN')}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-[9px] font-bold bg-warm-200 text-midnight-700 px-2.5 py-1 rounded-full uppercase">{condition.replace('_', ' ')}</span>
                    {isNegotiable && (
                      <span className="text-[9px] font-bold bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full border border-teal-100 uppercase">
                        Negotiable{minPrice && ` (Min: ₹${parseInt(minPrice)})`}
                      </span>
                    )}
                    {itemAge && (
                      <span className="text-[9px] font-bold bg-warm-200 text-midnight-700 px-2.5 py-1 rounded-full uppercase">
                        {ITEM_AGE_OPTIONS.find(o => o.value === itemAge)?.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {accessories.length > 0 && (
                  <div className="p-4 bg-warm-50 rounded-2xl border border-warm-200">
                    <p className="text-[10px] font-bold text-warm-400 uppercase tracking-widest mb-2">Accessories</p>
                    <div className="flex flex-wrap gap-1.5">
                      {accessories.map((acc, i) => (
                        <span key={i} className="px-2.5 py-1 bg-teal-50 text-teal-700 border border-teal-100 rounded-full text-[10px] font-bold">{acc}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-center p-4 bg-warm-50 rounded-xl border border-warm-200">
                  <span className="text-sm font-medium text-midnight-700">Photos</span>
                  <button onClick={() => goToStep(1)} className="text-teal-600 text-sm font-bold flex items-center gap-1">{photos.length} photos ✏️</button>
                </div>
                <div className="flex justify-between items-center p-4 bg-warm-50 rounded-xl border border-warm-200">
                  <span className="text-sm font-medium text-midnight-700">Location</span>
                  <button onClick={() => goToStep(3)} className="text-teal-600 text-sm font-bold flex items-center gap-1">{city}{area ? `, ${area}` : ''} ✏️</button>
                </div>
              </div>

              <div className="space-y-3">
                {!isVerified && (
                  <button
                    onClick={handleVerifyLocation}
                    disabled={isVerifying}
                    className="w-full p-5 bg-teal-50 border-2 border-teal-200 rounded-3xl flex items-center justify-between group hover:bg-teal-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <MapPin size={24} className="text-teal-600" />
                      <div className="text-left">
                        <p className="font-bold text-teal-800 text-sm">Verify Island Residency</p>
                        <p className="text-xs text-teal-600/70">Boost trust with a verified ✓ badge</p>
                      </div>
                    </div>
                    {isVerifying ? <Loader2 className="animate-spin h-5 w-5 text-teal-500" /> : <ChevronRight size={20} className="text-teal-500" />}
                  </button>
                )}
                {isVerified && (
                  <div className="p-4 bg-emerald-50 text-emerald-700 rounded-3xl border border-emerald-200 flex items-center justify-center gap-3 font-bold text-sm">
                    <Check size={20} /> Island Verified Resident
                  </div>
                )}
              </div>

              <button
                onClick={handleSave}
                disabled={loading}
                className="btn-primary w-full py-5 text-xl disabled:opacity-50"
              >
                {loading ? <><Loader2 className="animate-spin" size={22} /> Please Wait...</> : (editId ? '🖼️ Update Ad Now' : '🏝️ Publish to Island')}
              </button>
              {!isVerified && (
                <p className="text-xs text-warm-400 font-medium flex items-center justify-center gap-1">
                  <AlertCircle size={11} /> Unverified accounts may have limited visibility.
                </p>
              )}
              <BackButton onClick={prevStep} />
            </div>
          )}

          {step === 5 && (
            <div className="text-center py-12 space-y-6 animate-fade-in">
              <div className="text-7xl animate-float">🏝️</div>
              <div className="space-y-2">
                <h2 className="text-3xl font-heading font-black text-midnight-700">{editId ? 'Listing Updated!' : 'Published!'}</h2>
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
