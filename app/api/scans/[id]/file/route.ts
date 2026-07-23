import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth";
import { Storage } from "@/lib/constants";
import { Scan } from "@/lib/types";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user)
    return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const snapshot = await adminDb.collection(Scan.COLLECTION).doc(id).get();
  const data = snapshot.data();
  if (!snapshot.exists || !data || data.user?.id !== user.id)
    return new NextResponse("Not found", { status: 404 });

  const file = adminStorage.bucket().file(`${Storage.SCAN_PREFIX}/${id}.webm`);
  const [buffer] = await file.download();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": Storage.SCAN_CONTENT_TYPE,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
