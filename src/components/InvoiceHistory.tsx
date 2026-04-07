import React, { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { FileText, Download, Mail, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';

// ============================================================
// Invoice History Component
// Shows user's payment invoices with download and status
// ============================================================

interface Invoice {
    id: string;
    invoice_number: string;
    item_description: string;
    amount_total: number;
    paid_at: string;
    created_at: string;
    invoice_pdf_url: string | null;
    email_sent: boolean;
    email_sent_at: string | null;
    cashfree_order_id: string;
    payment_method: string;
}

export const InvoiceHistory: React.FC = () => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const user = auth.currentUser;
            if (!user) { setInvoices([]); return; }
            const snap = await getDocs(
                query(collection(db, 'invoices'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'))
            );
            setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Invoice[]);
        } catch (err: any) {
            setError(err.message || 'Failed to load invoices');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
                <span className="ml-3 text-warm-400 font-medium text-sm">Loading invoices...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-16">
                <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                <p className="text-warm-500 text-sm">{error}</p>
                <button
                    onClick={fetchInvoices}
                    className="mt-4 text-teal-600 text-sm font-semibold hover:underline"
                >
                    Try again
                </button>
            </div>
        );
    }

    if (invoices.length === 0) {
        return (
            <div className="text-center py-16">
                <FileText className="w-12 h-12 text-warm-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-midnight-600 mb-2">No Invoices Yet</h3>
                <p className="text-warm-400 text-sm max-w-xs mx-auto">
                    When you boost a listing, your payment invoices will appear here.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-heading font-black text-midnight-700 tracking-tight">
                    Payment History
                </h2>
                <span className="text-xs text-warm-400 font-medium bg-warm-100 px-3 py-1 rounded-full">
                    {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
                </span>
            </div>

            {invoices.map((invoice) => (
                <div
                    key={invoice.id}
                    className="bg-white rounded-2xl border border-warm-200 p-5 hover:shadow-md transition-shadow duration-200"
                >
                    {/* Top Row */}
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                                <FileText size={18} className="text-teal-600" />
                            </div>
                            <div>
                                <p className="font-bold text-sm text-midnight-700">
                                    {invoice.invoice_number}
                                </p>
                                <p className="text-xs text-warm-400 mt-0.5">
                                    {formatDate(invoice.paid_at || invoice.created_at)}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-black text-base text-midnight-700">
                                {formatAmount(invoice.amount_total)}
                            </p>
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mt-1">
                                <CheckCircle size={10} />
                                Paid
                            </span>
                        </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-warm-500 mb-3 pl-[52px]">
                        {invoice.item_description}
                    </p>

                    {/* Bottom Row */}
                    <div className="flex items-center justify-between pl-[52px]">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] text-warm-400 font-medium uppercase tracking-wide">
                                {invoice.payment_method || 'UPI'}
                            </span>
                            {invoice.email_sent ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-teal-500 font-medium">
                                    <Mail size={10} />
                                    Emailed
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] text-warm-400 font-medium">
                                    <Clock size={10} />
                                    Email pending
                                </span>
                            )}
                        </div>

                        {invoice.invoice_pdf_url && (
                            <a
                                href={invoice.invoice_pdf_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors"
                            >
                                <Download size={12} />
                                Download
                            </a>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};
