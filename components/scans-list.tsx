"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { Scan, User } from "@/lib/types";
import { severityStyle } from "@/lib/prevention/severity";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Map a scan's risk level to a badge variant, reusing the severity palette
// thresholds (severe/high read as alerts, moderate as neutral, low as quiet).
function riskVariant(scan: Scan): "destructive" | "secondary" | "outline" {
  if (scan.risk_level === Scan.RISK_SEVERE || scan.risk_level === Scan.RISK_HIGH)
    return "destructive";
  if (scan.risk_level === Scan.RISK_MODERATE)
    return "secondary";
  return "outline";
}

export function ScansList({ user }: { user: User }) {
  const [scans, setScans] = useState<Scan[]>([]);

  useEffect(() => {
    const scansQuery = query(collection(db, Scan.COLLECTION), where("user.id", "==", user.id));
    const unsubscribe = onSnapshot(scansQuery, (snapshot) => {
      const rows = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }) as Scan)
        .sort((first, second) => second.created_at - first.created_at);
      setScans(rows);
    });
    return () => unsubscribe();
  }, [user.id]);

  async function removeScan(id: string) {
    const response = await fetch(`/api/scans/${id}`, { method: "DELETE" });
    if (!response.ok)
      toast.error("Could not remove the scan");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Scans</CardTitle>
        <CardDescription>Prevention scans of your market stall.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {scans.length === 0 ? (
          <p className="text-sm text-muted-foreground">No scans yet.</p>
        ) : (
          scans.map((scan) => {
            const criticalOrHigh = scan.hazards.filter(
              (hazard) => severityStyle(hazard.severity).order <= 1,
            ).length;
            return (
              <div key={scan.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <Link href={`/prevention/${scan.id}`} className="min-w-0 flex-1">
                  <p className="font-medium break-words">{scan.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(scan.created_at).toLocaleString()}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge variant={riskVariant(scan)}>{scan.risk_level} Risk</Badge>
                    <Badge variant="outline">
                      {scan.hazards.length} {scan.hazards.length === 1 ? "hazard" : "hazards"}
                    </Badge>
                    {criticalOrHigh > 0 ? (
                      <Badge variant="destructive">{criticalOrHigh} serious</Badge>
                    ) : null}
                  </div>
                </Link>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="tooltip tooltip-right"
                  data-tooltip="Remove Scan"
                  onClick={() => removeScan(scan.id)}
                >
                  <Trash2 />
                </Button>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
