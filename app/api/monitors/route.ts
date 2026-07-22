import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth";
import { Monitor } from "@/lib/types";

export async function GET() {
  const user = await getSession();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snapshot = await adminDb
    .collection(Monitor.COLLECTION)
    .where("user.id", "==", user.id)
    .get();
  const monitors = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as Monitor)
    .sort((first, second) => second.created_at - first.created_at);
  return NextResponse.json({ monitors });
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await request.json();
  const now = Date.now();
  const monitor: Omit<Monitor, "id"> = {
    name: name || "Untitled Monitor",
    user,
    status: Monitor.STATUS_ONLINE,
    last_seen_at: now,
    last_alert_at: null,
    created_at: now,
  };
  const ref = await adminDb.collection(Monitor.COLLECTION).add(monitor);
  return NextResponse.json({ monitor: { id: ref.id, ...monitor } });
}
