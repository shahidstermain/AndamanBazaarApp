import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type ActivitySeed = {
  slug: string;
  title: string;
  description: string;
  location: string;
  types: string[];
  duration_minutes: number;
  price_min: number;
  price_max: number;
  age_min: number | null;
  images: string[];
  safety_notes: string;
};

const operatorSeeds = [
  {
    name: "North Bay Ocean Adventures",
    email: "northbay@andamanoperators.com",
    phone: "+91-9531900001",
    location: "North Bay",
  },
  {
    name: "Corbyn Wave Riders",
    email: "corbyn@andamanoperators.com",
    phone: "+91-9531900002",
    location: "Corbyn's Cove",
  },
  {
    name: "RG Water Sports Club",
    email: "rgwsc@andamanoperators.com",
    phone: "+91-9531900003",
    location: "Rajiv Gandhi Water Sports Complex",
  },
  {
    name: "Chidiyatapu Blue Trails",
    email: "chidiyatapu@andamanoperators.com",
    phone: "+91-9531900004",
    location: "Chidiyatapu",
  },
  {
    name: "Elephant Beach Dive Centre",
    email: "elephantbeach@andamanoperators.com",
    phone: "+91-9531900005",
    location: "Havelock Elephant Beach",
  },
  {
    name: "Bharatpur Marine Tours",
    email: "bharatpur@andamanoperators.com",
    phone: "+91-9531900006",
    location: "Neil Bharatpur",
  },
  {
    name: "Jolly Buoy Eco Expeditions",
    email: "jollybuoy@andamanoperators.com",
    phone: "+91-9531900007",
    location: "Jolly Buoy",
  },
];

