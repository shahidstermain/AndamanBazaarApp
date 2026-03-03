import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, "../backend");
const outputPath = process.argv[2] ?? "../leads-export.csv";

const result = spawnSync("npm", ["run", "export:leads", "--", outputPath], {
  cwd: backendDir,
  stdio: "inherit",
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
