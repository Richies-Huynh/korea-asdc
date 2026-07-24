import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth";
import { Storage } from "@/lib/constants";
import { Detection } from "@/lib/types";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user)
    return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  // Detections are global: the dashboard feed spans every monitor and any
  // signed-in user may read every detection doc (see firestore.rules), so the
  // proof frame is served to any signed-in viewer, not just the monitor owner.
  const snapshot = await adminDb.collection(Detection.COLLECTION).doc(id).get();
  const data = snapshot.data();
  if (!snapshot.exists || !data)
    return new NextResponse("Not found", { status: 404 });

  const file = adminStorage.bucket().file(`${Storage.PROOF_PREFIX}/${id}.jpg`);
  const [buffer] = await file.download();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": Storage.PROOF_CONTENT_TYPE,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
