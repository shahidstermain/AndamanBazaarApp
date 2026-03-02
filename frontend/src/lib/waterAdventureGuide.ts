export type WaterAdventureGuideItem = {
  title: string;
  emoji: string;
  overview: string;
  keyLocations: string;
  duration: string;
  priceNote: string;
  suitability: string;
};

export const WATER_ADVENTURE_GUIDE: WaterAdventureGuideItem[] = [
  {
    title: "Scuba Diving",
    emoji: "🤿",
    overview:
      "The signature Andaman underwater experience with beginner-friendly discover dives and deeper certified sessions.",
    keyLocations: "North Bay Island (beginners), Chidiyatapu (certified divers)",
    duration: "Single dive session or 2-day package",
    priceNote: "Starts around INR 4,500; certified packages from about INR 10,500",
    suitability: "Beginners and certified divers",
  },
  {
    title: "Sea Walking",
    emoji: "🚶",
    overview:
      "Helmet-assisted ocean-bed walk where non-swimmers can explore marine life with continuous guided support.",
    keyLocations: "North Bay Island, Elephant Beach (Havelock)",
    duration: "About 20 minutes underwater",
    priceNote: "Operator and transfer dependent",
    suitability: "Ages 7 to 70, including non-swimmers",
  },
  {
    title: "Snorkeling",
    emoji: "🐠",
    overview:
      "Easy reef exploration in shallow clear waters with a guide, ideal for first-time marine activity seekers.",
    keyLocations: "North Bay Island, Elephant Beach, Bharatpur Beach (Neil Island)",
    duration: "Typically 20 to 45 minutes in water",
    priceNote: "Varies by location and assisted package",
    suitability: "Beginner-friendly",
  },
  {
    title: "Parasailing",
    emoji: "🪂",
    overview:
      "Boat-towed parachute flight offering panoramic island views while combining air and sea adventure.",
    keyLocations: "Rajiv Gandhi Water Sports Complex, Havelock, North Bay Beach",
    duration: "Brief flight windows with prep and safety checks",
    priceNote: "Package-based pricing",
    suitability: "Generally 12 to 50 years for safety",
  },
  {
    title: "Jet Skiing",
    emoji: "🛥️",
    overview:
      "High-energy motorized water ride with quick instructor briefing and mandatory life-jacket protocols.",
    keyLocations: "Corbyn's Cove, Rajiv Gandhi Water Sports Complex, Elephant Beach",
    duration: "Short thrill rides in guided zone",
    priceNote: "Entry-level paid ride activity",
    suitability: "Ages 10 and above",
  },
  {
    title: "Speed Boat Ride",
    emoji: "⚡",
    overview:
      "Fast coastal rides used both as island transfer and adventure activity for groups and families.",
    keyLocations: "Andaman Water Sports Complex to Ross Island and North Bay",
    duration: "Route dependent",
    priceNote: "Depends on route and occupancy",
    suitability: "No strict age limit",
  },
  {
    title: "Banana Boat Ride",
    emoji: "🍌",
    overview:
      "Popular group fun ride on an inflatable banana tube towed by a speedboat.",
    keyLocations: "Rajiv Gandhi Water Sports Complex, Havelock, Neil Island",
    duration: "Short group run",
    priceNote: "Budget-friendly group pricing",
    suitability: "Family and group friendly (up to six riders)",
  },
  {
    title: "Glass Bottom Boat Ride",
    emoji: "🔭",
    overview:
      "Dry reef-viewing experience for travelers who want marine sightseeing without getting into the water.",
    keyLocations: "North Bay Island, Bharatpur Beach (Neil Island)",
    duration: "Typically 20 to 40 minutes",
    priceNote: "Accessible sightseeing pricing",
    suitability: "Excellent for kids, elders, and non-swimmers",
  },
  {
    title: "Semi Submarine",
    emoji: "🚢",
    overview:
      "Partially submerged vessel experience with broad underwater viewing windows for immersive coral observation.",
    keyLocations: "Popular in Port Blair circuits",
    duration: "Operator itinerary based",
    priceNote: "Premium sightseeing bracket",
    suitability: "All age groups",
  },
  {
    title: "Kayaking",
    emoji: "🛶",
    overview:
      "Relaxed paddling activity at beaches and calm stretches with scenic coastal and island views.",
    keyLocations: "Multiple beaches and island routes",
    duration: "Flexible guided slots",
    priceNote: "Usually moderate pricing",
    suitability: "Suitable for most age groups",
  },
  {
    title: "Mangrove Kayaking",
    emoji: "🌿",
    overview:
      "Quiet eco-focused paddle routes through dense mangrove channels with rich natural scenery.",
    keyLocations: "Port Blair mangroves, Havelock routes",
    duration: "Guided eco-trail session",
    priceNote: "Varies by route depth and timing",
    suitability: "Nature and photography enthusiasts",
  },
  {
    title: "Windsurfing",
    emoji: "🏄",
    overview:
      "Skill-based board-and-sail sport for adventure travelers looking for technical water-sport learning.",
    keyLocations: "Andaman Water Sports Complex, Port Blair",
    duration: "Session based with instruction",
    priceNote: "Training and session package dependent",
    suitability: "Skill seekers and active travelers",
  },
  {
    title: "Water Skiing",
    emoji: "🎿",
    overview:
      "Classic tow-sport where riders glide on skis behind a boat under controlled speed conditions.",
    keyLocations: "Andaman Water Sports Complex, Port Blair",
    duration: "Short guided runs",
    priceNote: "Premium thrill activity",
    suitability: "Adventure-oriented guests",
  },
  {
    title: "Sea Karting",
    emoji: "🏎️",
    overview:
      "Motorized sea-kart driving on designated routes, increasingly popular as a modern Andaman attraction.",
    keyLocations: "Emerging in Port Blair circuits",
    duration: "Track and package dependent",
    priceNote: "Typically premium",
    suitability: "Non-swimmers can also participate",
  },
  {
    title: "Sport Fishing / Angling",
    emoji: "🎣",
    overview:
      "Guided offshore and nearshore angling trips for calmer open-water exploration with local expertise.",
    keyLocations: "Open sea guided trips from island hubs",
    duration: "Half-day or extended trips",
    priceNote: "Boat and equipment dependent",
    suitability: "Leisure and hobby travelers",
  },
  {
    title: "Seaplane Ride",
    emoji: "✈️",
    overview:
      "Premium aerial sightseeing over turquoise lagoons and island clusters from above.",
    keyLocations: "Andaman archipelago aerial routes",
    duration: "Short premium scenic ride",
    priceNote: "Luxury experience pricing",
    suitability: "High-end and special-occasion travelers",
  },
  {
    title: "Harbour Cruise",
    emoji: "🛳️",
    overview:
      "Evening harbor experience with waterfront views and relaxed on-deck ambience.",
    keyLocations: "Port Blair Harbour",
    duration: "Evening slot",
    priceNote: "Moderate leisure pricing",
    suitability: "Couples and families",
  },
  {
    title: "Dinner Cruise",
    emoji: "🍽️",
    overview:
      "Curated night cruise with dining and scenic harbor lights, ideal for celebration itineraries.",
    keyLocations: "Port Blair Harbour",
    duration: "Dinner-hour sailing",
    priceNote: "Premium dining cruise pricing",
    suitability: "Couples, families, and small groups",
  },
];

