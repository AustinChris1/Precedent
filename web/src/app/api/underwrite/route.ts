import { NextResponse } from "next/server";
import { underwrite } from "@/lib/engine";

/** The paid endpoint. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.agentId || typeof body.amountUsdc !== "number" || !body.jobDescription) {
    return NextResponse.json(
      { error: "agentId, amountUsdc and jobDescription are required" },
      { status: 422 },
    );
  }

  try {
    const decision = await underwrite(body.agentId, body.amountUsdc, body.jobDescription);
    return NextResponse.json(decision);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
