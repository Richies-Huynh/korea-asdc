import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth";
import { computeRisk } from "@/lib/prevention/risk";
import { Storage } from "@/lib/constants";
import { Hazard, Scan } from "@/lib/types";

export async function GET() {
  const user = await getSession();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snapshot = await adminDb
    .collection(Scan.COLLECTION)
    .where("user.id", "==", user.id)
    .get();
  const scans = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as Scan)
    .sort((first, second) => second.created_at - first.created_at)
    .slice(0, 50);
  return NextResponse.json({ scans });
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const video = formData.get("video") as File | null;
  const name = formData.get("name") as string | null;
  const hazardsRaw = formData.get("hazards") as string | null;
  const durationMs = Number(formData.get("duration_ms"));
  if (!video || !hazardsRaw)
    return NextResponse.json({ error: "Missing video or hazards" }, { status: 400 });

  const hazards = JSON.parse(hazardsRaw) as Hazard[];
  const { risk_score, risk_level } = computeRisk(hazards);

  const now = Date.now();
  const scanRef = adminDb.collection(Scan.COLLECTION).doc();
  const scan: Scan = {
    id: scanRef.id,
    user,
    name: name || "Untitled Scan",
    status: Scan.STATUS_COMPLETE,
    risk_score,
    risk_level,
    hazards,
    duration_ms: Number.isFinite(durationMs) ? durationMs : 0,
    created_at: now,
  };

  // Persist the recorded clip to Storage under the scan id.
  const buffer = Buffer.from(await video.arrayBuffer());
  const file = adminStorage.bucket().file(`${Storage.SCAN_PREFIX}/${scanRef.id}.webm`);
  await file.save(buffer, { contentType: Storage.SCAN_CONTENT_TYPE });

  await scanRef.set(scan);
  return NextResponse.json({ scan });
}