export type LocationHotspot = {
  location: string;
  activities: string;
};

export const LOCATION_HOTSPOTS: LocationHotspot[] = [
  {
    location: "North Bay Island, Port Blair",
    activities: "Scuba, Sea Walk, Snorkeling, Jet Ski, Glass Bottom, Speed Boat",
  },
  {
    location: "Corbyn's Cove Beach, Port Blair",
    activities: "Jet Ski, Parasailing, Speed Boat",
  },
  {
    location: "Rajiv Gandhi Water Sports Complex",
    activities: "Water Skiing, Windsurfing, Banana Boat, Parasailing, Sail Boats",
  },
  {
    location: "Chidiyatapu, Port Blair",
    activities: "Advanced Scuba Diving",
  },
  {
    location: "Elephant Beach, Havelock",
    activities: "Snorkeling, Sea Walk, Scuba, Jet Ski",
  },
  {
    location: "Bharatpur Beach, Neil Island",
    activities: "Scuba, Jet Ski, Glass Bottom, Banana Boat",
  },
  {
    location: "Jolly Buoy Island",
    activities: "Kayaking, Snorkeling, Day Trips",
  },
];

export type LeadActivityOption = {
  label: string;
  emoji: string;
};

export const LEAD_ACTIVITY_OPTIONS: LeadActivityOption[] = WATER_ADVENTURE_GUIDE.map((item) => ({
  label: item.title,
  emoji: item.emoji,
}));

