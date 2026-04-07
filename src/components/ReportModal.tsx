
import React, { useState } from 'react';
import { getCurrentUserId } from '../lib/auth';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from './Toast';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  listingTitle: string;
  reportedUserId?: string;
  reportedItemId?: string;
}

const reasons = [
  "Scam or Fraud",
  "Inappropriate Content",
  "Duplicate Listing",
  "Sold / Unavailable",
  "Wrong Category",
  "Other"
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  listingId,
  listingTitle,
  reportedUserId,
  reportedItemId,
}) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!selectedReason) return;
    setIsSubmitting(true);

    try {
      const userId = await getCurrentUserId();

      await addDoc(collection(db, 'reports'), {
        reporterId: userId || null,
        listingId: reportedItemId || listingId,
        reportedUserId: reportedUserId || null,
        reason: selectedReason,
        details,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
        setSelectedReason('');
        setDetails('');
      }, 2000);
    } catch (err) {
      showToast("Error submitting report. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>

      <div className="bg-white/95 backdrop-blur-xl p-8 md:p-10 rounded-[40px] shadow-2xl max-w-lg w-full relative overflow-hidden border border-white animate-in zoom-in-95 duration-300">
        {isSuccess ? (
          <div className="text-center py-10 space-y-6">
            <div className="w-20 h-20 bg-teal-50 text-teal-600 rounded-3xl flex items-center justify-center text-4xl mx-auto shadow-sm">✓</div>
            <h2 className="text-2xl font-bold text-slate-900">Report Submitted</h2>
            <p className="text-slate-500 font-medium">Thank you for keeping the island community safe. We will review this listing shortly.</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Report Listing</h2>
              <p className="text-sm font-medium text-slate-400 truncate">Flagging: {listingTitle}</p>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Reason for reporting</label>
              <div className="grid grid-cols-1 gap-2">
                {reasons.map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setSelectedReason(reason)}
                    className={`text-left p-4 rounded-2xl border transition-all text-sm font-semibold ${selectedReason === reason
                        ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                        : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'
                      }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Additional details (Optional)</label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Explain the issue..."
                rows={3}
                className="w-full p-5 bg-slate-50 rounded-2xl border-none focus:bg-white focus:ring-4 focus:ring-teal-50 transition-all font-medium text-sm"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={onClose}
                className="flex-1 py-4 rounded-2xl font-bold text-slate-400 hover:text-slate-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selectedReason || isSubmitting}
                className={`flex-[2] py-4 rounded-2xl font-bold text-white shadow-xl transition-all ${selectedReason && !isSubmitting ? 'bg-slate-900 hover:scale-[1.02] active:scale-95' : 'bg-slate-200 cursor-not-allowed'
                  }`}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
