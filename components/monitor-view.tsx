"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CircleStop, Eye, Flame } from "lucide-react";
import { useMonitor } from "@/components/monitor-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function MonitorView() {
  const { status, detectorMethod, confidence, alertCount, viewerCount, stream, start, stop } = useMonitor();
  const [name, setName] = useState("Laptop Monitor");
  const previewRef = useRef<HTMLVideoElement>(null);

  // Mirror the shared camera stream into this page's preview. The monitor keeps
  // running from the provider even when this page (and its preview) unmounts.
  useEffect(() => {
    const video = previewRef.current;
    if (video)
      video.srcObject = stream;
  }, [stream]);

  const running = status === "running";

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <Card className="lg:w-2/3">
        <CardContent className="p-0">
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
            <video ref={previewRef} autoPlay playsInline muted className="size-full object-cover" />
            {!running ? (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
                Camera is off
              </div>
            ) : null}
            {running ? (
              <div className="absolute left-3 top-3 flex items-center gap-2">
                <Badge variant="destructive" className="gap-1">
                  <Flame className="size-3" />
                  Live
                </Badge>
                {viewerCount > 0 ? (
                  <Badge variant="secondary" className="gap-1">
                    <Eye className="size-3" />
                    {viewerCount}
                  </Badge>
                ) : null}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:w-1/3">
        <CardHeader>
          <CardTitle>Controls</CardTitle>
          <CardDescription>Start this device as a fire monitor.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="monitor-name">Monitor Name</Label>
            <Input
              id="monitor-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={status !== "idle"}
            />
          </div>

          <div className="flex flex-col gap-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium capitalize">{status}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Detector</span>
              <span className="font-medium capitalize">{detectorMethod ?? "Not loaded"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Confidence</span>
              <span className="font-medium">{Math.round(confidence * 100)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Alerts Sent</span>
              <span className="font-medium">{alertCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Watching Now</span>
              <span className="font-medium">{viewerCount}</span>
            </div>
          </div>

          {running ? (
            <Button variant="destructive" onClick={stop}>
              <CircleStop />
              Stop Monitor
            </Button>
          ) : (
            <Button onClick={() => start(name)} disabled={status === "starting"}>
              <Camera />
              {status === "starting" ? "Starting..." : "Start Monitor"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
