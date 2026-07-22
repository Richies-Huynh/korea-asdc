import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth";
import { Monitor } from "@/lib/types";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { status } = await request.json();
  const ref = adminDb.collection(Monitor.COLLECTION).doc(id);
  const snapshot = await ref.get();
  const data = snapshot.data();
  if (!snapshot.exists || !data || data.user?.id !== user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updates: Record<string /* field name */, string | number> = { last_seen_at: Date.now() };
  if (status)
    updates.status = status;
  await ref.update(updates);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ref = adminDb.collection(Monitor.COLLECTION).doc(id);
  const snapshot = await ref.get();
  const data = snapshot.data();
  if (!snapshot.exists || !data || data.user?.id !== user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await ref.delete();
  return NextResponse.json({ ok: true });
}
