import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { marked } from "marked";

/** Docs are markdown files synced from the repo root by scripts/sync-docs.mjs. */

const DOCS_DIR = path.join(process.cwd(), "src/content/docs");

/** Fixed order, this is a reading sequence, not an alphabetical list. */
export const DOC_ORDER = ["overview", "how-it-works", "usage"] as const;

export type DocMeta = { slug: string; title: string; summary: string };
export type Doc = DocMeta & { html: string; headings: { id: string; text: string }[] };

function parseFrontmatter(raw: string) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return { meta: {} as Record<string, string>, body: raw };
  const meta: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx > 0) meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return { meta, body: raw.slice(match[0].length) };
}

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

export async function getDocSlugs(): Promise<string[]> {
  const files = await readdir(DOCS_DIR);
  const slugs = files.filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, ""));
  return [...slugs].sort(
    (a, b) =>
      (DOC_ORDER.indexOf(a as never) + 1 || 99) - (DOC_ORDER.indexOf(b as never) + 1 || 99),
  );
}

export async function getDoc(slug: string): Promise<Doc | null> {
  let raw: string;
  try {
    raw = await readFile(path.join(DOCS_DIR, `${slug}.md`), "utf8");
  } catch {
    return null;
  }

  const { meta, body: rawBody } = parseFrontmatter(raw);
  // the page renders the title from frontmatter, so drop a duplicate leading H1
  const body = rawBody.replace(/^\s*#\s+.*\r?\n/, "");
  const headings: { id: string; text: string }[] = [];

  const renderer = new marked.Renderer();
  renderer.heading = function ({ tokens, text, depth }) {
    const id = slugify(text);
    if (depth === 2) headings.push({ id, text });
    return `<h${depth} id="${id}">${this.parser.parseInline(tokens)}</h${depth}>`;
  };

  const html = await marked.parse(body, { renderer, gfm: true });

  return {
    slug,
    title: meta.title ?? slug,
    summary: meta.summary ?? "",
    html,
    headings,
  };
}

export async function getAllDocMeta(): Promise<DocMeta[]> {
  const slugs = await getDocSlugs();
  const docs = await Promise.all(slugs.map((s) => getDoc(s)));
  return docs.filter((d): d is Doc => d !== null).map(({ slug, title, summary }) => ({
    slug,
    title,
    summary,
  }));
}
