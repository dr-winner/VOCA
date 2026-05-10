import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** frontend/ — parent of scripts/ */
const frontendRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const viteMarker = join(frontendRoot, "node_modules", "vite", "package.json");

if (!existsSync(viteMarker)) {
  console.error(
    "[voca] After npm install, vite should exist at:\n  %s\n" +
      "Fix: set Vercel Root Directory to `frontend`, run `npm install` there, or redeploy with “Clear cache”.",
    viteMarker,
  );
  process.exit(1);
}
