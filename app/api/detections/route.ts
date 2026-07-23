import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth";
import { sendFireAlert } from "@/lib/resend";
import { Alert, Storage } from "@/lib/constants";
import { Detection, Monitor } from "@/lib/types";

export async function GET() {
  const user = await getSession();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snapshot = await adminDb
    .collection(Detection.COLLECTION)
    .where("monitor.user.id", "==", user.id)
    .get();
  const detections = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as Detection)
    .sort((first, second) => second.detected_at - first.detected_at)
    .slice(0, 50);
  return NextResponse.json({ detections });
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const monitorId = formData.get("monitor_id") as string | null;
  const frame = formData.get("frame") as File | null;
  const confidence = Number(formData.get("confidence"));
  const method = formData.get("method") as string | null;
  if (!monitorId || !frame)
    return NextResponse.json({ error: "Missing monitor_id or frame" }, { status: 400 });

  const monitorRef = adminDb.collection(Monitor.COLLECTION).doc(monitorId);
  const monitorSnapshot = await monitorRef.get();
  const monitorData = monitorSnapshot.data();
  if (!monitorSnapshot.exists || !monitorData || monitorData.user?.id !== user.id)
    return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
  const monitor = { id: monitorSnapshot.id, ...monitorData } as Monitor;

  const now = Date.now();
  const cooldownSeconds = Number(process.env.FIRE_ALERT_COOLDOWN_SECONDS) || Alert.DEFAULT_COOLDOWN_SECONDS;
  const confidentEnough = Number.isFinite(confidence) && confidence >= Alert.EMAIL_CONFIDENCE_THRESHOLD;
  const outsideCooldown =
    monitor.last_alert_at === null || now - monitor.last_alert_at >= cooldownSeconds * 1000;
  const shouldAlert = confidentEnough && outsideCooldown;

  const detectionRef = adminDb.collection(Detection.COLLECTION).doc();
  const detection: Detection = {
    id: detectionRef.id,
    monitor,
    confidence: Number.isFinite(confidence) ? confidence : 0,
    method: method || Detection.METHOD_HEURISTIC,
    detected_at: now,
    email_sent: false,
  };

  // Persist the proof frame to Storage under the detection id.
  const buffer = Buffer.from(await frame.arrayBuffer());
  const file = adminStorage.bucket().file(`${Storage.PROOF_PREFIX}/${detectionRef.id}.jpg`);
  await file.save(buffer, { contentType: Storage.PROOF_CONTENT_TYPE });

  // Email the alert only for confident detections that are outside the
  // per-monitor cooldown, so low-confidence noise and a sustained fire do not
  // send hundreds of emails. Every detection is still recorded.
  if (shouldAlert) {
    try {
      await sendFireAlert(monitor, detection, buffer);
      detection.email_sent = true;
      await monitorRef.update({ last_alert_at: now });
    } catch (error) {
      console.error("Failed to send fire alert", error);
    }
  }

  await detectionRef.set(detection);
  return NextResponse.json({ detection });
}
