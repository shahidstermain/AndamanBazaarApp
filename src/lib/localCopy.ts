// ============================================================
// Andaman Local Humor — Single Source of Truth
// All local-flavor micro-copy lives here.
// 70/30 rule: most UI stays functional; only these strings
// carry the island voice. Never joke about money or data loss.
// ============================================================

export const COPY = {
  TOAST: {
    SAVE_SUCCESS: 'Saved! BSNL nahi jaane wala (hopefully) 😂',
    LISTING_DELETED: 'Listing hata di — monsoon mein BARGE jaise, gone! 🌧️',
    MESSAGE_SENT: 'Message bheja! Reply ka wait karo — ferry se jaldi aayega 📩',
    NETWORK_ERROR: 'Oops! Lagta hai BSNL moment aa gaya 📶 Thodi der mein try karo',
    SESSION_EXPIRED: 'Session timeout — sea rough thi, phir se login karo 🌊',
  },

  EMPTY_STATE: {
    NO_LISTINGS: 'Kuch nahi mila… BARGE late hai kya? Try another category 🌊',
    NO_SEARCH_RESULTS: 'Iska toh Andaman mein koi seller nahi nikla. Mainland se mangana padega! 😅',
    PROFILE_NO_LISTINGS: 'Abhi tak kuch nahi becha? Corbyn\'s Cove se wapas aake list karo yaar 🌅',
  },

  LOADING: {
    HOME_FEED: 'Fresh listings, Andaman style — BARGE ticket bhi nahi chahiye 🌴',
    AUTH: 'Verify ho raha hai... BSNL se toh fast hai yeh 😂',
    PULL_REFRESH: 'Loading... BARGE se bhi fast aa raha hai 📶',
  },

  SUCCESS: {
    LISTING_PUBLISHED: 'Listing live ho gayi! Ab wait karo... faster than a BSNL connection ⚡',
    BOOST_ACTIVATED: 'Boost active! Teri listing ab IXZ ki pehli flight jitni fast hai ✈️',
    SETTINGS_SAVED: 'Saved! Faster than Sunday Aberdeen Bazaar se nikal paana ✅',
  },

  HOME: {
    HERO_SUBTITLE: 'Buy and sell locally across the Andaman & Nicobar Islands',
  },

  CREATE_LISTING: {
    PHOTO_HINT: 'Ek achi photo lagao — tourists bhi dekhte hain yaar 📸',
    PRICE_PLACEHOLDER: 'Andaman price — fair rakho, sab jaante hain sab ko yahan 😄',
    CATEGORY_FISH: 'Aaj machi fresh hai? Toh post karo, bikne mein der nahi lagegi 🐠',
    CATEGORY_VEHICLES: 'Gaadi ek hi road par milti hai — isliye sahi price lagana important hai 🚗',
  },

  AUTH: {
    SIGNUP_SUBTITLE: 'Port Blair ka sabse bada bazaar — no BARGE required 🏝️',
    WRONG_PASSWORD: 'Password galat hai. BSNL ka password bhool gaye ya apna? 😅',
    EMAIL_VERIFICATION_SENT: 'Mail bheja! Agar 5 min mein nahi aaya, signal check karo 📶',
  },

  PROFILE: {
    COMPLETION_NUDGE: 'Photo lagao — Andaman mein sab ko sab pata rehta hai, fir bhi 😄',
  },

  BOOST: {
    NUDGE: 'Teri listing ka traffic Dairy Farm junction jitna stuck hai 😬 Boost karo!',
    TIER_49: '₹49 mein chai aur listing boost — value for money, Andaman style ☕',
    TIER_99: '₹99 mein Corbyn\'s Cove jitni visibility 🌊',
    TIER_199: '₹199 mein Aberdeen Bazaar ka Sunday rush waali visibility 🔥',
    EXPIRED: 'Boost khatam ho gaya — monsoon ki tarah aa ke chala gaya 🌧️ Renew karo?',
  },

  CHAT: {
    CONVERSATION_STARTED: 'Baat shuru karo! Andaman mein sab kuch personally hi hota hai 🤝',
    SELLER_BUSY: 'Seller abhi busy hai... Corbyn\'s Cove pe hoga shayad 😄',
    SELLER_UNAVAILABLE: 'Seller unavailable hai — ferry pe hoga, baad mein try karo 🚢',
  },

  ADMIN: {
    DASHBOARD_GREETING: 'Welcome back, Admin. Sab theek hai — aaj sea bhi calm hai 🎉',
    PENDING_QUEUE: (n: number) =>
      `${n} listings queue mein hain — government ferry se tez review karo please 😅`,
  },
} as const;
