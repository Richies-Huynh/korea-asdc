"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CircleStop, ShieldAlert, SwitchCamera } from "lucide-react";
import { toast } from "sonner";
import { canFlipCamera, getCameraStream, oppositeFacingMode, type FacingMode } from "@/lib/camera";
import { PreventionConfig } from "@/lib/constants";
import { Hazard } from "@/lib/types";
import { HotRegionFinder, type NormalizedBox } from "@/lib/prevention/hot-regions";
import { severityStyle } from "@/lib/prevention/severity";
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

type Status = "idle" | "starting" | "recording" | "saving";

function drawBox(context: CanvasRenderingContext2D, box: NormalizedBox, stroke: string) {
  const x = box.x * context.canvas.width;
  const y = box.y * context.canvas.height;
  const width = box.width * context.canvas.width;
  const height = box.height * context.canvas.height;
  context.lineWidth = 2;
  context.strokeStyle = stroke;
  context.strokeRect(x, y, width, height);
}

export function PreventionScanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // The recorder captures this canvas, not the camera directly, so flipping the
  // camera mid-scan swaps only the source track while the recording continues.
  const recordCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const finderRef = useRef<HotRegionFinder | null>(null);
  const rafRef = useRef<number | null>(null);
  const keyframeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAtRef = useRef(0);
  const hazardsRef = useRef<Hazard[]>([]);
  // Live overlay boxes, timed by wall clock from when each one appears so it
  // holds full opacity then fades, independent of analysis latency.
  const liveBoxesRef = useRef<{ box: NormalizedBox; stroke: string; shownAt: number }[]>([]);
  const pendingRef = useRef<Set<Promise<void>>>(new Set());
  // Hazard labels already toasted, so a hazard re-detected each keyframe only
  // notifies once (mirrors the monitor's per-detection debounce).
  const seenRef = useRef<Set<string>>(new Set());
  // The lens currently in use, so a flip knows which one to switch to.
  const facingModeRef = useRef<FacingMode>("user");

  const [status, setStatus] = useState<Status>("idle");
  const [name, setName] = useState("Market Stall Scan");
  const [hazardCount, setHazardCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [canFlip, setCanFlip] = useState(false);

  function stopTracks() {
    if (rafRef.current !== null)
      cancelAnimationFrame(rafRef.current);
    if (keyframeTimerRef.current !== null)
      clearInterval(keyframeTimerRef.current);
    if (autoStopRef.current !== null)
      clearTimeout(autoStopRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    rafRef.current = null;
    keyframeTimerRef.current = null;
    autoStopRef.current = null;
    streamRef.current = null;
  }

  function reset() {
    stopTracks();
    recorderRef.current = null;
    recordCanvasRef.current = null;
    chunksRef.current = [];
    finderRef.current = null;
    hazardsRef.current = [];
    liveBoxesRef.current = [];
    pendingRef.current = new Set();
    seenRef.current = new Set();
    startedAtRef.current = 0;
    facingModeRef.current = "user";
    setStatus("idle");
    setHazardCount(0);
    setElapsed(0);
    setCanFlip(false);
  }

  async function analyzeKeyframe() {
    const video = videoRef.current;
    if (!video || !video.videoWidth)
      return;
    const capture = document.createElement("canvas");
    capture.width = video.videoWidth;
    capture.height = video.videoHeight;
    capture.getContext("2d")?.drawImage(video, 0, 0);
    const dataUrl = capture.toDataURL("image/jpeg", 0.7);
    const imageBase64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
    const timeOffset = Date.now() - startedAtRef.current;

    const analysis = (async () => {
      const response = await fetch("/api/scans/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: imageBase64 }),
      });
      if (!response.ok)
        return;
      const { hazards } = (await response.json()) as {
        hazards: Omit<Hazard, "id" | "time_offset">[];
      };
      for (const hazard of hazards) {
        hazardsRef.current.push({ ...hazard, id: crypto.randomUUID(), time_offset: timeOffset });
        liveBoxesRef.current.push({
          box: hazard.box,
          stroke: severityStyle(hazard.severity).stroke,
          shownAt: Date.now(),
        });
        const key = hazard.label.trim().toLowerCase();
        if (seenRef.current.has(key))
          continue;
        seenRef.current.add(key);
        const style = severityStyle(hazard.severity);
        const notify = style.order <= 1 ? toast.error : toast.warning;
        notify(`${style.label} hazard: ${hazard.label}`, { duration: 8000 });
      }
      if (hazards.length)
        setHazardCount(hazardsRef.current.length);
    })().catch(() => {});

    pendingRef.current.add(analysis);
    analysis.finally(() => pendingRef.current.delete(analysis));
  }

  async function start() {
    setStatus("starting");
    try {
      const stream = await getCameraStream(facingModeRef.current);
      streamRef.current = stream;
      setCanFlip(await canFlipCamera());
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }

      // Record a canvas that the animation loop copies each live frame into,
      // rather than the camera stream directly, so a mid-scan camera flip is
      // captured seamlessly without restarting the recorder.
      const recordCanvas = document.createElement("canvas");
      recordCanvas.width = video?.videoWidth || 1280;
      recordCanvas.height = video?.videoHeight || 720;
      recordCanvasRef.current = recordCanvas;

      const recorder = new MediaRecorder(recordCanvas.captureStream(), {
        mimeType: "video/webm",
        videoBitsPerSecond: PreventionConfig.VIDEO_BITS_PER_SECOND,
      });
      recorder.ondataavailable = (event) => {
        if (event.data.size)
          chunksRef.current.push(event.data);
      };
      recorder.start(1000);
      recorderRef.current = recorder;
      finderRef.current = new HotRegionFinder();
      startedAtRef.current = Date.now();

      const interval = 1000 / PreventionConfig.LIVE_TARGET_FPS;
      let previous = 0;
      const tick = (time: number) => {
        rafRef.current = requestAnimationFrame(tick);
        setElapsed(Date.now() - startedAtRef.current);
        const activeVideo = videoRef.current;
        // Copy the live frame into the recording canvas every animation frame so
        // the captured video stays smooth and follows a camera flip on its own.
        const recordCanvas = recordCanvasRef.current;
        if (activeVideo && activeVideo.videoWidth && recordCanvas) {
          if (recordCanvas.width !== activeVideo.videoWidth || recordCanvas.height !== activeVideo.videoHeight) {
            recordCanvas.width = activeVideo.videoWidth;
            recordCanvas.height = activeVideo.videoHeight;
          }
          recordCanvas.getContext("2d")?.drawImage(activeVideo, 0, 0, recordCanvas.width, recordCanvas.height);
        }
        if (time - previous < interval)
          return;
        previous = time;
        const overlay = overlayRef.current;
        const finder = finderRef.current;
        if (!activeVideo || !overlay || !finder)
          return;
        overlay.width = activeVideo.clientWidth;
        overlay.height = activeVideo.clientHeight;
        const context = overlay.getContext("2d");
        if (!context)
          return;
        context.clearRect(0, 0, overlay.width, overlay.height);
        for (const box of finder.find(activeVideo))
          drawBox(context, box, "#f59e0b");
        // Hold each hazard box at full opacity, then fade it out and drop it, so
        // boxes are clearly visible but do not accumulate and clutter the overlay.
        const now = Date.now();
        const lifetime = PreventionConfig.LIVE_HAZARD_HOLD_MS + PreventionConfig.LIVE_HAZARD_FADE_MS;
        liveBoxesRef.current = liveBoxesRef.current.filter((entry) => now - entry.shownAt <= lifetime);
        for (const entry of liveBoxesRef.current) {
          const fadeAge = now - entry.shownAt - PreventionConfig.LIVE_HAZARD_HOLD_MS;
          context.globalAlpha = fadeAge <= 0 ? 1 : Math.max(0, 1 - fadeAge / PreventionConfig.LIVE_HAZARD_FADE_MS);
          drawBox(context, entry.box, entry.stroke);
        }
        context.globalAlpha = 1;
      };
      rafRef.current = requestAnimationFrame(tick);

      keyframeTimerRef.current = setInterval(analyzeKeyframe, PreventionConfig.KEYFRAME_INTERVAL_MS);
      autoStopRef.current = setTimeout(() => {
        toast.info("Reached the maximum scan length");
        finish();
      }, PreventionConfig.MAX_SCAN_MS);

      setStatus("recording");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start the scan");
      reset();
    }
  }

  // Switch between the front and rear camera in place. Only the source track is
  // replaced, so the preview, hazard analysis, and canvas recording all continue
  // uninterrupted with the new lens.
  async function flipCamera() {
    const current = streamRef.current;
    if (status !== "recording" || !current)
      return;
    const next = oppositeFacingMode(facingModeRef.current);
    let nextStream: MediaStream;
    try {
      nextStream = await getCameraStream(next);
    } catch {
      toast.error("Could not switch the camera");
      return;
    }
    current.getTracks().forEach((track) => track.stop());
    streamRef.current = nextStream;
    facingModeRef.current = next;
    const video = videoRef.current;
    if (video) {
      video.srcObject = nextStream;
      await video.play();
    }
  }

  async function finish() {
    const recorder = recorderRef.current;
    if (!recorder || status === "saving")
      return;
    setStatus("saving");
    const durationMs = Date.now() - startedAtRef.current;

    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });
    recorder.stop();
    stopTracks();
    await stopped;
    // Wait for any in-flight keyframe analyses to land before saving.
    await Promise.allSettled(Array.from(pendingRef.current));

    try {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const payload: Record<string /* form field */, string | File> = {
        video: new File([blob], "scan.webm", { type: "video/webm" }),
        name,
        hazards: JSON.stringify(hazardsRef.current),
        duration_ms: String(durationMs),
      };
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => formData.append(key, value));

      const response = await fetch("/api/scans", { method: "POST", body: formData });
      if (!response.ok)
        throw new Error("Could not save the scan");
      const { scan } = await response.json();
      router.push(`/prevention/${scan.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the scan");
      reset();
    }
  }

  // Stop the camera cleanly when the page unmounts.
  useEffect(() => {
    return () => stopTracks();
  }, []);

  const recording = status === "recording";
  const seconds = Math.floor(elapsed / 1000);

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <Card className="lg:w-2/3">
        <CardContent className="p-0">
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
            <video ref={videoRef} autoPlay playsInline muted className="size-full object-cover" />
            <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 size-full" />
            {!recording && status !== "saving" ? (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
                Camera is off
              </div>
            ) : null}
            {recording ? (
              <div className="absolute left-3 top-3 flex items-center gap-2">
                <Badge variant="destructive" className="gap-1">
                  <ShieldAlert className="size-3" />
                  Scanning
                </Badge>
                <Badge variant="secondary">{hazardCount} found</Badge>
              </div>
            ) : null}
            {recording && canFlip ? (
              <Button
                size="icon"
                variant="secondary"
                onClick={flipCamera}
                className="tooltip tooltip-left absolute right-3 top-3"
                data-tooltip="Flip Camera"
              >
                <SwitchCamera />
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:w-1/3">
        <CardHeader>
          <CardTitle>Scan Your Stall</CardTitle>
          <CardDescription>
            Slowly pan across your stall. Hazards are highlighted as they are found.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="scan-name">Scan Name</Label>
            <Input
              id="scan-name"
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
              <span className="text-muted-foreground">Elapsed</span>
              <span className="font-medium">{seconds}s</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Hazards Found</span>
              <span className="font-medium">{hazardCount}</span>
            </div>
          </div>

          {recording ? (
            <Button variant="destructive" onClick={finish}>
              <CircleStop />
              Finish Scan
            </Button>
          ) : (
            <Button onClick={start} disabled={status !== "idle"}>
              <Camera />
              {status === "starting" ? "Starting..." : status === "saving" ? "Saving..." : "Start Scan"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
