import React, { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  limit as firestoreLimit,
} from "firebase/firestore";
import {
  Receipt,
  Download,
  ChevronDown,
  Zap,
  Rocket,
  Crown,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { formatInr } from "../lib/pricing";

// ============================================================
// Payment History & Invoice Component
// Displays boost payment history and downloadable invoices
// ============================================================

interface BoostRecord {
  id: string;
  orderId: string;
  listingId: string;
  tier: string;
  tierName: string;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "refunded" | "expired";
  durationDays: number;
  boostStartsAt?: string;
  boostExpiresAt?: string;
  invoiceId?: string;
  createdAt: string;
}

interface InvoiceRecord {
  invoiceId: string;
  invoiceNumber: string;
  type: string;
  total: number;
  currency: string;
  status: string;
  customerName: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  invoiceDate: string;
  paidAt: string;
}

const TIER_ICONS: Record<string, React.ReactNode> = {
  spark: <Zap size={16} className="text-amber-500" />,
  boost: <Rocket size={16} className="text-teal-500" />,
  power: <Crown size={16} className="text-purple-500" />,
};

const STATUS_BADGES: Record<
  string,
  { label: string; className: string; icon: React.ReactNode }
> = {
  pending: {
    label: "Pending",
    className: "bg-amber-100 text-amber-700",
    icon: <Clock size={12} />,
  },
  paid: {
    label: "Active",
    className: "bg-green-100 text-green-700",
    icon: <CheckCircle size={12} />,
  },
  failed: {
    label: "Failed",
    className: "bg-red-100 text-red-700",
    icon: <XCircle size={12} />,
  },
  refunded: {
    label: "Refunded",
    className: "bg-blue-100 text-blue-700",
    icon: <AlertCircle size={12} />,
  },
  expired: {
    label: "Expired",
    className: "bg-warm-100 text-warm-600",
    icon: <Clock size={12} />,
  },
};

export const PaymentHistory: React.FC = () => {
  const [boosts, setBoosts] = useState<BoostRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);
  const [invoiceData, setInvoiceData] = useState<Record<string, InvoiceRecord>>(
    {},
  );
  const [loadingInvoice, setLoadingInvoice] = useState<string | null>(null);

  useEffect(() => {
    fetchBoostHistory();
  }, []);

  const fetchBoostHistory = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setError("Please sign in to view payment history");
        setLoading(false);
        return;
      }

      const boostsQuery = query(
        collection(db, "listingBoosts"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc"),
        firestoreLimit(20),
      );

      const snapshot = await getDocs(boostsQuery);
      const records: BoostRecord[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          orderId: data.orderId,
          listingId: data.listingId,
          tier: data.tier,
          tierName: data.tierName,
          amount: data.amount,
          currency: data.currency || "INR",
          status: data.status,
          durationDays: data.durationDays,
          boostStartsAt: data.boostStartsAt?.toDate?.()?.toISOString(),
          boostExpiresAt: data.boostExpiresAt?.toDate?.()?.toISOString(),
          invoiceId: data.invoiceId,
          createdAt:
            data.createdAt?.toDate?.()?.toISOString() ||
            new Date().toISOString(),
        };
      });

      setBoosts(records);
    } catch (err: any) {
      console.error("Failed to fetch boost history:", err);
      setError(err.message || "Failed to load payment history");
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoice = async (invoiceId: string) => {
    if (invoiceData[invoiceId]) {
      setExpandedInvoice(expandedInvoice === invoiceId ? null : invoiceId);
      return;
    }

    setLoadingInvoice(invoiceId);
    try {
      const invoiceQuery = query(
        collection(db, "invoices"),
        where("invoiceId", "==", invoiceId),
        firestoreLimit(1),
      );

      const snapshot = await getDocs(invoiceQuery);
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        const invoice: InvoiceRecord = {
          invoiceId: data.invoiceId,
          invoiceNumber: data.invoiceNumber,
          type: data.type,
          total: data.total,
          currency: data.currency,
          status: data.status,
          customerName: data.customerName,
          items: data.items || [],
          invoiceDate: data.invoiceDate?.toDate?.()?.toISOString() || "",
          paidAt: data.paidAt?.toDate?.()?.toISOString() || "",
        };
        setInvoiceData((prev) => ({ ...prev, [invoiceId]: invoice }));
        setExpandedInvoice(invoiceId);
      }
    } catch (err) {
      console.error("Failed to fetch invoice:", err);
    } finally {
      setLoadingInvoice(null);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const isBoostActive = (boost: BoostRecord): boolean => {
    if (boost.status !== "paid" || !boost.boostExpiresAt) return false;
    return new Date(boost.boostExpiresAt) > new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-coral-500" />
        <span className="ml-2 text-warm-500 text-sm">
          Loading payment history...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
        <div className="flex items-start gap-2">
          <AlertCircle
            size={16}
            className="text-red-500 flex-shrink-0 mt-0.5"
          />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (boosts.length === 0) {
    return (
      <div className="text-center py-12">
        <Receipt size={40} className="mx-auto text-warm-300 mb-3" />
        <h3 className="text-lg font-bold text-midnight-700 mb-1">
          No Payments Yet
        </h3>
        <p className="text-sm text-warm-500">
          When you boost a listing, your payment history and invoices will
          appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold text-midnight-700 flex items-center gap-2">
        <Receipt size={20} />
        Payment History
      </h3>

      {boosts.map((boost) => {
        const statusBadge =
          STATUS_BADGES[boost.status] || STATUS_BADGES.pending;
        const active = isBoostActive(boost);
        const invoice = boost.invoiceId ? invoiceData[boost.invoiceId] : null;
        const isExpanded = expandedInvoice === boost.invoiceId;

        return (
          <div
            key={boost.id}
            className={`bg-white border rounded-2xl overflow-hidden transition-all ${
              active ? "border-green-200 shadow-sm" : "border-warm-200"
            }`}
          >
            {/* Main row */}
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      boost.tier === "spark"
                        ? "bg-amber-50"
                        : boost.tier === "boost"
                          ? "bg-teal-50"
                          : "bg-purple-50"
                    }`}
                  >
                    {TIER_ICONS[boost.tier] || <Zap size={16} />}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-midnight-700">
                      {boost.tierName} Boost
                    </p>
                    <p className="text-xs text-warm-500">
                      {boost.durationDays} days · {formatDate(boost.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-bold text-sm text-midnight-700">
                    {formatInr(boost.amount)}
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusBadge.className}`}
                  >
                    {statusBadge.icon}
                    {active ? "Active" : statusBadge.label}
                  </span>
                </div>
              </div>

              {/* Boost expiry info */}
              {active && boost.boostExpiresAt && (
                <div className="mt-2 bg-green-50 rounded-xl px-3 py-2">
                  <p className="text-xs text-green-700 font-medium">
                    Expires {formatDate(boost.boostExpiresAt)}
                  </p>
                </div>
              )}

              {/* Invoice button */}
              {boost.invoiceId && boost.status === "paid" && (
                <button
                  onClick={() => fetchInvoice(boost.invoiceId!)}
                  disabled={loadingInvoice === boost.invoiceId}
                  className="mt-2 w-full flex items-center justify-between bg-warm-50 hover:bg-warm-100 rounded-xl px-3 py-2 transition-colors"
                >
                  <span className="flex items-center gap-2 text-xs font-medium text-midnight-600">
                    {loadingInvoice === boost.invoiceId ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Download size={12} />
                    )}
                    View Invoice
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-warm-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  />
                </button>
              )}
            </div>

            {/* Expanded Invoice */}
            {isExpanded && invoice && (
              <div className="border-t border-warm-100 bg-warm-50 p-4 animate-fade-in">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-midnight-700 uppercase tracking-wider">
                    Invoice
                  </h4>
                  <span className="text-[10px] text-warm-500 font-mono">
                    {invoice.invoiceNumber}
                  </span>
                </div>

                <div className="bg-white rounded-xl border border-warm-100 p-3 space-y-2">
                  {/* Invoice header */}
                  <div className="flex justify-between text-xs">
                    <span className="text-warm-500">Date</span>
                    <span className="text-midnight-700 font-medium">
                      {formatDate(invoice.invoiceDate)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-warm-500">Status</span>
                    <span className="text-green-700 font-medium">Paid</span>
                  </div>

                  {/* Line items */}
                  <div className="border-t border-warm-100 pt-2 mt-2">
                    {invoice.items.map((item, i) => (
                      <div
                        key={i}
                        className="flex justify-between text-xs mb-1"
                      >
                        <span className="text-midnight-600 flex-1 pr-2">
                          {item.description}
                        </span>
                        <span className="text-midnight-700 font-bold">
                          {formatInr(item.total)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="border-t border-warm-200 pt-2 mt-2 flex justify-between">
                    <span className="text-sm font-bold text-midnight-700">
                      Total
                    </span>
                    <span className="text-sm font-black text-midnight-700">
                      {formatInr(invoice.total)}
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-warm-400 mt-2 text-center">
                  AndamanBazaar · SHAHID MOOSA · Sole Proprietor
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PaymentHistory;
