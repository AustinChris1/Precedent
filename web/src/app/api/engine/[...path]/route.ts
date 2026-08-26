import { NextResponse } from "next/server";

/**
 * Thin proxy to the Python memory engine.
 *
 * One route instead of eight: the console needs every engine capability
 * reachable from the browser, and the engine's API key must never reach the
 * client. Only the paths below are forwarded, so the proxy cannot be used to
 * reach anything else on the engine host.
 */

const ENGINE_URL = process.env.ENGINE_URL ?? "http://127.0.0.1:8787";

const ALLOWED = new Set([
  "health",
  "underwrite",
  "grade",
  "dossier",
  "anchor",
  "curate",
  "watchlist",
  "charter",
  "journal",
  "agents",
]);

async function forward(req: Request, path: string[], method: "GET" | "POST") {
  if (!ALLOWED.has(path[0] ?? "")) {
    return NextResponse.json({ error: `unknown engine path: ${path[0]}` }, { status: 404 });
  }

  const search = new URL(req.url).search;
  const target = `${ENGINE_URL}/${path.join("/")}${search}`;

  let body: string | undefined;
  if (method === "POST") {
    body = await req.text();
  }

  try {
    const res = await fetch(target, {
      method,
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        ...(process.env.ENGINE_API_KEY ? { "x-api-key": process.env.ENGINE_API_KEY } : {}),
      },
      body,
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "content-type": "application/json" },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "memory engine unreachable. Start it with: uvicorn precedent.server:app --port 8787",
      },
      { status: 503 },
    );
  }
}

export async function GET(req: Request, ctx: RouteContext<"/api/engine/[...path]">) {
  const { path } = await ctx.params;
  return forward(req, path, "GET");
}

export async function POST(req: Request, ctx: RouteContext<"/api/engine/[...path]">) {
  const { path } = await ctx.params;
  return forward(req, path, "POST");
}
