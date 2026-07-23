import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth";
import { Storage } from "@/lib/constants";
import { Scan } from "@/lib/types";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const snapshot = await adminDb.collection(Scan.COLLECTION).doc(id).get();
  const data = snapshot.data();
  if (!snapshot.exists || !data || data.user?.id !== user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ scan: { id: snapshot.id, ...data } as Scan });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ref = adminDb.collection(Scan.COLLECTION).doc(id);
  const snapshot = await ref.get();
  const data = snapshot.data();
  if (!snapshot.exists || !data || data.user?.id !== user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await adminStorage
    .bucket()
    .file(`${Storage.SCAN_PREFIX}/${id}.webm`)
    .delete()
    .catch(() => {});
  await ref.delete();
  return NextResponse.json({ ok: true });
}