const activitySeeds: ActivitySeed[] = [
  {
    slug: "scuba-diving-north-bay",
    title: "Scuba Diving",
    description:
      "Guided scuba dives for beginners and certified divers across rich coral gardens and vibrant marine life zones.",
    location: "North Bay",
    types: ["Diving", "Adventure"],
    duration_minutes: 120,
    price_min: 3500,
    price_max: 6500,
    age_min: 12,
    images: ["/images/scuba-1.jpg", "/images/scuba-2.jpg"],
    safety_notes: "PADI-certified instructor mandatory. Medical declaration required before dive.",
  },
  {
    slug: "sea-walking-north-bay",
    title: "Sea Walking",
    description:
      "Walk on the seabed with an oxygen helmet and enjoy close-up marine encounters without needing swimming skills.",
    location: "North Bay",
    types: ["Underwater", "Family"],
    duration_minutes: 75,
    price_min: 3200,
    price_max: 5000,
    age_min: 10,
    images: ["/images/sea-walk-1.jpg", "/images/sea-walk-2.jpg"],
    safety_notes:
      "Pregnant guests and guests with severe respiratory conditions should avoid this activity.",
  },
  {
    slug: "snorkeling-elephant-beach",
    title: "Snorkeling",
    description:
      "Surface-level guided snorkeling in crystal-clear waters around colorful coral reefs at Elephant Beach.",
    location: "Havelock Elephant Beach",
    types: ["Reef", "Beginner"],
    duration_minutes: 60,
    price_min: 1200,
    price_max: 2500,
    age_min: 8,
    images: ["/images/snorkeling-1.jpg", "/images/snorkeling-2.jpg"],
    safety_notes: "Life jacket provided. Follow guide route and avoid touching corals.",
  },
  {
    slug: "parasailing-corbyn-cove",
    title: "Parasailing",
    description:
      "Soar above the turquoise waters with a speedboat-assisted parasailing session at Corbyn's Cove.",
    location: "Corbyn's Cove",
    types: ["Aerial", "Thrill"],
    duration_minutes: 20,
    price_min: 2800,
    price_max: 4500,
    age_min: 14,
    images: ["/images/parasailing-1.jpg", "/images/parasailing-2.jpg"],
    safety_notes: "Weather dependent. Weight balance and harness checks are mandatory.",
  },
  {
    slug: "jet-skiing-rg-complex",
    title: "Jet Skiing",
    description:
      "High-speed guided jet skiing sessions in controlled circuits at Rajiv Gandhi Water Sports Complex.",
    location: "Rajiv Gandhi Water Sports Complex",
    types: ["Motorized", "Thrill"],
    duration_minutes: 15,
    price_min: 900,
    price_max: 1800,
    age_min: 12,
    images: ["/images/jet-ski-1.jpg", "/images/jet-ski-2.jpg"],
    safety_notes: "Life jacket compulsory. Follow instructor speed limits inside marked zone.",
  },
  {
    slug: "speed-boat-corbyn-cove",
    title: "Speed Boat",
    description:
      "Fast-paced coastal speed boat ride ideal for sightseeing and short adrenaline-packed sessions.",
    location: "Corbyn's Cove",
    types: ["Motorized", "Sightseeing"],
    duration_minutes: 25,
    price_min: 1500,
    price_max: 3200,
    age_min: 8,
    images: ["/images/speedboat-1.jpg", "/images/speedboat-2.jpg"],
    safety_notes: "Seating instructions must be followed. Not recommended for severe back issues.",
  },
  {
    slug: "banana-boat-rg-complex",
    title: "Banana Boat",
    description:
      "Fun group inflatable ride pulled by speedboat, perfect for families and friend groups.",
    location: "Rajiv Gandhi Water Sports Complex",
    types: ["Group", "Fun"],
    duration_minutes: 20,
    price_min: 700,
    price_max: 1400,
    age_min: 7,
    images: ["/images/banana-boat-1.jpg", "/images/banana-boat-2.jpg"],
    safety_notes: "Life jacket and seated grip required at all times.",
  },
  {
    slug: "glass-bottom-boat-jolly-buoy",
    title: "Glass Bottom Boat",
    description:
      "Relaxed reef viewing experience through transparent-bottom boats around protected marine zones.",
    location: "Jolly Buoy",
    types: ["Sightseeing", "Family"],
    duration_minutes: 40,
    price_min: 600,
    price_max: 1500,
    age_min: 3,
    images: ["/images/glass-bottom-1.jpg", "/images/glass-bottom-2.jpg"],
    safety_notes: "Remain seated while viewing. Avoid leaning over boat edges.",
  },
  {
    slug: "semi-submarine-north-bay",
    title: "Semi-Submarine",
    description:
      "Comfortable underwater cabin cruise offering panoramic views of reef systems and fish schools.",
    location: "North Bay",
    types: ["Sightseeing", "Family"],
    duration_minutes: 60,
    price_min: 1800,
    price_max: 3200,
    age_min: 5,
    images: ["/images/semi-sub-1.jpg", "/images/semi-sub-2.jpg"],
    safety_notes: "Follow vessel safety briefing and emergency drill before boarding.",
  },
  {
    slug: "kayaking-chidiyatapu",
    title: "Kayaking",
    description:
      "Coastal kayaking through calm waters and scenic sunset points near Chidiyatapu shoreline.",
    location: "Chidiyatapu",
    types: ["Paddle", "Nature"],
    duration_minutes: 90,
    price_min: 1200,
    price_max: 2600,
    age_min: 10,
    images: ["/images/kayak-1.jpg", "/images/kayak-2.jpg"],
    safety_notes: "Paddle briefing provided. Weather and tide conditions apply.",
  },
  {
    slug: "windsurfing-corbyn-cove",
    title: "Windsurfing",
    description:
      "Learn and practice windsurfing fundamentals with instructor guidance on moderate wind days.",
    location: "Corbyn's Cove",
    types: ["Sailing", "Skill"],
    duration_minutes: 90,
    price_min: 2500,
    price_max: 4800,
    age_min: 14,
    images: ["/images/windsurf-1.jpg", "/images/windsurf-2.jpg"],
    safety_notes: "Basic balance fitness needed. Mandatory briefing before launch.",
  },
  {
    slug: "sea-karting-rg-complex",
    title: "Sea Karting",
    description:
      "Self-drive sea karting experience on designated routes with GPS-assisted safety monitoring.",
    location: "Rajiv Gandhi Water Sports Complex",
    types: ["Motorized", "Premium"],
    duration_minutes: 40,
    price_min: 4200,
    price_max: 6800,
    age_min: 18,
    images: ["/images/sea-kart-1.jpg", "/images/sea-kart-2.jpg"],
    safety_notes: "Valid ID required. Operation allowed only after captain safety check.",
  },
  {
    slug: "sport-fishing-neil-bharatpur",
    title: "Sport Fishing",
    description:
      "Deep and nearshore catch-and-release sport fishing trips with experienced local skippers.",
    location: "Neil Bharatpur",
    types: ["Fishing", "Premium"],
    duration_minutes: 240,
    price_min: 8000,
    price_max: 18000,
    age_min: 12,
    images: ["/images/sport-fishing-1.jpg", "/images/sport-fishing-2.jpg"],
    safety_notes: "Sun protection and hydration advised. Follow crew handling instructions.",
  },
  {
    slug: "seaplane-port-blair",
    title: "Seaplane",
    description:
      "Scenic seaplane transfer and aerial viewing over turquoise islands and coral lagoons.",
    location: "Port Blair",
    types: ["Aerial", "Sightseeing"],
    duration_minutes: 35,
    price_min: 3500,
    price_max: 9000,
    age_min: 2,
    images: ["/images/seaplane-1.jpg", "/images/seaplane-2.jpg"],
    safety_notes: "Flight schedule depends on weather and DGCA operating clearance.",
  },
  {
    slug: "harbour-cruise-port-blair",
    title: "Harbour Cruise",
    description:
      "Leisurely evening harbour cruise with skyline views, local stories, and island breeze.",
    location: "Port Blair",
    types: ["Cruise", "Leisure"],
    duration_minutes: 90,
    price_min: 900,
    price_max: 2200,
    age_min: 3,
    images: ["/images/harbour-cruise-1.jpg", "/images/harbour-cruise-2.jpg"],
    safety_notes: "Boarding closes 15 minutes before departure. Life vests onboard.",
  },
  {
    slug: "sup-neil-bharatpur",
    title: "SUP",
    description:
      "Stand-up paddleboarding on gentle lagoon waters at Bharatpur Beach with beginner coaching.",
    location: "Neil Bharatpur",
    types: ["Paddle", "Fitness"],
    duration_minutes: 60,
    price_min: 1100,
    price_max: 2400,
    age_min: 12,
    images: ["/images/sup-1.jpg", "/images/sup-2.jpg"],
    safety_notes: "Life jacket and leash required. Suitable for calm sea conditions only.",
  },
  {
    slug: "water-skiing-corbyn-cove",
    title: "Water Skiing",
    description:
      "Instructor-assisted water skiing sessions for adventure seekers with stable tow speed control.",
    location: "Corbyn's Cove",
    types: ["Motorized", "Skill"],
    duration_minutes: 30,
    price_min: 2600,
    price_max: 5200,
    age_min: 16,
    images: ["/images/water-ski-1.jpg", "/images/water-ski-2.jpg"],
    safety_notes: "Knee and back warm-up recommended. Safety helmet and vest mandatory.",
  },
  {
    slug: "mangrove-kayaking-havelock",
    title: "Mangrove Kayaking",
    description:
      "Guided kayaking through serene mangrove channels with birdwatching and eco-interpretation.",
    location: "Havelock Elephant Beach",
    types: ["Paddle", "Eco"],
    duration_minutes: 100,
    price_min: 1600,
    price_max: 3200,
    age_min: 10,
    images: ["/images/mangrove-kayak-1.jpg", "/images/mangrove-kayak-2.jpg"],
    safety_notes: "Eco-sensitive zone: no littering and low-noise paddling strictly enforced.",
  },
];

const getOperatorByLocation = (
  operatorsByLocation: Map<string, { id: string; name: string }>,
  location: string,
) => {
  return operatorsByLocation.get(location) ?? operatorsByLocation.get("North Bay");
};

async function main(): Promise<void> {
  await prisma.activity.deleteMany();
  await prisma.operator.deleteMany();

  const operatorsByLocation = new Map<string, { id: string; name: string }>();

  for (const operatorSeed of operatorSeeds) {
    const operator = await prisma.operator.create({
      data: operatorSeed,
      select: {
        id: true,
        name: true,
      },
    });
    operatorsByLocation.set(operatorSeed.location, operator);
  }

  for (const activitySeed of activitySeeds) {
    const operator = getOperatorByLocation(operatorsByLocation, activitySeed.location);
    await prisma.activity.create({
      data: {
        ...activitySeed,
        operator: operator
          ? {
              connect: {
                id: operator.id,
              },
            }
          : undefined,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log(
    `Seeded ${operatorSeeds.length} operators and ${activitySeeds.length} activities successfully.`,
  );
}

main()
  .catch(async (error) => {
    // eslint-disable-next-line no-console
    console.error("Seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
