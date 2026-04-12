import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, addDoc, updateDoc, collection } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth, storage } from "../lib/firebase";
import {
  ShieldCheck,
  MapPin,
  FileText,
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Building2,
  User,
  Phone,
  ChevronLeft,
} from "lucide-react";
import { useToast } from "../components/Toast";
import {
  validateFileUpload,
  operatorVerificationSchema,
} from "../lib/validation";
import { logAuditEvent, sanitizeErrorMessage } from "../lib/security";

export const BecomeOperator: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    business_name: "",
    id_type: "Aadhaar" as "Aadhaar" | "PAN" | "Driving License",
    id_number: "",
    address: "",
  });

  const [idProofFile, setIdProofFile] = useState<File | null>(null);
  const [addressProofFile, setAddressProofFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    const checkAuth = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate("/auth?redirect=/become-operator");
        return;
      }
      setUser(user);
      setFormData((prev) => ({
        ...prev,
        full_name: user.displayName || "",
        phone: user.phoneNumber || "",
      }));
      setLoading(false);
    };
    checkAuth();
  }, [navigate]);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "id" | "address",
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validation = validateFileUpload(file, {
        maxSizeMB: 5,
        allowedTypes: ["image/jpeg", "image/png", "application/pdf"],
      });

      if (!validation.valid) {
        showToast(validation.error || "Invalid file", "error");
        return;
      }

      if (type === "id") setIdProofFile(file);
      else setAddressProofFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!idProofFile || !addressProofFile) {
      showToast("Please upload both ID and Address proofs.", "error");
      return;
    }

    const validation = operatorVerificationSchema.safeParse(formData);
    if (!validation.success) {
      showToast(validation.error.issues[0].message, "error");
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(10);

    try {
      // Upload Files
      const uploadToStorage = async (file: File, suffix: string) => {
        const fileExt = file.name.split(".").pop();
        const filePath = `kyc_documents/${user.uid}/${suffix}_${Date.now()}.${fileExt}`;
        const storageRef = ref(storage, filePath);
        await uploadBytes(storageRef, file);
        return getDownloadURL(storageRef);
      };

      setUploadProgress(20);
      const idProofUrl = await uploadToStorage(idProofFile, "id_proof");
      setUploadProgress(50);
      const addressProofUrl = await uploadToStorage(
        addressProofFile,
        "address_proof",
      );
      setUploadProgress(70);

      // Create Verification Record
      await addDoc(collection(db, "operator_verifications"), {
        user_id: user.uid,
        full_name: formData.full_name,
        phone: formData.phone,
        business_name: formData.business_name || null,
        id_type: formData.id_type,
        id_number: formData.id_number,
        address: formData.address,
        id_proof_url: idProofUrl,
        address_proof_url: addressProofUrl,
        status: "pending",
        created_at: new Date().toISOString(),
      });

      // Update Profile Status (Optional/Redundant but helpful)
      await updateDoc(doc(db, "profiles", user.uid), {
        operator_verification_status: "pending",
      });

      setUploadProgress(100);
      showToast("Application submitted successfully!", "success");
      await logAuditEvent({
        action: "profile_updated",
        resource_type: "operator_verification",
        resource_id: user.uid,
        status: "success",
      });

      navigate("/profile");
    } catch (err: any) {
      const safeError = sanitizeErrorMessage(err);
      showToast(`Submission failed: ${safeError}`, "error");
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-teal-600" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-warm-500 font-bold uppercase tracking-widest text-[10px] mb-8 hover:text-midnight-900 transition-colors"
        >
          <ChevronLeft size={16} /> Back
        </button>

        <div className="bg-white rounded-[40px] shadow-glass border border-warm-100 overflow-hidden">
          <div className="bg-midnight-900 p-10 text-white relative">
            <div className="relative z-10">
              <div className="w-16 h-16 bg-teal-500 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-teal-500/20">
                <ShieldCheck size={32} strokeWidth={2.5} />
              </div>
              <h1 className="text-4xl font-black mb-2">
                Operator Verification
              </h1>
              <p className="text-teal-400 font-bold uppercase tracking-[0.2em] text-xs">
                Verify your identity to launch experiences
              </p>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          </div>

          <form onSubmit={handleSubmit} className="p-10 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-midnight-700 flex items-center gap-2">
                  <User size={14} className="text-teal-500" /> Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  className="w-full bg-warm-50 border-2 border-warm-50 rounded-2xl p-4 outline-none focus:border-teal-500 transition-all font-medium"
                  placeholder="as printed on ID"
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-midnight-700 flex items-center gap-2">
                  <Phone size={14} className="text-teal-500" /> Contact Number
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full bg-warm-50 border-2 border-warm-50 rounded-2xl p-4 outline-none focus:border-teal-500 transition-all font-medium"
                  placeholder="10-digit mobile"
                />
              </div>
            </div>

            {/* Business Name */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-midnight-700 flex items-center gap-2">
                <Building2 size={14} className="text-teal-500" /> Business Name
                (Optional)
              </label>
              <input
                type="text"
                value={formData.business_name}
                onChange={(e) =>
                  setFormData({ ...formData, business_name: e.target.value })
                }
                className="w-full bg-warm-50 border-2 border-warm-50 rounded-2xl p-4 outline-none focus:border-teal-500 transition-all font-medium"
                placeholder="e.g. Island Adventures Co."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ID Type */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-midnight-700 flex items-center gap-2">
                  <FileText size={14} className="text-teal-500" /> ID Proof Type
                </label>
                <select
                  value={formData.id_type}
                  onChange={(e) =>
                    setFormData({ ...formData, id_type: e.target.value as any })
                  }
                  className="w-full bg-warm-50 border-2 border-warm-50 rounded-2xl p-4 outline-none focus:border-teal-500 transition-all font-medium appearance-none"
                  title="ID Proof Type"
                  aria-label="ID Proof Type"
                >
                  <option value="Aadhaar">Aadhaar Card</option>
                  <option value="PAN">PAN Card</option>
                  <option value="Driving License">Driving License</option>
                </select>
              </div>

              {/* ID Number */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-midnight-700 flex items-center gap-2">
                  <ShieldCheck size={14} className="text-teal-500" /> ID Number
                </label>
                <input
                  type="text"
                  required
                  value={formData.id_number}
                  onChange={(e) =>
                    setFormData({ ...formData, id_number: e.target.value })
                  }
                  className="w-full bg-warm-50 border-2 border-warm-50 rounded-2xl p-4 outline-none focus:border-teal-500 transition-all font-medium"
                  placeholder="Enter your document ID number"
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-midnight-700 flex items-center gap-2">
                <MapPin size={14} className="text-teal-500" /> Operating Address
              </label>
              <textarea
                required
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                className="w-full bg-warm-50 border-2 border-warm-50 rounded-2xl p-4 min-h-[120px] outline-none focus:border-teal-500 transition-all font-medium"
                placeholder="Your full business or residential address..."
              />
            </div>

            {/* File Uploads */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
              {/* ID Upload */}
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-midnight-700">
                  ID Proof Document
                </p>
                <div
                  onClick={() => document.getElementById("id-proof")?.click()}
                  className={`relative border-2 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center min-h-[160px] transition-all cursor-pointer ${
                    idProofFile
                      ? "bg-teal-50 border-teal-500"
                      : "bg-warm-50 border-warm-200 hover:border-teal-300"
                  }`}
                >
                  {idProofFile ? (
                    <div className="flex flex-col items-center gap-2 text-teal-600 animate-in zoom-in-95">
                      <CheckCircle2 size={32} />
                      <span className="text-xs font-bold text-center break-all">
                        {idProofFile.name}
                      </span>
                    </div>
                  ) : (
                    <>
                      <Upload className="text-warm-400 mb-2" size={28} />
                      <span className="text-xs font-bold text-midnight-600 text-center">
                        Click to upload ID Proof
                      </span>
                    </>
                  )}
                  <input
                    id="id-proof"
                    type="file"
                    hidden
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileChange(e, "id")}
                  />
                </div>
              </div>

              {/* Address Proof Upload */}
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-midnight-700">
                  Address Proof Document
                </p>
                <div
                  onClick={() =>
                    document.getElementById("address-proof")?.click()
                  }
                  className={`relative border-2 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center min-h-[160px] transition-all cursor-pointer ${
                    addressProofFile
                      ? "bg-teal-50 border-teal-500"
                      : "bg-warm-50 border-warm-200 hover:border-teal-300"
                  }`}
                >
                  {addressProofFile ? (
                    <div className="flex flex-col items-center gap-2 text-teal-600 animate-in zoom-in-95">
                      <CheckCircle2 size={32} />
                      <span className="text-xs font-bold text-center break-all">
                        {addressProofFile.name}
                      </span>
                    </div>
                  ) : (
                    <>
                      <Upload className="text-warm-400 mb-2" size={28} />
                      <span className="text-xs font-bold text-midnight-600 text-center">
                        Click to upload Address Proof
                      </span>
                    </>
                  )}
                  <input
                    id="address-proof"
                    type="file"
                    hidden
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileChange(e, "address")}
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-8">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg- midnight-900 bg-midnight-900 text-white rounded-2xl py-6 font-black uppercase tracking-[0.2em] shadow-xl hover:shadow-2xl hover:scale-[1.01] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 group"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Submitting {uploadProgress}%</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck
                      size={20}
                      className="group-hover:animate-pulse"
                    />
                    <span>Submit Verification</span>
                  </>
                )}
              </button>
              <p className="text-center text-[10px] text-warm-400 font-bold uppercase tracking-widest mt-6 max-w-sm mx-auto">
                By submitting, you agree to become a verified operator according
                to our marketplace terms.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
