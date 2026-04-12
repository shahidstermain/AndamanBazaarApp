// 🌴 Andaman Bazaar Email Templates (Node.js / Cloud Functions)
// Mirror of src/lib/emailTemplates.ts for server-side use

export interface EmailTemplate {
  subject: string;
  htmlContent: string;
}

export type EmailData = Record<string, string | number>;

const layout = (content: string): string => `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial;background:#f3f6fb;margin:0;padding:0;}
.container{max-width:620px;margin:auto;background:white;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);}
.header{background:linear-gradient(135deg,#0284c7,#0ea5e9);color:white;padding:28px;text-align:center;}
.logo{font-size:24px;font-weight:700;}
.tagline{font-size:13px;opacity:.9;}
.content{padding:35px;line-height:1.6;color:#333;}
.button{display:inline-block;padding:14px 26px;background:#0ea5e9;color:white;text-decoration:none;border-radius:8px;font-weight:600;margin-top:20px;}
.tip{background:#e0f2fe;padding:14px;border-radius:8px;font-size:13px;margin-top:20px;}
.footer{background:#f1f5f9;padding:22px;text-align:center;font-size:13px;color:#666;}
</style>
</head>
<body>
<div class="container">
<div class="header">
<div class="logo">🌴 Andaman Bazaar</div>
<div class="tagline">Buy • Sell • Discover in the Islands</div>
</div>
<div class="content">${content}</div>
<div class="footer">
Made with ❤️ in Port Blair<br>Andaman &amp; Nicobar Islands
<p style="font-size:12px">Sometimes emails arrive faster than the ferries between islands.</p>
</div>
</div>
</body>
</html>`;

const s = (data: EmailData, key: string, fallback = ""): string =>
  String(data[key] ?? fallback);

