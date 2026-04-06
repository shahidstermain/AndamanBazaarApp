// ============================================================
// Shared Pricing Configuration
// Single source of truth for all boost tier pricing.
// Backend (create-boost-order) maintains its own copy for security,
// but values MUST match these.
// ============================================================

export interface BoostTierConfig {
    key: string;
    name: string;
    label: string;
    emoji: string;
    durationDays: number;
    durationLabel: string;
    /** Price in whole INR (display value) */
    priceInr: number;
    /** Price in paise (for calculations — avoids floating-point errors) */
    pricePaise: number;
    features: string[];
    popular?: boolean;
}

/**
 * Canonical boost tier definitions.
 * ⚠️  If you change prices here, you MUST also update:
 *   - functions/src/payments/createOrder.ts (tier pricing logic)
 */
export const BOOST_TIERS: BoostTierConfig[] = [
    {
        key: 'spark',
        name: 'Spark',
        label: 'Spark ⚡',
        emoji: '⚡',
        durationDays: 3,
        durationLabel: '3 days',
        priceInr: 49,
        pricePaise: 4900,
        features: [
            'Featured badge on listing',
            'Priority in search results',
            'Highlighted card in browse',
        ],
    },
    {
        key: 'boost',
        name: 'Boost',
        label: 'Boost 🚀',
        emoji: '🚀',
        durationDays: 7,
        durationLabel: '7 days',
        priceInr: 99,
        pricePaise: 9900,
        popular: true,
        features: [
            'Everything in Spark',
            'Top placement on Home page',
            'Featured in category view',
            '3× more visibility',
        ],
    },
    {
        key: 'power',
        name: 'Power',
        label: 'Power 💎',
        emoji: '💎',
        durationDays: 30,
        durationLabel: '30 days',
        priceInr: 199,
        pricePaise: 19900,
        features: [
            'Everything in Boost',
            'Premium golden badge',
            'Push notification to buyers',
            '10× more visibility',
            'Priority seller support',
        ],
    },
];

/** Lookup a tier by key. Throws if not found. */
export function getTier(key: string): BoostTierConfig {
    const tier = BOOST_TIERS.find((t) => t.key === key);
    if (!tier) throw new Error(`Unknown boost tier: ${key}`);
    return tier;
}

/** Format a number as INR currency string (e.g. "₹99") */
export function formatInr(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

/** Format a number as INR with 2 decimal places (e.g. "₹99.00") */
export function formatInrDecimal(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

/** Legal entity info — used in invoices, footer, about page */
export const LEGAL_ENTITY = {
    name: 'SHAHID MOOSA',
    type: 'Sole Proprietor',
    platform: 'AndamanBazaar',
    website: 'www.andamanbazaar.in',
    founderUrl: 'https://shahidster.tech',
    supportEmail: 'support@andamanbazaar.in',
    location: 'Andaman & Nicobar Islands, India',
} as const;
