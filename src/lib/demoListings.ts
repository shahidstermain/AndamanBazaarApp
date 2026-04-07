// ============================================================
// Demo Listings — Realistic sample data for AndamanBazaar
// Centralized source of truth. Flag: isDemo: true
// IDs prefixed with "demo-" for easy identification.
// Remove or replace with real data as the marketplace grows.
// ============================================================

export interface DemoListing {
    id: string;
    title: string;
    price: number;
    city: string;
    area?: string;
    description: string;
    condition: string;
    category_id: string;
    is_featured: boolean;
    is_official?: boolean;
    is_demo: true;
    views_count: number;
    created_at: string;
    images: { image_url: string }[];
}

// Local authentic phone-quality images in /public/demo-images/
const img = (name: string) => `/demo-images/${name}.png`;

const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

export const DEMO_LISTINGS: DemoListing[] = [
    // ── Electronics ──────────────────────────────────────────
    {
        id: 'demo-001',
        title: 'Samsung Galaxy M34 5G — 6/128 GB, Midnight Blue',
        price: 11500,
        city: 'Port Blair',
        area: 'Goalghar',
        description:
            'Used for about 8 months. Screen guard on since day 1, no scratches. Battery health still great — easily lasts a full day. Charger and box included. Selling because upgraded.',
        condition: 'like_new',
        category_id: 'other',
        is_featured: true,
        is_official: true,
        is_demo: true,
        views_count: 142,
        created_at: daysAgo(1),
        images: [{ image_url: img('samsung-galaxy-m34') }],
    },
    {
        id: 'demo-002',
        title: 'HP 15s Laptop — i3 12th Gen, 8GB/512 SSD',
        price: 28000,
        city: 'Port Blair',
        area: 'Aberdeen Bazaar',
        description:
            '1.5 years old, mostly used for office work and browsing. Runs smooth, no lag. Minor wear on the edges. Original charger included, no box. Moving to mainland so selling.',
        condition: 'good',
        category_id: 'other',
        is_featured: false,
        is_demo: true,
        views_count: 89,
        created_at: daysAgo(3),
        images: [{ image_url: img('hp-laptop-15s') }],
    },
    {
        id: 'demo-003',
        title: 'boAt Rockerz 450 Wireless Headphones — Black',
        price: 900,
        city: 'Port Blair',
        description:
            'Good condition, used for 4 months. Sound quality is solid. Cushions still soft. Selling because I got AirPods as a gift. Comes with USB charging cable.',
        condition: 'good',
        category_id: 'other',
        is_featured: false,
        is_demo: true,
        views_count: 54,
        created_at: daysAgo(2),
        images: [{ image_url: img('boat-headphones') }],
    },

    // ── Vehicles / Two-wheelers ──────────────────────────────
    {
        id: 'demo-004',
        title: 'Honda Activa 6G — 2022 Model, White, 12k km',
        price: 62000,
        city: 'Port Blair',
        area: 'Junglighat',
        description:
            'Single owner, regular service at Honda showroom. All documents clear. Insurance valid till March 2027. Small dent on the left panel, everything else perfect. Test ride welcome.',
        condition: 'good',
        category_id: 'other',
        is_featured: true,
        is_official: true,
        is_demo: true,
        views_count: 231,
        created_at: daysAgo(1),
        images: [{ image_url: img('honda-activa-6g') }],
    },
    {
        id: 'demo-005',
        title: 'Hero Splendor Plus — 2021, Black, 18k km',
        price: 42000,
        city: 'Diglipur',
        description:
            'Well maintained bike. Used for daily commute. New tyre fitted last month. Papers up to date. Selling because leaving the island. Negotiable for serious buyers.',
        condition: 'fair',
        category_id: 'other',
        is_featured: false,
        is_demo: true,
        views_count: 167,
        created_at: daysAgo(5),
        images: [{ image_url: img('hero-splendor-plus') }],
    },

    // ── Furniture ────────────────────────────────────────────
    {
        id: 'demo-006',
        title: 'Wooden Dining Table Set — 4 Chairs, Teak Finish',
        price: 8500,
        city: 'Port Blair',
        description:
            'Solid wood table with 4 matching chairs. About 3 years old. Some water ring marks on the top but structurally very strong. Can send more photos on request. Buyer has to arrange pickup.',
        condition: 'fair',
        category_id: 'other',
        is_featured: false,
        is_demo: true,
        views_count: 73,
        created_at: daysAgo(4),
        images: [{ image_url: img('dining-table-teak') }],
    },
    {
        id: 'demo-007',
        title: 'Double Bed with Storage — Queen Size, Walnut',
        price: 12000,
        city: 'Port Blair',
        description:
            'Queen size double bed with 2 storage drawers underneath. Plywood construction with walnut laminate. Mattress NOT included. 2 years old, in good shape. Disassembly possible.',
        condition: 'good',
        category_id: 'other',
        is_featured: false,
        is_demo: true,
        views_count: 96,
        created_at: daysAgo(2),
        images: [{ image_url: img('queen-bed-walnut') }],
    },

    // ── Fresh Catch / Produce ────────────────────────────────
    {
        id: 'demo-008',
        title: 'Fresh Red Snapper — Caught Today, 2–3 kg',
        price: 450,
        city: 'Havelock',
        description:
            'Caught this morning near Elephant Beach. Red snapper, 2-3 kg each. Can clean and cut on request. Meet at the jetty or I can drop off for orders above ₹1000. DM for availability.',
        condition: 'new',
        category_id: 'fresh-catch',
        is_featured: true,
        is_demo: true,
        views_count: 312,
        created_at: daysAgo(0),
        images: [{ image_url: img('red-snapper') }],
    },
    {
        id: 'demo-009',
        title: 'Organic Coconuts — Fresh from Farm, Batch of 10',
        price: 250,
        city: 'Neil Island',
        description:
            'Tender coconuts, freshly harvested from our farm in Neil Island. Pack of 10. Great for drinking water and malai. Can deliver within Neil. Bulk orders get better rates.',
        condition: 'new',
        category_id: 'produce',
        is_featured: false,
        is_demo: true,
        views_count: 188,
        created_at: daysAgo(1),
        images: [{ image_url: img('organic-coconuts') }],
    },

    // ── Handicrafts ──────────────────────────────────────────
    {
        id: 'demo-010',
        title: 'Handmade Shell Necklace — Andaman Craft',
        price: 350,
        city: 'Havelock',
        description:
            'Handmade shell necklace made by local artisans. Each piece is unique. Perfect gift or souvenir. Also available in earring sets. Contact for custom designs.',
        condition: 'new',
        category_id: 'handicrafts',
        is_featured: false,
        is_demo: true,
        views_count: 67,
        created_at: daysAgo(6),
        images: [{ image_url: img('shell-necklace') }],
    },

    // ── Services / Experiences ───────────────────────────────
    {
        id: 'demo-011',
        title: 'Scuba Diving Session — PADI Certified, Havelock',
        price: 3500,
        city: 'Havelock',
        description:
            'Beginner-friendly scuba diving experience. PADI certified instructor. Includes all equipment, underwater photos, and safety briefing. Duration approx 45 mins in water. Book 1 day in advance.',
        condition: 'new',
        category_id: 'experiences',
        is_featured: true,
        is_demo: true,
        views_count: 445,
        created_at: daysAgo(2),
        images: [{ image_url: img('scuba-diving') }],
    },
    {
        id: 'demo-012',
        title: 'Glass Bottom Boat Ride — North Bay Island',
        price: 800,
        city: 'Port Blair',
        description:
            'See coral reefs without getting wet! 30-minute glass bottom boat ride at North Bay. Perfect for families and kids. Morning slots usually have better visibility. Weekday discount available.',
        condition: 'new',
        category_id: 'experiences',
        is_featured: false,
        is_demo: true,
        views_count: 198,
        created_at: daysAgo(3),
        images: [{ image_url: img('glass-boat-ride') }],
    },

    // ── Household / General ──────────────────────────────────
    {
        id: 'demo-013',
        title: 'Crompton Ceiling Fan — 48", White, Almost New',
        price: 1100,
        city: 'Port Blair',
        description:
            'Bought 3 months ago, moving to a furnished flat so don\'t need it anymore. Runs silent with good air delivery. Installation and wiring not included. Pickup from Junglighat.',
        condition: 'like_new',
        category_id: 'other',
        is_featured: false,
        is_demo: true,
        views_count: 41,
        created_at: daysAgo(1),
        images: [{ image_url: img('ceiling-fan') }],
    },
    {
        id: 'demo-014',
        title: 'Prestige Induction Cooktop — 1600W, Barely Used',
        price: 1400,
        city: 'Port Blair',
        description:
            'Used maybe 10 times, like new. We switched back to gas so this is just sitting in the kitchen. Works perfectly. Touch controls, timer, all features working. With original box.',
        condition: 'like_new',
        category_id: 'other',
        is_featured: false,
        is_demo: true,
        views_count: 52,
        created_at: daysAgo(4),
        images: [{ image_url: img('induction-cooktop') }],
    },
    {
        id: 'demo-015',
        title: 'Kids Bicycle — 16", Blue, Hercules',
        price: 1800,
        city: 'Port Blair',
        description:
            'My son outgrew it. Good for ages 4-7. Training wheels included. Few scratches on the body but rides perfectly. Tyres in good condition. Can be seen at Aberdeen Bazaar area.',
        condition: 'good',
        category_id: 'other',
        is_featured: false,
        is_demo: true,
        views_count: 38,
        created_at: daysAgo(7),
        images: [{ image_url: img('kids-bicycle') }],
    },
];

// ── Helpers ────────────────────────────────────────────────

/** Check if a listing ID belongs to a demo listing */
export const isDemoListing = (id: string): boolean => id.startsWith('demo-');

/** Get demo listings, optionally filtered by category */
export const getDemoListings = (category?: string): DemoListing[] => {
    if (!category || category === 'all') return DEMO_LISTINGS;
    return DEMO_LISTINGS.filter(l => l.category_id === category);
};

/** Get featured demo listings */
export const getFeaturedDemos = (): DemoListing[] =>
    DEMO_LISTINGS.filter(l => l.is_featured);

/** Get top demo listings by views (for trending) */
export const getTrendingDemos = (limit = 6): DemoListing[] =>
    [...DEMO_LISTINGS].sort((a, b) => b.views_count - a.views_count).slice(0, limit);