export const emailTemplates = {
  emailVerification: (d: EmailData): EmailTemplate => ({
    subject: "Verify your email 🌊",
    htmlContent: layout(`
      <h2>Verify your email 🌊</h2>
      <p>Welcome to Andaman Bazaar!</p>
      <p>Before you start exploring listings across Port Blair and the islands, please verify your email.</p>
      <center><a class="button" href="${s(d, "VERIFY_LINK")}">Verify Email</a></center>
      <div class="tip">Island tip 🌴: Deals disappear faster than beach sunsets. Verify your email so you don't miss them.</div>
    `),
  }),

  welcome: (_d: EmailData): EmailTemplate => ({
    subject: "Welcome to the island marketplace 🎉",
    htmlContent: layout(`
      <h2>Welcome to the island marketplace 🎉</h2>
      <p>You're now part of the Andaman Bazaar community.</p>
      <ul>
        <li>Buy great local deals</li>
        <li>Sell items easily</li>
        <li>Connect with people nearby</li>
      </ul>
      <center><a class="button" href="https://andamanbazaar.in">Explore Listings</a></center>
      <div class="tip">Fun fact 🌊: On a small island your buyer might literally live two streets away.</div>
    `),
  }),

  passwordReset: (d: EmailData): EmailTemplate => ({
    subject: "Reset your password 🔐",
    htmlContent: layout(`
      <h2>Reset your password 🔐</h2>
      <p>We received a request to reset your password.</p>
      <center><a class="button" href="${s(d, "RESET_LINK")}">Reset Password</a></center>
      <p>If you didn't request this, simply ignore this email.</p>
      <div class="tip">Even the internet takes a swim sometimes — password resets happen.</div>
    `),
  }),

  suspiciousLogin: (d: EmailData): EmailTemplate => ({
    subject: "New login detected ⚠️",
    htmlContent: layout(`
      <h2>New login detected ⚠️</h2>
      <p>We noticed a login from a new device.</p>
      <p>Device: ${s(d, "DEVICE", "Unknown")}<br>Location: ${s(d, "LOCATION", "Unknown")}</p>
      <p>If this wasn't you, please secure your account immediately.</p>
      <center><a class="button" href="${s(d, "SECURE_ACCOUNT")}">Secure Account</a></center>
    `),
  }),

  listingApproved: (d: EmailData): EmailTemplate => ({
    subject: "Your listing is live 🎉",
    htmlContent: layout(`
      <h2>Your listing is live 🎉</h2>
      <p>Great news! Your listing has been approved.</p>
      <p><b>${s(d, "LISTING_NAME", "Your listing")}</b></p>
      <center><a class="button" href="${s(d, "LISTING_LINK")}">View Listing</a></center>
      <div class="tip">Listings with clear photos get 3x more messages.</div>
    `),
  }),

  listingRejected: (d: EmailData): EmailTemplate => ({
    subject: "Your listing needs changes",
    htmlContent: layout(`
      <h2>Your listing needs changes</h2>
      <p>Your listing couldn't be approved yet.</p>
      <p>Reason:</p><p>${s(d, "REJECTION_REASON", "Please review our listing guidelines.")}</p>
      <center><a class="button" href="${s(d, "EDIT_LISTING")}">Edit Listing</a></center>
    `),
  }),

  listingExpiring: (d: EmailData): EmailTemplate => ({
    subject: "Your listing is expiring soon ⏳",
    htmlContent: layout(`
      <h2>Your listing is expiring soon ⏳</h2>
      <p>Your listing will expire in 24 hours.</p>
      <p><b>${s(d, "LISTING_NAME", "Your listing")}</b></p>
      <center><a class="button" href="${s(d, "RENEW_LISTING")}">Renew Listing</a></center>
    `),
  }),

  listingSold: (d: EmailData): EmailTemplate => ({
    subject: "Congratulations 🎉",
    htmlContent: layout(`
      <h2>Congratulations 🎉</h2>
      <p>Your listing appears to be sold!</p>
      <p><b>${s(d, "LISTING_NAME", "Your listing")}</b></p>
      <center><a class="button" href="https://andamanbazaar.in/post">Post Another Listing</a></center>
      <div class="tip">Looks like you're becoming Port Blair's top trader.</div>
    `),
  }),

  listingSaved: (d: EmailData): EmailTemplate => ({
    subject: "Your listing is getting attention 👀",
    htmlContent: layout(`
      <h2>Your listing is getting attention 👀</h2>
      <p>Someone saved your listing.</p>
      <p><b>${s(d, "LISTING_NAME", "Your listing")}</b></p>
      <center><a class="button" href="${s(d, "LISTING_LINK")}">View Listing</a></center>
    `),
  }),

  newMessage: (d: EmailData): EmailTemplate => ({
    subject: "You have a new message 💬",
    htmlContent: layout(`
      <h2>You have a new message 💬</h2>
      <p>Someone contacted you about:</p>
      <p><b>${s(d, "LISTING_NAME", "Your listing")}</b></p>
      <p>${s(d, "MESSAGE_PREVIEW")}</p>
      <center><a class="button" href="${s(d, "CHAT_LINK")}">Reply Now</a></center>
      <div class="tip">Island tip: If they reply instantly, they probably live nearby.</div>
    `),
  }),

  replyNotification: (d: EmailData): EmailTemplate => ({
    subject: "New reply received",
    htmlContent: layout(`
      <h2>New reply received</h2>
      <p>You received a reply regarding:</p>
      <p><b>${s(d, "LISTING_NAME", "Your listing")}</b></p>
      <center><a class="button" href="${s(d, "CHAT_LINK")}">View Conversation</a></center>
    `),
  }),

  weeklyTrending: (d: EmailData): EmailTemplate => ({
    subject: "Trending in Port Blair 🔥",
    htmlContent: layout(`
      <h2>Trending in Port Blair 🔥</h2>
      <p>Here are some popular listings this week.</p>
      <ul>
        <li>${s(d, "TREND_ITEM_1")}</li>
        <li>${s(d, "TREND_ITEM_2")}</li>
        <li>${s(d, "TREND_ITEM_3")}</li>
      </ul>
      <center><a class="button" href="https://andamanbazaar.in">Explore Bazaar</a></center>
    `),
  }),

  abandonedChat: (d: EmailData): EmailTemplate => ({
    subject: "Your buyer might still be waiting 💬",
    htmlContent: layout(`
      <h2>Your buyer might still be waiting 💬</h2>
      <p>You started a conversation but didn't reply yet.</p>
      <p><b>${s(d, "LISTING_NAME", "Your listing")}</b></p>
      <center><a class="button" href="${s(d, "CHAT_LINK")}">Continue Chat</a></center>
      <div class="tip">Sometimes deals sink faster than anchors — reply quickly!</div>
    `),
  }),

  reportReceived: (_d: EmailData): EmailTemplate => ({
    subject: "Report received",
    htmlContent: layout(`
      <h2>Report received</h2>
      <p>Thanks for helping keep Andaman Bazaar safe.</p>
      <p>We received your report and our team will review it shortly.</p>
      <div class="tip">A safe marketplace helps everyone in the islands.</div>
    `),
  }),

  // Growth emails
  newItemsNearYou: (d: EmailData): EmailTemplate => ({
    subject: "New items near you 🏝️",
    htmlContent: layout(`
      <h2>New items near you 🏝️</h2>
      <p>Check out these fresh listings in your area:</p>
      <ul>
        <li>${s(d, "ITEM_1")}</li>
        <li>${s(d, "ITEM_2")}</li>
        <li>${s(d, "ITEM_3")}</li>
      </ul>
      <center><a class="button" href="${s(d, "SEARCH_LINK", "https://andamanbazaar.in")}">Explore Nearby</a></center>
    `),
  }),

  priceDropped: (d: EmailData): EmailTemplate => ({
    subject: "Price dropped on saved item 💰",
    htmlContent: layout(`
      <h2>Price dropped on saved item 💰</h2>
      <p>Good news! A price dropped on an item you saved:</p>
      <p><b>${s(d, "LISTING_NAME")}</b><br>
      Old price: <s>₹${s(d, "OLD_PRICE")}</s><br>
      New price: <b>₹${s(d, "NEW_PRICE")}</b></p>
      <center><a class="button" href="${s(d, "LISTING_LINK")}">View Deal</a></center>
    `),
  }),

  newCategoryListings: (d: EmailData): EmailTemplate => ({
    subject: `New ${s(d, "CATEGORY")} listings 📦`,
    htmlContent: layout(`
      <h2>New ${s(d, "CATEGORY")} listings 📦</h2>
      <p>Fresh arrivals in your favorite category:</p>
      <ul>
        <li>${s(d, "ITEM_1")}</li>
        <li>${s(d, "ITEM_2")}</li>
        <li>${s(d, "ITEM_3")}</li>
      </ul>
      <center><a class="button" href="${s(d, "CATEGORY_LINK", "https://andamanbazaar.in")}">Browse ${s(d, "CATEGORY")}</a></center>
    `),
  }),

  listingTrending: (d: EmailData): EmailTemplate => ({
    subject: "Your listing is trending 🔥",
    htmlContent: layout(`
      <h2>Your listing is trending 🔥</h2>
      <p>Your listing is getting lots of attention!</p>
      <p><b>${s(d, "LISTING_NAME")}</b><br>
      Views: ${s(d, "VIEWS", "0")}<br>
      Saves: ${s(d, "SAVES", "0")}<br>
      Messages: ${s(d, "MESSAGES", "0")}</p>
      <center><a class="button" href="${s(d, "LISTING_LINK")}">View Stats</a></center>
      <div class="tip">Trending listings sell 3x faster. Respond to messages quickly!</div>
    `),
  }),
};

export type EmailTemplateName = keyof typeof emailTemplates;
