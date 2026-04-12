import React, { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth, storage } from "../lib/firebase";
import { Profile } from "../types";
import {
  ShieldCheck,
  MapPin,
  FileText,
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Building2,
  Clock,
} from "lucide-react";
import { useToast } from "./Toast";
import {
  validateFileUpload,
  operatorVerificationSchema,
} from "../lib/validation";
import { logAuditEvent, sanitizeErrorMessage } from "../lib/security";

interface OperatorVerificationFormProps {
  profile: Profile;
  onSuccess: () => void;
}

export const OperatorVerificationForm: React.FC<
  OperatorVerificationFormProps
> = ({ profile, onSuccess }) => {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [address, setAddress] = useState(
    profile.operator_business_address || "",
  );
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const status = profile.operator_verification_status;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

      setIdFile(file);
      if (file.type.startsWith("image/")) {
        setIdPreview(URL.createObjectURL(file));
      } else {
        setIdPreview(null); // PDF doesn't get a preview easily
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idFile && !status) {
      showToast("Please upload an ID document.", "error");
      return;
    }

    const validation = operatorVerificationSchema.safeParse({
      business_address: address,
    });
    if (!validation.success) {
      showToast(validation.error.issues[0].message, "error");
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(10);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      let documentUrl = profile.operator_id_document_url;

      if (idFile) {
        const fileExt = idFile.name.split(".").pop();
        const filePath = `kyc_documents/${user.uid}/id_verification_${Date.now()}.${fileExt}`;

        setUploadProgress(30);
        const storageRef = ref(storage, filePath);
        await uploadBytes(storageRef, idFile);

        setUploadProgress(70);
        documentUrl = await getDownloadURL(storageRef);
      }

      await updateDoc(doc(db, "profiles", user.uid), {
        operator_business_address: address,
        operator_id_document_url: documentUrl,
        operator_verification_status: "pending",
        updated_at: new Date().toISOString(),
      });

      setUploadProgress(100);
      showToast("Verification request submitted successfully!", "success");
      await logAuditEvent({
        action: "profile_updated",
        resource_type: "operator_verification",
        resource_id: user.uid,
        status: "success",
      });

      onSuccess();
    } catch (err: any) {
      const safeError = sanitizeErrorMessage(err);
      showToast(`Submission failed: ${safeError}`, "error");
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  if (status === "verified") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-3xl p-6 flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in-95">
        <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-green-500/20">
          <ShieldCheck size={32} strokeWidth={2.5} />
        </div>
        <div>
          <h3 className="text-xl font-black text-green-900">
            Verified Marketplace Operator
          </h3>
          <p className="text-green-700 font-medium">
            You are cleared to list and manage experiences.
          </p>
        </div>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex flex-col items-center text-center space-y-4">
        <div className="w-16 h-16 bg-amber-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-amber-500/20 animate-pulse">
          <Clock size={32} strokeWidth={2.5} />
        </div>
        <div>
          <h3 className="text-xl font-black text-amber-900">
            Verification Pending
          </h3>
          <p className="text-amber-700 font-medium max-w-xs">
            Our team is reviewing your documents. This usually takes 24-48
            hours.
          </p>
        </div>
        <div className="bg-white/50 backdrop-blur-sm p-4 rounded-2xl w-full text-left border border-amber-100 italic text-sm text-amber-800">
          <p className="font-bold flex items-center gap-2 mb-1">
            <Building2 size={14} /> Registered Address:
          </p>
          {profile.operator_business_address}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[32px] p-8 shadow-glass border border-warm-100 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 bg-teal-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20">
          <Building2 size={28} strokeWidth={2.5} />
        </div>
        <div>
          <h3 className="text-2xl font-black text-midnight-900">
            Become an Operator
          </h3>
          <p className="text-warm-500 font-bold uppercase tracking-widest text-[10px]">
            Verify your account to sell experiences
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-midnight-700 flex items-center gap-2">
            <MapPin size={14} className="text-teal-500" /> Business Address
          </label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full bg-warm-50 border-2 border-warm-100 rounded-2xl p-4 min-h-[100px] outline-none focus:border-teal-500 transition-all font-medium text-midnight-800"
            placeholder="Enter your full business or personal address for verification..."
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-midnight-700 flex items-center gap-2">
            <FileText size={14} className="text-teal-500" /> ID Proof
            (Aadhar/PAN/License)
          </label>
          <div
            onClick={() =>
              !isSubmitting && document.getElementById("id-upload")?.click()
            }
            className={`cursor-pointer border-2 border-dashed rounded-2xl p-6 transition-all flex flex-col items-center gap-3 ${
              idFile
                ? "border-teal-500 bg-teal-50/30"
                : "border-warm-200 hover:border-teal-300 bg-warm-50"
            }`}
          >
            {idPreview ? (
              <img
                src={idPreview}
                alt="ID Preview"
                className="h-32 rounded-xl border border-teal-200 shadow-sm"
              />
            ) : idFile ? (
              <div className="flex flex-col items-center text-teal-600">
                <CheckCircle2 size={40} />
                <span className="text-sm font-bold mt-2">{idFile.name}</span>
              </div>
            ) : (
              <>
                <Upload className="text-warm-400" size={32} />
                <div className="text-center">
                  <p className="text-sm font-bold text-midnight-700">
                    Click to upload ID document
                  </p>
                  <p className="text-[10px] text-warm-500 font-bold uppercase mt-1">
                    JPG, PNG or PDF (Max 5MB)
                  </p>
                </div>
              </>
            )}
            <input
              id="id-upload"
              type="file"
              hidden
              accept="image/*,.pdf"
              onChange={handleFileChange}
            />
          </div>
        </div>

        {status === "rejected" && (
          <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3">
            <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
            <div className="text-sm">
              <p className="font-black text-red-900 uppercase tracking-wide">
                Previous Application Rejected
              </p>
              <p className="text-red-700 font-medium">
                Please ensure the address matches your ID and the document is
                clear.
              </p>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-midnight-900 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-xl hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              <span>Uploading {uploadProgress}%</span>
            </>
          ) : (
            <>
              <ShieldCheck size={20} />
              <span>Submit for Verification</span>
            </>
          )}
        </button>

        <p className="text-[10px] text-center text-warm-400 font-bold uppercase tracking-widest px-8">
          By submitting, you agree to AndamanBazaar's Operator terms and 15%
          marketplace commission structure.
        </p>
      </form>
    </div>
  );
};