const ACTIVITY_NAME_ALIASES: Record<string, string> = {
  "Speed Boat": "Speed Boat Ride",
  "Banana Boat": "Banana Boat Ride",
  "Glass Bottom Boat": "Glass Bottom Boat Ride",
  "Semi-Submarine": "Semi Submarine",
  "Sport Fishing": "Sport Fishing / Angling",
  Seaplane: "Seaplane Ride",
  "Sea Karting": "Sea Karting",
};

export const normalizeActivityName = (activityName: string): string => {
  return ACTIVITY_NAME_ALIASES[activityName] ?? activityName;
};

export type LeadLocationOption = {
  value: string;
  label: string;
};

export const LEAD_LOCATION_OPTIONS: LeadLocationOption[] = [
  { value: "Port Blair", label: "Port Blair" },
  { value: "North Bay", label: "North Bay Island, Port Blair" },
  { value: "Corbyn's Cove", label: "Corbyn's Cove Beach, Port Blair" },
  {
    value: "Rajiv Gandhi Water Sports Complex",
    label: "Rajiv Gandhi Water Sports Complex",
  },
  { value: "Chidiyatapu", label: "Chidiyatapu, Port Blair" },
  { value: "Havelock Elephant Beach", label: "Elephant Beach, Havelock" },
  { value: "Neil Bharatpur", label: "Bharatpur Beach, Neil Island" },
  { value: "Jolly Buoy", label: "Jolly Buoy Island" },
  { value: "Port Blair Harbour", label: "Port Blair Harbour" },
];

const LOCATION_NAME_ALIASES: Record<string, string> = {
  "North Bay Island, Port Blair": "North Bay",
  "Corbyn's Cove Beach, Port Blair": "Corbyn's Cove",
  "Chidiyatapu, Port Blair": "Chidiyatapu",
  "Elephant Beach, Havelock": "Havelock Elephant Beach",
  "Bharatpur Beach, Neil Island": "Neil Bharatpur",
  "Jolly Buoy Island": "Jolly Buoy",
};

export const normalizeLeadLocation = (location: string): string => {
  return LOCATION_NAME_ALIASES[location] ?? location;
};

export const SWIMMING_ABILITY_OPTIONS = [
  "Non-swimmer",
  "Beginner",
  "Intermediate",
  "Advanced",
];

export type BudgetRangeOption = {
  value: string;
  label: string;
};

export const BUDGET_RANGE_OPTIONS: BudgetRangeOption[] = [
  { value: "1000", label: "Under INR 1,000 per person" },
  { value: "3000", label: "INR 1,000 - INR 3,000 per person" },
  { value: "5000", label: "INR 3,000 - INR 5,000 per person" },
  { value: "10000", label: "INR 5,000 - INR 10,000 per person" },
  { value: "15000", label: "Above INR 10,000 per person" },
];

export const REFERRAL_SOURCE_OPTIONS = [
  "Google Search",
  "Instagram",
  "Facebook",
  "YouTube",
  "Friend / Family",
  "Hotel / Travel Agent",
  "Returning Customer",
  "Other",
];
