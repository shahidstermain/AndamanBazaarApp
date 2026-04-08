import * as admin from "firebase-admin";

/**
 * Builds an HTML email body for an invoice payment confirmation.
 *
 * @param invoice - Invoice data used to populate the template:
 *   - `invoice_number`: Invoice identifier shown in the email
 *   - `customer_name`: Recipient name used in the greeting
 *   - `item_description`: Short description of the purchased item or service
 *   - `amount_total`: Numeric total displayed (formatted as currency in the template)
 *   - `paid_at`: ISO date/time string used to render the paid date
 *   - `invoice_pdf_url`: Optional URL for a "View Full Invoice" CTA; when present the CTA is included
 * @returns The complete HTML string for the payment confirmation email, populated with the provided invoice data.
 */
export function generateEmailHtml(invoice: {
  invoice_number: string;
  customer_name: string;
  item_description: string;
  amount_total: number;
  paid_at: string;
  invoice_pdf_url: string;
}): string {
  const paidDate = new Date(invoice.paid_at).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 20px;">
      <tr>
          <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                  <!-- Header -->
                  <tr>
                      <td style="background:linear-gradient(135deg,#0f3460 0%,#16213e 100%);padding:36px 40px;">
                          <h1 style="color:#ffffff;font-size:24px;margin:0;font-weight:800;">AndamanBazaar</h1>
                          <p style="color:rgba(255,255,255,0.6);font-size:11px;margin:6px 0 0;letter-spacing:2px;text-transform:uppercase;">Payment Confirmation</p>
                      </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                      <td style="padding:40px;">
                          <p style="font-size:16px;color:#1a1a2e;margin:0 0 8px;">Hi <strong>${invoice.customer_name}</strong>,</p>
                          <p style="font-size:14px;color:#666;line-height:1.6;margin:0 0 28px;">
                              Thank you for your purchase! Your payment has been confirmed and your listing boost is now active.
                          </p>

                          <!-- Invoice Summary Card -->
                          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:12px;overflow:hidden;margin-bottom:28px;">
                              <tr>
                                  <td style="padding:24px;">
                                      <table width="100%" cellpadding="0" cellspacing="0">
                                          <tr>
                                              <td style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;padding-bottom:4px;">Invoice</td>
                                              <td style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;padding-bottom:4px;text-align:right;">Amount</td>
                                          </tr>
                                          <tr>
                                              <td style="font-size:14px;font-weight:700;color:#0f3460;padding-bottom:16px;">${invoice.invoice_number}</td>
                                              <td style="font-size:20px;font-weight:800;color:#0f3460;padding-bottom:16px;text-align:right;">₹${invoice.amount_total.toFixed(2)}</td>
                                          </tr>
                                          <tr>
                                              <td colspan="2" style="border-top:1px solid #e9ecef;padding-top:16px;">
                                                  <table width="100%" cellpadding="0" cellspacing="0">
                                                      <tr>
                                                          <td style="font-size:12px;color:#888;padding:4px 0;">Item</td>
                                                          <td style="font-size:12px;color:#1a1a2e;font-weight:600;text-align:right;padding:4px 0;">${invoice.item_description}</td>
                                                      </tr>
                                                      <tr>
                                                          <td style="font-size:12px;color:#888;padding:4px 0;">Date</td>
                                                          <td style="font-size:12px;color:#1a1a2e;font-weight:600;text-align:right;padding:4px 0;">${paidDate}</td>
                                                      </tr>
                                                      <tr>
                                                          <td style="font-size:12px;color:#888;padding:4px 0;">Status</td>
                                                          <td style="text-align:right;padding:4px 0;">
                                                              <span style="background:#e8f5e9;color:#2e7d32;font-size:10px;font-weight:700;padding:3px 10px;border-radius:12px;text-transform:uppercase;letter-spacing:0.5px;">Paid</span>
                                                          </td>
                                                      </tr>
                                                  </table>
                                              </td>
                                          </tr>
                                      </table>
                                  </td>
                              </tr>
                          </table>

                          <!-- CTA Button -->
                          ${invoice.invoice_pdf_url ? `
                          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                              <tr>
                                  <td align="center">
                                      <a href="${invoice.invoice_pdf_url}" target="_blank"
                                         style="display:inline-block;background:linear-gradient(135deg,#0f3460,#1a5276);color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 36px;border-radius:12px;">
                                          📄 View Full Invoice
                                      </a>
                                  </td>
                              </tr>
                          </table>` : ""}

                          <p style="font-size:13px;color:#888;line-height:1.6;margin:0;">
                              Your boost is now live! Buyers across the Andaman Islands will see your listing with priority placement.
                          </p>
                      </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                      <td style="padding:24px 40px;border-top:1px solid #f1f3f5;text-align:center;">
                          <p style="font-size:12px;color:#aaa;margin:0 0 4px;">AndamanBazaar — Andaman & Nicobar Islands Marketplace</p>
                          <p style="font-size:11px;color:#ccc;margin:0;">This is an automated email. For support, contact support@andamanbazaar.in</p>
                      </td>
                  </tr>
              </table>
          </td>
      </tr>
  </table>
</body>
</html>`;
}

/**
 * Sends an invoice email for the given invoice document and records audit logs.
 *
 * Generates the email HTML from the invoice data, sends it via Resend when configured (or logs and marks the invoice sent when no API key is present), updates the invoice document to mark the email as sent, and writes a corresponding entry to the payment audit log.
 *
 * @param invoice_id - Firestore document ID of the invoice to email
 * @returns An object with `success` and `message`; includes `to` when the email was only logged, and `resend_id` when the email was sent successfully
 * @throws Error when the invoice document does not exist
 * @throws Error when the Resend API responds with a non-OK status (failure is also recorded in the audit log)
 */
export async function processSendInvoiceEmail(invoice_id: string) {
  const db = admin.firestore();
  
  // 1. Fetch invoice
  const invoiceDoc = await db.collection("invoices").doc(invoice_id).get();
  if (!invoiceDoc.exists) {
    throw new Error("Invoice not found");
  }
  const invoice = invoiceDoc.data()!;

  // 2. Skip if already sent
  if (invoice.email_sent) {
    console.log(`Email already sent for invoice ${invoice.invoice_number}`);
    return { success: true, message: "Email already sent" };
  }

  // 3. Generate email HTML
  const emailHtml = generateEmailHtml({
    invoice_number: invoice.invoice_number,
    customer_name: invoice.customer_name,
    item_description: invoice.item_description,
    amount_total: parseFloat(invoice.amount_total),
    paid_at: invoice.paid_at || invoice.created_at || new Date().toISOString(),
    invoice_pdf_url: invoice.invoice_pdf_url || "",
  });

  // 4. Send email via Resend
  const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
  
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — logging email instead of sending");
    console.log(`📧 Would send to: ${invoice.customer_email}`);
    console.log(`📧 Subject: Your AndamanBazaar Invoice #${invoice.invoice_number}`);

    // Mark as sent (dev mode)
    await invoiceDoc.ref.update({ 
      email_sent: true, 
      email_sent_at: new Date().toISOString() 
    });

    return {
      success: true,
      message: "Email logged (no API key configured)",
      to: invoice.customer_email,
    };
  }

  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "AndamanBazaar <noreply@andamanbazaar.in>",
      to: [invoice.customer_email],
      subject: `Your AndamanBazaar Invoice #${invoice.invoice_number}`,
      html: emailHtml,
    }),
  });

  const emailResult: any = await emailResponse.json();

  if (!emailResponse.ok) {
    console.error("Resend API error:", emailResult);

    // Audit log the failure
    await db.collection("payment_audit_log").add({
      boost_id: invoice.boost_id,
      event_type: "email_failed",
      cashfree_order_id: invoice.cashfree_order_id,
      raw_payload: emailResult,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });

    throw new Error(`Failed to send email: ${JSON.stringify(emailResult)}`);
  }

  // 5. Update invoice
  await invoiceDoc.ref.update({ 
    email_sent: true, 
    email_sent_at: new Date().toISOString() 
  });

  // 6. Audit log
  await db.collection("payment_audit_log").add({
    boost_id: invoice.boost_id,
    event_type: "invoice_emailed",
    cashfree_order_id: invoice.cashfree_order_id,
    raw_payload: {
      invoice_number: invoice.invoice_number,
      to: invoice.customer_email,
      resend_id: emailResult.id,
    },
    created_at: admin.firestore.FieldValue.serverTimestamp()
  });

  console.log(`📧 Invoice email sent: ${invoice.invoice_number} → ${invoice.customer_email}`);

  return {
    success: true,
    message: "Invoice email sent",
    resend_id: emailResult.id,
  };
}
