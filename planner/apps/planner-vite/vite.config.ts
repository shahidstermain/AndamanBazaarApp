import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // basePath can be /planner for subpath deployment
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      // Point workspace packages to source — no build step needed
      "@andaman-planner/shared": path.resolve(
        __dirname,
        "../../packages/shared/src/index.ts"
      ),
      "@andaman-planner/ui": path.resolve(
        __dirname,
        "../../packages/ui/src/index.ts"
      ),
      "@andaman-planner/supabase": path.resolve(
        __dirname,
        "../../packages/supabase/src/index.ts"
      ),
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom"],
  },
});
