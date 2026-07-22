"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CircleStop, Flame } from "lucide-react";
import { toast } from "sonner";
import { createDetector, type DetectionResult, type Detector } from "@/lib/detector/detector";
import { DetectorConfig } from "@/lib/constants";
import { Monitor } from "@/lib/types";
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

type Status = "idle" | "starting" | "running";

// Milliseconds a fresh detection is suppressed after one fires, so a sustained
// fire does not flood the endpoint. Emails have their own server-side cooldown.
const REPORT_DEBOUNCE_MS = 5000;

export function MonitorView() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const detectorRef = useRef<Detector | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const monitorRef = useRef<Monitor | null>(null);
  const rafRef = useRef<number | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reportingRef = useRef(false);

  const [status, setStatus] = useState<Status>("idle");
  const [detectorMethod, setDetectorMethod] = useState<string | null>(null);
  const [name, setName] = useState("Laptop Monitor");
  const [confidence, setConfidence] = useState(0);
  const [alertCount, setAlertCount] = useState(0);

  async function reportFire(result: DetectionResult) {
    const video = videoRef.current;
    const monitor = monitorRef.current;
    if (!video || !monitor || reportingRef.current)
      return;
    reportingRef.current = true;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")?.drawImage(video, 0, 0);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.7),
      );
      if (!blob)
        return;

      const payload: Record<string /* form field */, string | File> = {
        monitor_id: monitor.id,
        frame: new File([blob], "frame.jpg", { type: "image/jpeg" }),
        confidence: String(result.confidence),
        method: result.method,
      };
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => formData.append(key, value));

      const response = await fetch("/api/detections", { method: "POST", body: formData });
      if (response.ok) {
        setAlertCount((count) => count + 1);
        toast.error(`Fire detected on ${monitor.name}`);
      }
    } finally {
      setTimeout(() => {
        reportingRef.current = false;
      }, REPORT_DEBOUNCE_MS);
    }
  }

  async function start() {
    setStatus("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }

      const response = await fetch("/api/monitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok)
        throw new Error("Could not register this monitor");
      const { monitor } = await response.json();
      monitorRef.current = monitor as Monitor;

      const detector = await createDetector();
      detectorRef.current = detector;
      setDetectorMethod(detector.method);

      heartbeatRef.current = setInterval(() => {
        const current = monitorRef.current;
        if (current)
          fetch(`/api/monitors/${current.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: Monitor.STATUS_ONLINE }),
          });
      }, 30000);

      const interval = 1000 / DetectorConfig.TARGET_FPS;
      let previous = 0;
      const tick = async (time: number) => {
        rafRef.current = requestAnimationFrame(tick);
        if (time - previous < interval)
          return;
        previous = time;
        const activeVideo = videoRef.current;
        const activeDetector = detectorRef.current;
        if (!activeVideo || !activeDetector)
          return;
        const result = await activeDetector.detect(activeVideo);
        setConfidence(result.confidence);
        if (result.fire)
          await reportFire(result);
      };
      rafRef.current = requestAnimationFrame(tick);

      setStatus("running");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start the monitor");
      stop();
    }
  }

  function stop() {
    if (rafRef.current !== null)
      cancelAnimationFrame(rafRef.current);
    if (heartbeatRef.current !== null)
      clearInterval(heartbeatRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    detectorRef.current?.dispose();

    const monitor = monitorRef.current;
    if (monitor)
      fetch(`/api/monitors/${monitor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: Monitor.STATUS_OFFLINE }),
        keepalive: true,
      });

    rafRef.current = null;
    heartbeatRef.current = null;
    streamRef.current = null;
    detectorRef.current = null;
    monitorRef.current = null;
    setStatus("idle");
    setDetectorMethod(null);
    setConfidence(0);
  }

  // Stop cleanly when the page unmounts.
  useEffect(() => {
    return () => stop();
  }, []);

  const running = status === "running";

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <Card className="lg:w-2/3">
        <CardContent className="p-0">
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
            <video ref={videoRef} autoPlay playsInline muted className="size-full object-cover" />
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
          </div>

          {running ? (
            <Button variant="destructive" onClick={stop}>
              <CircleStop />
              Stop Monitor
            </Button>
          ) : (
            <Button onClick={start} disabled={status === "starting"}>
              <Camera />
              {status === "starting" ? "Starting..." : "Start Monitor"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
