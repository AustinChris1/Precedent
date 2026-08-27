/* * Sync the canonical docs (repo root /docs) into the app. */
import { cp, mkdir, readdir, access } from "node:fs/promises";
import path from "node:path";

const from = path.resolve(process.cwd(), "../docs");
const to = path.resolve(process.cwd(), "src/content/docs");

await mkdir(to, { recursive: true });

try {
  await access(from);
} catch {
  const existing = await readdir(to).catch(() => []);
  if (existing.length === 0) {
    console.error(`no docs source at ${from} and nothing committed in ${to}`);
    process.exit(1);
  }
  console.log(`docs source not present (expected on Vercel), using ${existing.length} committed files`);
  process.exit(0);
}

await cp(from, to, { recursive: true });
console.log(`docs synced: ${(await readdir(to)).join(", ")}`);
