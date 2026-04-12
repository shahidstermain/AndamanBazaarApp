import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { writeFileSync } from "fs";
import { join } from "path";
import { config } from "dotenv";

// Load environment variables
config();

// Initialize Firebase with environment variables
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: number;
}

const BASE_URL = "https://andamanbazaar.in";

async function generateSitemap() {
  console.log("🗺️  Generating sitemap...");

  const urls: SitemapUrl[] = [];

  // Static pages
  const staticPages = [
    { path: "/", priority: 1.0, changefreq: "daily" as const },
    { path: "/listings", priority: 0.9, changefreq: "hourly" as const },
    { path: "/about", priority: 0.7, changefreq: "monthly" as const },
    { path: "/pricing", priority: 0.8, changefreq: "monthly" as const },
    { path: "/contact", priority: 0.6, changefreq: "monthly" as const },
    { path: "/privacy", priority: 0.5, changefreq: "yearly" as const },
    { path: "/terms", priority: 0.5, changefreq: "yearly" as const },
  ];

  staticPages.forEach((page) => {
    urls.push({
      loc: `${BASE_URL}${page.path}`,
      changefreq: page.changefreq,
      priority: page.priority,
      lastmod: new Date().toISOString().split("T")[0],
    });
  });

  // Fetch active listings
  try {
    const listingsQuery = query(
      collection(db, "listings"),
      where("status", "==", "active"),
      where("isActive", "==", true),
    );

    const listingsSnapshot = await getDocs(listingsQuery);

    console.log(`📦 Found ${listingsSnapshot.size} active listings`);

    listingsSnapshot.forEach((doc) => {
      const listing = doc.data();
      urls.push({
        loc: `${BASE_URL}/listings/${doc.id}`,
        lastmod:
          listing.updatedAt?.toDate?.()?.toISOString().split("T")[0] ||
          new Date().toISOString().split("T")[0],
        changefreq: "weekly",
        priority: listing.isFeatured ? 0.9 : 0.7,
      });
    });
  } catch (error) {
    console.error("Error fetching listings:", error);
  }

  // Fetch categories
  try {
    const categoriesQuery = query(
      collection(db, "categories"),
      where("isActive", "==", true),
    );

    const categoriesSnapshot = await getDocs(categoriesQuery);

    console.log(`📁 Found ${categoriesSnapshot.size} active categories`);

    categoriesSnapshot.forEach((doc) => {
      urls.push({
        loc: `${BASE_URL}/listings?category=${doc.id}`,
        changefreq: "daily",
        priority: 0.8,
      });
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
  }

  // Generate XML
  const xml = generateSitemapXML(urls);

  // Write to file
  const outputPath = join(process.cwd(), "public", "sitemap.xml");
  writeFileSync(outputPath, xml, "utf-8");

  console.log(`✅ Sitemap generated successfully with ${urls.length} URLs`);
  console.log(`📍 Saved to: ${outputPath}`);
}

function generateSitemapXML(urls: SitemapUrl[]): string {
  const urlEntries = urls
    .map((url) => {
      return `  <url>
    <loc>${escapeXml(url.loc)}</loc>
    ${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ""}
    ${url.changefreq ? `<changefreq>${url.changefreq}</changefreq>` : ""}
    ${url.priority !== undefined ? `<priority>${url.priority.toFixed(1)}</priority>` : ""}
  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Run the script
generateSitemap()
  .then(() => {
    console.log("🎉 Sitemap generation complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error generating sitemap:", error);
    process.exit(1);
  });
