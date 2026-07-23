import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { adminDb } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth";
import { Scan } from "@/lib/types";
import { ScanReview } from "@/components/scan-review";

export default async function ScanReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user)
    return null;

  const { id } = await params;
  const snapshot = await adminDb.collection(Scan.COLLECTION).doc(id).get();
  const data = snapshot.data();
  if (!snapshot.exists || !data || data.user?.id !== user.id)
    notFound();
  const scan = { id: snapshot.id, ...data } as Scan;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/prevention"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Back to Prevention
        </Link>
        <h1 className="text-2xl font-semibold">{scan.name}</h1>
        <p className="text-sm text-muted-foreground">
          {new Date(scan.created_at).toLocaleString()}
        </p>
      </div>
      <ScanReview scan={scan} />
    </div>
  );
}
