import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { analyzeHazards } from "@/lib/anthropic";

// Analyse a single scan keyframe with Claude vision. Called repeatedly during a
// scan; stateless, so no scan document exists yet. The client stamps each
// returned hazard with an id and the recording time_offset.
export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { image_base64 } = await request.json();
  if (!image_base64)
    return NextResponse.json({ error: "Missing image_base64" }, { status: 400 });

  try {
    const hazards = await analyzeHazards(image_base64);
    return NextResponse.json({ hazards });
  } catch (error) {
    console.error("Failed to analyze keyframe", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 502 });
  }
}
