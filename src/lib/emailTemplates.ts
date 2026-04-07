// 🌴 Andaman Bazaar Email Templates
// Production-ready email templates with island-style tone

export interface EmailTemplate {
  subject: string;
  htmlContent: string;
}

export interface EmailData {
  [key: string]: string | number;
}

// Global email layout wrapper
const createEmailLayout = (content: string): string => {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
body{
font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial;
background:#f3f6fb;
margin:0;
padding:0;
}
.container{
max-width:620px;
margin:auto;
background:white;
border-radius:14px;
overflow:hidden;
box-shadow:0 10px 30px rgba(0,0,0,0.08);
}
.header{
background:linear-gradient(135deg,#0284c7,#0ea5e9);
color:white;
padding:28px;
text-align:center;
}
.logo{
font-size:24px;
font-weight:700;
}
.tagline{
font-size:13px;
opacity:.9;
}
.content{
padding:35px;
line-height:1.6;
color:#333;
}
.button{
display:inline-block;
padding:14px 26px;
background:#0ea5e9;
color:white;
text-decoration:none;
border-radius:8px;
font-weight:600;
margin-top:20px;
}
.tip{
background:#e0f2fe;
padding:14px;
border-radius:8px;
font-size:13px;
margin-top:20px;
}
.footer{
background:#f1f5f9;
padding:22px;
text-align:center;
font-size:13px;
color:#666;
}
</style>
</head>
<body>
<div class="container">
<div class="header">
<div class="logo">🌴 Andaman Bazaar</div>
<div class="tagline">Buy & Sell locally in Andaman — no mainland scams.</div>
</div>
<div class="content">
${content}
</div>
<div class="footer">
Made with ❤️ in Port Blair<br>
Andaman & Nicobar Islands
<p style="font-size:12px">
Sometimes emails arrive faster than the ferries between islands.
</p>
</div>
</div>
</body>
</html>`;
};

// Helper to replace placeholders
const replacePlaceholders = (template: string, data: EmailData): string => {
  let result = template;
  Object.entries(data).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  });
  return result;
};

// ===== EMAIL TEMPLATES =====

export const emailTemplates = {
  // 1. Email Verification
  emailVerification: (data: EmailData): EmailTemplate => ({
    subject: 'Verify your email 🌊',
    htmlContent: createEmailLayout(`
      <h2>Verify your email 🌊</h2>
      <p>Welcome to Andaman Bazaar!</p>
      <p>Before you start exploring listings across Port Blair and the islands, please verify your email.</p>
      <center><a class="button" href="${data.VERIFY_LINK || ''}">Verify Email</a></center>
      <div class="tip">Island tip 🌴: Deals disappear faster than beach sunsets. Verify your email so you don't miss them.</div>
    `)
  }),

  // 2. Welcome Email
  welcome: (data: EmailData): EmailTemplate => ({
    subject: 'Welcome to the island marketplace 🎉',
    htmlContent: createEmailLayout(`
      <h2>Welcome to the island marketplace 🎉</h2>
      <p>You're now part of the Andaman Bazaar community.</p>
      <ul>
        <li>Buy great local deals</li>
        <li>Sell items easily</li>
        <li>Connect with people nearby</li>
      </ul>
      <center><a class="button" href="https://andamanbazaar.com">Explore Listings</a></center>
      <div class="tip">Fun fact 🌊: On a small island your buyer might literally live two streets away.</div>
    `)
  }),

  // 3. Password Reset
  passwordReset: (data: EmailData): EmailTemplate => ({
    subject: 'Reset your password 🔐',
    htmlContent: createEmailLayout(`
      <h2>Reset your password 🔐</h2>
      <p>We received a request to reset your password.</p>
      <center><a class="button" href="${data.RESET_LINK || ''}">Reset Password</a></center>
      <p>If you didn't request this, simply ignore this email.</p>
      <div class="tip">Even the internet takes a swim sometimes — password resets happen.</div>
    `)
  }),

  // 4. Suspicious Login Alert
  suspiciousLogin: (data: EmailData): EmailTemplate => ({
    subject: 'New login detected ⚠️',
    htmlContent: createEmailLayout(`
      <h2>New login detected ⚠️</h2>
      <p>We noticed a login from a new device.</p>
      <p>Device: ${data.DEVICE || 'Unknown'}<br>Location: ${data.LOCATION || 'Unknown'}</p>
      <p>If this wasn't you, please secure your account immediately.</p>
      <center><a class="button" href="${data.SECURE_ACCOUNT || ''}">Secure Account</a></center>
    `)
  }),

  // 5. Listing Approved
  listingApproved: (data: EmailData): EmailTemplate => ({
    subject: 'Your listing is live 🎉',
    htmlContent: createEmailLayout(`
      <h2>Your listing is live 🎉</h2>
      <p>Great news! Your listing has been approved.</p>
      <p><b>${data.LISTING_NAME || 'Your listing'}</b></p>
      <center><a class="button" href="${data.LISTING_LINK || ''}">View Listing</a></center>
      <div class="tip">Listings with clear photos get 3x more messages.</div>
    `)
  }),

  // 6. Listing Rejected
  listingRejected: (data: EmailData): EmailTemplate => ({
    subject: 'Your listing needs changes',
    htmlContent: createEmailLayout(`
      <h2>Your listing needs changes</h2>
      <p>Your listing couldn't be approved yet.</p>
      <p>Reason:</p>
      <p>${data.REJECTION_REASON || 'Please review our listing guidelines.'}</p>
      <center><a class="button" href="${data.EDIT_LISTING || ''}">Edit Listing</a></center>
    `)
  }),

  // 7. Listing Expiring Soon
  listingExpiring: (data: EmailData): EmailTemplate => ({
    subject: 'Your listing is expiring soon ⏳',
    htmlContent: createEmailLayout(`
      <h2>Your listing is expiring soon ⏳</h2>
      <p>Your listing will expire in 24 hours.</p>
      <p><b>${data.LISTING_NAME || 'Your listing'}</b></p>
      <center><a class="button" href="${data.RENEW_LISTING || ''}">Renew Listing</a></center>
    `)
  }),

  // 8. Listing Sold
  listingSold: (data: EmailData): EmailTemplate => ({
    subject: 'Congratulations 🎉',
    htmlContent: createEmailLayout(`
      <h2>Congratulations 🎉</h2>
      <p>Your listing appears to be sold!</p>
      <p><b>${data.LISTING_NAME || 'Your listing'}</b></p>
      <center><a class="button" href="https://andamanbazaar.com/post">Post Another Listing</a></center>
      <div class="tip">Looks like you're becoming Port Blair's top trader.</div>
    `)
  }),

  // 9. Someone Saved Your Listing
  listingSaved: (data: EmailData): EmailTemplate => ({
    subject: 'Your listing is getting attention 👀',
    htmlContent: createEmailLayout(`
      <h2>Your listing is getting attention 👀</h2>
      <p>Someone saved your listing.</p>
      <p><b>${data.LISTING_NAME || 'Your listing'}</b></p>
      <center><a class="button" href="${data.LISTING_LINK || ''}">View Listing</a></center>
    `)
  }),

  // 10. New Message
  newMessage: (data: EmailData): EmailTemplate => ({
    subject: 'You have a new message 💬',
    htmlContent: createEmailLayout(`
      <h2>You have a new message 💬</h2>
      <p>Someone contacted you about:</p>
      <p><b>${data.LISTING_NAME || 'Your listing'}</b></p>
      <p>Preview:</p>
      <p>${data.MESSAGE_PREVIEW || ''}</p>
      <center><a class="button" href="${data.CHAT_LINK || ''}">Reply Now</a></center>
      <div class="tip">Island tip: If they reply instantly, they probably live nearby.</div>
    `)
  }),

  // 11. Reply Notification
  replyNotification: (data: EmailData): EmailTemplate => ({
    subject: 'New reply received',
    htmlContent: createEmailLayout(`
      <h2>New reply received</h2>
      <p>You received a reply regarding:</p>
      <p><b>${data.LISTING_NAME || 'Your listing'}</b></p>
      <center><a class="button" href="${data.CHAT_LINK || ''}">View Conversation</a></center>
    `)
  }),

  // 12. Weekly Trending Listings
  weeklyTrending: (data: EmailData): EmailTemplate => ({
    subject: 'Trending in Port Blair 🔥',
    htmlContent: createEmailLayout(`
      <h2>Trending in Port Blair 🔥</h2>
      <p>Here are some popular listings this week.</p>
      <ul>
        <li>${data.TREND_ITEM_1 || ''}</li>
        <li>${data.TREND_ITEM_2 || ''}</li>
        <li>${data.TREND_ITEM_3 || ''}</li>
      </ul>
      <center><a class="button" href="https://andamanbazaar.com">Explore Bazaar</a></center>
    `)
  }),

  // 13. Abandoned Chat Reminder
  abandonedChat: (data: EmailData): EmailTemplate => ({
    subject: 'Your buyer might still be waiting 💬',
    htmlContent: createEmailLayout(`
      <h2>Your buyer might still be waiting 💬</h2>
      <p>You started a conversation but didn't reply yet.</p>
      <p><b>${data.LISTING_NAME || 'Your listing'}</b></p>
      <center><a class="button" href="${data.CHAT_LINK || ''}">Continue Chat</a></center>
      <div class="tip">Sometimes deals sink faster than anchors — reply quickly!</div>
    `)
  }),

  // 14. Report Received
  reportReceived: (data: EmailData): EmailTemplate => ({
    subject: 'Report received',
    htmlContent: createEmailLayout(`
      <h2>Report received</h2>
      <p>Thanks for helping keep Andaman Bazaar safe.</p>
      <p>We received your report and our team will review it shortly.</p>
      <div class="tip">A safe marketplace helps everyone in the islands.</div>
    `)
  }),

  // Growth emails (recommended)
  newItemsNearYou: (data: EmailData): EmailTemplate => ({
    subject: 'New items near you 🏝️',
    htmlContent: createEmailLayout(`
      <h2>New items near you 🏝️</h2>
      <p>Check out these fresh listings in your area:</p>
      <ul>
        <li>${data.ITEM_1 || ''}</li>
        <li>${data.ITEM_2 || ''}</li>
        <li>${data.ITEM_3 || ''}</li>
      </ul>
      <center><a class="button" href="${data.SEARCH_LINK || ''}">Explore Nearby</a></center>
    `)
  }),

  priceDropped: (data: EmailData): EmailTemplate => ({
    subject: 'Price dropped on saved item 💰',
    htmlContent: createEmailLayout(`
      <h2>Price dropped on saved item 💰</h2>
      <p>Good news! A price dropped on an item you saved:</p>
      <p><b>${data.LISTING_NAME || ''}</b><br>
      Old price: ${data.OLD_PRICE || ''}<br>
      New price: <b>${data.NEW_PRICE || ''}</b></p>
      <center><a class="button" href="${data.LISTING_LINK || ''}">View Deal</a></center>
    `)
  }),

  newCategoryListings: (data: EmailData): EmailTemplate => ({
    subject: `New ${data.CATEGORY || ''} listings 📦`,
    htmlContent: createEmailLayout(`
      <h2>New ${data.CATEGORY || ''} listings 📦</h2>
      <p>Fresh arrivals in your favorite category:</p>
      <ul>
        <li>${data.ITEM_1 || ''}</li>
        <li>${data.ITEM_2 || ''}</li>
        <li>${data.ITEM_3 || ''}</li>
      </ul>
      <center><a class="button" href="${data.CATEGORY_LINK || ''}">Browse ${data.CATEGORY || ''}</a></center>
    `)
  }),

  listingTrending: (data: EmailData): EmailTemplate => ({
    subject: 'Your listing is trending 🔥',
    htmlContent: createEmailLayout(`
      <h2>Your listing is trending 🔥</h2>
      <p>Your listing is getting lots of attention!</p>
      <p><b>${data.LISTING_NAME || ''}</b><br>
      Views: ${data.VIEWS || ''}<br>
      Saves: ${data.SAVES || ''}<br>
      Messages: ${data.MESSAGES || ''}</p>
      <center><a class="button" href="${data.LISTING_LINK || ''}">View Stats</a></center>
      <div class="tip">Trending listings sell 3x faster. Respond to messages quickly!</div>
    `)
  })
};

// ===== EMAIL TRIGGER CONFIG =====

export const emailTriggers = {
  // User events
  USER_SIGNUP: 'emailVerification',
  EMAIL_VERIFIED: 'welcome',
  PASSWORD_RESET_REQUEST: 'passwordReset',
  NEW_LOGIN: 'suspiciousLogin',
  
  // Listing events
  LISTING_APPROVED: 'listingApproved',
  LISTING_REJECTED: 'listingRejected',
  LISTING_EXPIRING: 'listingExpiring',
  LISTING_SOLD: 'listingSold',
  LISTING_SAVED: 'listingSaved',
  
  // Messaging events
  NEW_MESSAGE: 'newMessage',
  REPLY_RECEIVED: 'replyNotification',
  ABANDONED_CHAT: 'abandonedChat',
  
  // Scheduled events
  WEEKLY_TRENDING: 'weeklyTrending',
  REPORT_SUBMITTED: 'reportReceived',
  
  // Growth events
  NEW_ITEMS_NEARBY: 'newItemsNearYou',
  PRICE_DROPPED: 'priceDropped',
  NEW_CATEGORY_LISTINGS: 'newCategoryListings',
  LISTING_TRENDING: 'listingTrending'
};

// ===== UTILITY FUNCTIONS =====

export const getEmailTemplate = (templateName: keyof typeof emailTemplates, data: EmailData = {}): EmailTemplate => {
  const template = emailTemplates[templateName];
  if (!template) {
    throw new Error(`Email template "${templateName}" not found`);
  }
  return template(data);
};

export const renderEmailContent = (template: EmailTemplate, data: EmailData = {}): string => {
  return replacePlaceholders(template.htmlContent, data);
};

export const sendEmail = async (to: string, templateName: keyof typeof emailTemplates, data: EmailData = {}): Promise<boolean> => {
  try {
    const template = getEmailTemplate(templateName, data);
    const renderedContent = renderEmailContent(template, data);
    
    // This would integrate with your email service (SendGrid, Resend, etc.)
    // Example implementation:
    // await emailService.send({
    //   to,
    //   subject: template.subject,
    //   html: renderedContent
    // });
    
    console.log(`Email sent to ${to}: ${template.subject}`);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
};
