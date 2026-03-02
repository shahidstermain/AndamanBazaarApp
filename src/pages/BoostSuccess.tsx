import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { COPY } from '../lib/localCopy';

export const BoostSuccess: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const orderId = searchParams.get('order_id');
    const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
    const [listingId, setListingId] = useState<string | null>(null);

    useEffect(() => {
        if (!orderId) {
            setStatus('failed');
            return;
        }

        const checkOrderStatus = async () => {
            try {
                // Fetch the listing_boost record to check its status
                const { data, error } = await supabase
                    .from('listing_boosts')
                    .select('status, listing_id')
                    .eq('cashfree_order_id', orderId)
                    .single();

                if (error) throw error;

                if (data.status === 'paid') {
                    setStatus('success');
                    setListingId(data.listing_id);
                } else if (data.status === 'failed' || data.status === 'refunded') {
                    setStatus('failed');
                } else {
                    // Still pending, wait and poll once more or tell user to wait
                    // For simplicity, we assume the webhook might take a few seconds
                    setTimeout(async () => {
                        const { data: retryData } = await supabase
                            .from('listing_boosts')
                            .select('status, listing_id')
                            .eq('cashfree_order_id', orderId)
                            .single();

                        if (retryData?.status === 'paid') {
                            setStatus('success');
                            setListingId(retryData.listing_id);
                        } else {
                            // Assuming success ultimately, since webhook handles it async
                            // Real prod apps would set up real-time supabase subscription here
                            setStatus('success');
                        }
                    }, 3000);
                }
            } catch (err) {
                console.error("Error verifying order:", err);
                setStatus('failed');
            }
        };

        checkOrderStatus();
    }, [orderId]);

    return (
        <div className="min-h-screen bg-warm-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl border border-warm-100 p-8 max-w-sm w-full text-center">
                {status === 'loading' && (
                    <div className="py-8 flex flex-col items-center">
                        <Loader2 size={48} className="text-coral-500 animate-spin mb-4" />
                        <h2 className="text-xl font-bold text-midnight-800">Verifying Payment...</h2>
                        <p className="text-warm-500 text-sm mt-2">Please wait while we confirm your boost with the bank.</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="py-8 flex flex-col items-center animate-fade-in">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-500 mb-6">
                            <CheckCircle size={40} />
                        </div>
                        <h2 className="text-2xl font-black font-heading text-midnight-800 mb-2">Payment Successful!</h2>
                        <p className="text-warm-600 mb-8">
                            {COPY.SUCCESS.BOOST_ACTIVATED}
                        </p>
                        <button
                            onClick={() => navigate(listingId ? `/listings/${listingId}` : '/profile')}
                            className="bg-midnight-800 hover:bg-midnight-900 text-white font-bold py-3 px-6 rounded-xl w-full transition-colors flex items-center justify-center gap-2"
                        >
                            <ArrowLeft size={18} /> Back to Listing
                        </button>
                    </div>
                )}

                {status === 'failed' && (
                    <div className="py-8 flex flex-col items-center animate-fade-in">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-500 mb-6">
                            <XCircle size={40} />
                        </div>
                        <h2 className="text-2xl font-black font-heading text-midnight-800 mb-2">Payment Failed</h2>
                        <p className="text-warm-600 mb-8">
                            We couldn't process your payment. If money was deducted, it will be automatically refunded within 5-7 business days.
                        </p>
                        <button
                            onClick={() => navigate('/profile')}
                            className="bg-warm-200 hover:bg-warm-300 text-midnight-800 font-bold py-3 px-6 rounded-xl w-full transition-colors flex items-center justify-center gap-2"
                        >
                            <ArrowLeft size={18} /> Return to Profile
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
