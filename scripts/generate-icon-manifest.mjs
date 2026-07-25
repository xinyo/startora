import { readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const logosDir = resolve(import.meta.dirname, "../src/assets/logos");

const files = readdirSync(logosDir)
  .filter((f) => /\.(svg|png|webp|jpg|jpeg|avif)$/i.test(f))
  .sort((a, b) => a.localeCompare(b));

const manifestPath = resolve(logosDir, "manifest.json");
writeFileSync(
  manifestPath,
  JSON.stringify({ files }, null, 2),
  "utf-8",
);

console.log(`Generated ${manifestPath} with ${files.length} entries.`);
