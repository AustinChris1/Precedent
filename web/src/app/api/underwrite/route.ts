import { NextResponse } from "next/server";
import { underwrite } from "@/lib/engine";

/**
 * The paid endpoint. Agents ask "should I hire X for Y at Z?" and get terms
 * backed by recalled incidents. Base USDC settlement is added
 * in front of this handler on day 4.
 */
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
