/** @type {import('next').NextConfig} */

const basePath = process.env.NEXT_BASE_PATH ?? "";

const nextConfig = {
  // Support /planner subpath via reverse proxy (set NEXT_BASE_PATH=/planner)
  basePath,
  assetPrefix: basePath,

  // Compile workspace packages from source (no separate build step needed)
  transpilePackages: [
    "@andaman-planner/shared",
    "@andaman-planner/ui",
    "@andaman-planner/supabase",
  ],

  experimental: {
    serverComponentsExternalPackages: ["@supabase/supabase-js"],
  },
};

export default nextConfig;
