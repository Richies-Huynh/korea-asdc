"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Detection } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function DetectionsFeed() {
  const [detections, setDetections] = useState<Detection[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, Detection.COLLECTION), (snapshot) => {
      const rows = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }) as Detection)
        .sort((first, second) => second.detected_at - first.detected_at)
        .slice(0, 20);
      setDetections(rows);
    });
    return () => unsubscribe();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Detections</CardTitle>
        <CardDescription>Fire events captured across all monitors.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {detections.length === 0 ? (
          <p className="text-sm text-muted-foreground">No detections yet.</p>
        ) : (
          detections.map((detection) => (
            <div key={detection.id} className="flex items-center gap-3 rounded-lg border p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/detections/${detection.id}/file`}
                alt={`Proof frame from ${detection.monitor.name}`}
                className="size-16 shrink-0 rounded-md object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{detection.monitor.name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(detection.detected_at).toLocaleString()}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="destructive" className="bg-destructive text-white dark:bg-destructive">{Math.round(detection.confidence * 100)}% confidence</Badge>
                  <Badge variant="outline" className="bg-background">{detection.method}</Badge>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
