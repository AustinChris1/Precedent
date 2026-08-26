/**
 * Sync the canonical docs (repo root /docs) into the app.
 *
 * The markdown lives at the repo root so it reads well straight from GitHub,
 * but Vercel builds from `web/` and cannot see `../docs`. So the synced copy in
 * src/content/docs is COMMITTED, and this script just refreshes it locally
 * before dev/build. If the source is not there — which is exactly the case on
 * Vercel — keep the committed copy and carry on rather than failing the build.
 */
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
  console.log(`docs source not present (expected on Vercel) — using ${existing.length} committed files`);
  process.exit(0);
}

await cp(from, to, { recursive: true });
console.log(`docs synced: ${(await readdir(to)).join(", ")}`);
