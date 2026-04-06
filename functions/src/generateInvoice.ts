import * as admin from "firebase-admin";

const TIERS: Record<string, { label: string; emoji: string }> = {
  spark: { label: "Spark", emoji: "⚡" },
  boost: { label: "Boost", emoji: "🚀" },
  power: { label: "Power", emoji: "💎" },
};

/**
 * Generate a complete HTML invoice document using the provided invoice data.
 *
 * Formats the payment timestamp into India Standard Time (IST) and embeds customer, order, payment, and amount details into a styled HTML invoice suitable for saving or serving.
 *
 * @param invoice - Object containing invoice fields:
 *   - invoice_number, customer_name, customer_email, customer_phone,
 *   - item_description, amount_total, payment_method, cashfree_order_id,
 *   - paid_at, tier, duration_days, listing_title
 * @returns The rendered invoice HTML as a string
 */
export async function generateInvoiceHtml(invoice: {
  invoice_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  item_description: string;
  amount_total: number;
  payment_method: string;
  cashfree_order_id: string;
  paid_at: string;
  tier: string;
  duration_days: number;
  listing_title: string;
}): Promise<string> {
  const tierInfo = TIERS[invoice.tier] || { label: invoice.tier, emoji: "📦" };
  const paidDateObj = new Date(invoice.paid_at);
  const paidDate = paidDateObj.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Kolkata",
  });
  const paidTime = paidDateObj.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
    hour12: true,
  });
  const paidDateTime = `${paidDate}, ${paidTime} IST`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${invoice.invoice_number}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1a1a2e; background: #f8f9fa; }
        .invoice-container { max-width: 650px; margin: 0 auto; background: #ffffff; }
        .header { background: linear-gradient(135deg, #0f3460 0%, #16213e 100%); color: white; padding: 40px 40px 30px; }
        .header h1 { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
        .header .tagline { font-size: 12px; opacity: 0.7; margin-top: 4px; letter-spacing: 2px; text-transform: uppercase; }
        .invoice-meta { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 24px; }
        .invoice-meta .label { font-size: 11px; opacity: 0.6; text-transform: uppercase; letter-spacing: 1px; }
        .invoice-meta .value { font-size: 14px; font-weight: 600; margin-top: 2px; }
        .body { padding: 40px; }
        .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #999; margin-bottom: 12px; font-weight: 700; }
        .customer-info { margin-bottom: 30px; }
        .customer-info p { font-size: 14px; line-height: 1.8; color: #444; }
        .customer-info strong { color: #1a1a2e; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .items-table th { background: #f1f3f5; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; padding: 12px 16px; text-align: left; color: #666; font-weight: 700; }
        .items-table td { padding: 16px; font-size: 14px; border-bottom: 1px solid #f1f3f5; }
        .items-table .item-name { font-weight: 600; color: #1a1a2e; }
        .items-table .item-detail { font-size: 12px; color: #888; margin-top: 2px; }
        .items-table .amount { text-align: right; font-weight: 700; font-size: 16px; color: #0f3460; }
        .total-row { background: linear-gradient(135deg, #e8f4f8 0%, #f0f7ff 100%); }
        .total-row td { padding: 20px 16px; font-size: 18px; font-weight: 800; }
        .total-row .amount { color: #0f3460; font-size: 22px; }
        .payment-info { background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 30px; }
        .payment-info .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
        .payment-info .row .label { color: #888; }
        .payment-info .row .value { font-weight: 600; color: #1a1a2e; }
        .badge { display: inline-block; background: #e8f5e9; color: #2e7d32; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px; }
        .footer { text-align: center; padding: 30px 40px; border-top: 1px solid #f1f3f5; }
        .footer p { font-size: 12px; color: #999; line-height: 1.6; }
        .footer .brand { font-weight: 700; color: #0f3460; }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="header">
            <h1>AndamanBazaar</h1>
            <div class="tagline">Andaman & Nicobar Islands Marketplace</div>
            <div style="font-size:11px;opacity:0.6;margin-top:4px;">Operated by SHAHID MOOSA (Sole Proprietor)</div>
            <div class="invoice-meta">
                <div>
                    <div class="label">Invoice Number</div>
                    <div class="value">${invoice.invoice_number}</div>
                </div>
                <div>
                    <div class="label">Date & Time (IST)</div>
                    <div class="value">${paidDateTime}</div>
                </div>
                <div>
                    <div class="label">Status</div>
                    <div class="value">✅ Paid</div>
                </div>
            </div>
        </div>

        <div class="body">
            <div class="customer-info">
                <div class="section-title">Billed To</div>
                <p><strong>${invoice.customer_name}</strong></p>
                <p>${invoice.customer_email}</p>
                ${invoice.customer_phone ? `<p>${invoice.customer_phone}</p>` : ""}
            </div>

            <div class="section-title">Order Details</div>
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th style="text-align:center;">Qty</th>
                        <th style="text-align:right;">Unit Price</th>
                        <th style="text-align:right;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <div class="item-name">${tierInfo.emoji} ${tierInfo.label} Boost — ${invoice.duration_days} days</div>
                            <div class="item-detail">Listing: "${invoice.listing_title}"</div>
                        </td>
                        <td style="text-align:center;">1</td>
                        <td style="text-align:right;">₹${invoice.amount_total.toFixed(2)}</td>
                        <td class="amount">₹${invoice.amount_total.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td colspan="3" style="text-align:right;font-size:13px;color:#666;">Subtotal</td>
                        <td class="amount" style="font-size:14px;">₹${invoice.amount_total.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td colspan="3" style="text-align:right;font-size:13px;color:#666;">Tax</td>
                        <td class="amount" style="font-size:14px;">₹0.00</td>
                    </tr>
                    <tr class="total-row">
                        <td colspan="3"><strong>Grand Total (INR)</strong></td>
                        <td class="amount">₹${invoice.amount_total.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>

            <div class="section-title">Payment Information</div>
            <div class="payment-info">
                <div class="row">
                    <span class="label">Payment Method</span>
                    <span class="value">${(invoice.payment_method || "UPI").toUpperCase()}</span>
                </div>
                <div class="row">
                    <span class="label">Order Reference</span>
                    <span class="value">${invoice.cashfree_order_id}</span>
                </div>
                <div class="row">
                    <span class="label">Payment Date & Time</span>
                    <span class="value">${paidDateTime}</span>
                </div>
                <div class="row">
                    <span class="label">Status</span>
                    <span class="value"><span class="badge">Confirmed</span></span>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>Thank you for boosting your listing on <span class="brand">AndamanBazaar</span>!</p>
            <p>For questions, contact support@andamanbazaar.in</p>
            <p style="margin-top: 12px; font-size: 10px; color: #aaa;">Operated by SHAHID MOOSA (Sole Proprietor) · Andaman & Nicobar Islands, India</p>
            <p style="margin-top: 4px; font-size: 10px; color: #ccc;">This is a computer-generated invoice and does not require a signature.</p>
        </div>
    </div>
</body>
</html>`;
}

/**
 * Generate an invoice for the given listing boost, store the invoice record and HTML in Firebase, and write an audit log.
 *
 * @param boost_id - The Firestore document ID of the listing boost to invoice
 * @returns An object containing `success: true`, the created or existing `invoice_id`, `invoice_number`, the public `invoice_url`, and `already_existed` when an invoice was previously present for the boost
 * @throws Error when the boost record for `boost_id` does not exist
 */
export async function processInvoiceGeneration(boost_id: string) {
  const db = admin.firestore();

  // 0. Idempotency
  const existingInvoicesSnapshot = await db.collection("invoices")
    .where("boost_id", "==", boost_id)
    .limit(1)
    .get();

  if (!existingInvoicesSnapshot.empty) {
    const existingInvoice = existingInvoicesSnapshot.docs[0].data();
    console.log(`Invoice already exists for boost ${boost_id}: ${existingInvoice.invoice_number}`);
    return {
      success: true,
      invoice_id: existingInvoicesSnapshot.docs[0].id,
      invoice_number: existingInvoice.invoice_number,
      invoice_url: existingInvoice.invoice_pdf_url || "",
      already_existed: true,
    };
  }

  // 1. Fetch boost record
  const boostDoc = await db.collection("listing_boosts").doc(boost_id).get();
  if (!boostDoc.exists) {
    throw new Error("Boost record not found");
  }
  const boost = boostDoc.data()!;

  // 2. Fetch user profile
  const profileDoc = await db.collection("profiles").doc(boost.user_id).get();
  const profile = profileDoc.data();

  // 3. Fetch listing title
  const listingDoc = await db.collection("listings").doc(boost.listing_id).get();
  const listing = listingDoc.data();

  // 4. Fetch user email from auth
  const authUser = await admin.auth().getUser(boost.user_id);

  const customerName = profile?.name || authUser?.displayName || "AndamanBazaar User";
  const customerEmail = authUser?.email || profile?.email || "user@andamanbazaar.in";
  const customerPhone = authUser?.phoneNumber || profile?.phone_number || "";
  const listingTitle = listing?.title || "Listing";

  const tierInfo = TIERS[boost.tier] || { label: boost.tier, emoji: "📦" };
  const itemDescription = `${tierInfo.emoji} ${tierInfo.label} Boost — ${boost.duration_days} days`;

  // Generate an invoice number
  const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${boost_id.slice(-4).toUpperCase()}`;

  // 5. Create invoice record
  const invoiceData = {
    invoice_number: invoiceNumber,
    boost_id,
    user_id: boost.user_id,
    customer_name: customerName,
    customer_email: customerEmail,
    customer_phone: customerPhone,
    item_description: itemDescription,
    amount_total: boost.amount_inr,
    payment_method: boost.payment_method || "upi",
    cashfree_order_id: boost.cashfree_order_id,
    cashfree_payment_id: boost.cashfree_payment_id || null,
    paid_at: boost.featured_from || new Date().toISOString(),
    created_at: admin.firestore.FieldValue.serverTimestamp()
  };

  const invoiceRef = await db.collection("invoices").add(invoiceData);

  // 6. Generate HTML invoice
  const invoiceHtml = await generateInvoiceHtml({
    ...invoiceData,
    tier: boost.tier,
    duration_days: boost.duration_days,
    listing_title: listingTitle,
    paid_at: invoiceData.paid_at,
  });

  // 7. Upload HTML invoice to Storage
  const fileName = `invoices/${boost.user_id}/${invoiceNumber}.html`;
  const bucket = admin.storage().bucket();
  const file = bucket.file(fileName);
  
  await file.save(invoiceHtml, {
    contentType: "text/html",
    metadata: {
      cacheControl: "public, max-age=31536000",
    }
  });

  // 8. Get Download URL
  // We can make it public or get a signed URL since the storage bucket rules can handle access.
  await file.makePublic();
  const pdfUrl = file.publicUrl();

  // 9. Update invoice with PDF URL
  await invoiceRef.update({ invoice_pdf_url: pdfUrl });

  // 11. Audit log
  await db.collection("payment_audit_log").add({
    boost_id: boost_id,
    event_type: "invoice_generated",
    cashfree_order_id: boost.cashfree_order_id,
    raw_payload: {
      invoice_id: invoiceRef.id,
      invoice_number: invoiceNumber,
      amount: boost.amount_inr,
    },
    created_at: admin.firestore.FieldValue.serverTimestamp()
  });

  console.log(`📄 Invoice generated: ${invoiceNumber} for boost ${boost_id}`);

  return {
    success: true,
    invoice_id: invoiceRef.id,
    invoice_number: invoiceNumber,
    invoice_url: pdfUrl,
  };
}
