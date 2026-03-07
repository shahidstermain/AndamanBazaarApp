// ============================================================
// AndamanBazaar Local Humor — Single Source of Truth
// All local-flavor micro-copy lives here.
// 70/30 rule: most UI stays functional; only these strings
// carry the island voice. Never joke about money or data loss.
// ============================================================

export const COPY = {
  TOAST: {
    SAVE_SUCCESS: "Save ho gaya — BSNL se alag, yeh waqai kaam karta hai ⚡",
    NETWORK_ERROR: "Lagta hai undersea cable mein crab ghus gaya 🦀 Thodi der mein try karo",
    MESSAGE_SENT: "Gaya! Ab reply ka wait karo — sea calm hai toh jaldi aayega �",
    SESSION_EXPIRED: "Session gaya — OFC cable ki tarah, bina warning ke. Wapas login karo 🔌",
    LISTING_DELETED: "Hata di! Jolly Buoy ki tarah — monsoon mein off season ho gayi �️",
  },

  EMPTY_STATE: {
    NO_LISTINGS: "Kuch nahi mila — seller IXZ pe mainland gaya hoga. Try another category? ✈️",
    NO_SEARCH_RESULTS: "Iska toh Andaman mein koi seller nahi nikla. Mainland se mangana padega! 😅",
    PROFILE_NO_LISTINGS: "Kuch becho yaar! Aberdeen Bazaar mein dukaan nahi hai toh yahan toh list karo 😄",
  },

  LOADING: {
    HOME_FEED: "Listings load ho rahi hain — ferry se tez, guarantee ⚡",
    AUTH: "Verify ho raha hai... BSNL se toh fast hai yeh 😂",
    PULL_REFRESH: "Sea calm hai — listings smooth aa rahi hain 🌊",
  },

  SUCCESS: {
    LISTING_PUBLISHED: "Live hai teri listing! Port Blair mein sab ko sab pata hota hai — ab inhe bhi pata chalega 😄",
    BOOST_ACTIVATED: "Boost chal gaya! Teri listing ab Havelock speedboat jitni fast 🚤",
    SETTINGS_SAVED: "Saved! Sunday Aberdeen Bazaar se nikalne se bhi fast ✅",
  },

  BOOST: {
    TIER_49: "₹49 mein chai aur listing boost — value for money, Andaman style ☕",
    TIER_99: "₹99 mein pura Aberdeen Bazaar tujhe dekhega 👀",
    TIER_199: "₹199 — IXZ arrivals board pe naam jaise — sabki nazar udhar ✈️",
    NUDGE: "Teri listing Andaman Trunk Road jitni quiet hai — Boost lagao! 🚗",
    EXPIRED: "Boost khatam ho gaya — monsoon ki tarah aa ke chala gaya 🌧️ Renew karo?",
  },

  CREATE_LISTING: {
    PHOTO_HINT: "Achi photo lagao — Andaman mein sab jaante hain sab ko, phir bhi proof chahiye 📸",
    PRICE_PLACEHOLDER: "Andaman price — fair rakho, sab jaante hain sab ko yahan 😄",
    CATEGORY_FISH: "Aberdeen jetty ka maal hai? Post karo — sunset se pehle bikta hai �",
    CATEGORY_VEHICLES: "Gaadi ek hi road par milti hai — sahi price lagana important hai 🚗",
  },

  AUTH: {
    SIGNUP_SUBTITLE: "Andaman ka digital Aberdeen Bazaar — mainland trip ki zaroorat nahi! 🏝️",
    WRONG_PASSWORD: "Password galat hai. BSNL ka password bhool gaye ya apna? 😅",
    EMAIL_VERIFICATION_SENT: "Mail bhej diya! BSNL signal ache ho toh 2 minute mein aa jayega �",
  },

  PROFILE: {
    COMPLETION_NUDGE: "Yaar, photo lagao — Andaman mein sab jaante hain, phir bhi strangers trust nahi karte �",
    HIGH_VIEWS: "Itne views? Dairy Farm junction bhi sharma jaaye 🚦",
  },

  CHAT: {
    CONVERSATION_STARTED: "Baat shuru karo! Andaman mein sab kuch personally hi hota hai 🤝",
    SELLER_BUSY: "Seller busy hai — MV ship pe charha hoga mainland ke liye 😄",
    SELLER_UNAVAILABLE: "Seller unavailable hai — ferry pe hoga, baad mein try karo 🚢",
  },

  ADMIN: {
    DASHBOARD_GREETING: "Welcome back, Admin — aaj petrol queue nahi, listings queue zaroor hai 😄",
    PENDING_QUEUE: (n: number) => `${n} listings queue mein hain — government ferry se tez review karo please 😅`,
  },

  HOME: {
    HERO_SUBTITLE: 'Buy and sell locally across the Andaman & Nicobar Islands',
  },
} as const;
