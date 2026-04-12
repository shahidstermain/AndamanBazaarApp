import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "favicon.ico"],
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            // Cache Firebase Storage images
            urlPattern:
              /^https:\/\/(firebasestorage\.googleapis\.com|storage\.googleapis\.com)\//,
            handler: "CacheFirst",
            options: {
              cacheName: "firebase-listing-images",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // Cache for 1 week
              },
            },
          },
        ],
      },
      manifest: {
        name: "AndamanBazaar",
        short_name: "ABazaar",
        description: "Hyperlocal marketplace for the Andaman & Nicobar Islands",
        theme_color: "#0284c7",
        background_color: "#f8fafc",
        display: "standalone",
        scope: "./",
        start_url: "./",
        icons: [
          {
            src: "/favicon.png",
            sizes: "64x64",
            type: "image/png",
          },
          {
            src: "/logo192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/logo512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Raise warning threshold to 600 kB (from 500 kB default)
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          // Charts — only loaded on Dashboard; separate chunk improves caching
          if (id.includes("recharts") || id.includes("d3-")) {
            return "vendor-charts";
          }
          // Firebase SDK — large, shared, cache-stable
          if (
            id.includes("node_modules/firebase") ||
            id.includes("node_modules/@firebase")
          ) {
            return "vendor-firebase";
          }
          // Radix UI primitives
          if (id.includes("@radix-ui")) {
            return "vendor-radix";
          }
          // Sentry error tracking
          if (id.includes("@sentry")) {
            return "vendor-sentry";
          }
        },
      },
    },
  },
});
