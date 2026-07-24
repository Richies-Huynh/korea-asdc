"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { onSnapshot, updateDoc } from "firebase/firestore";
import { toast } from "sonner";
import { createDetector, type DetectionResult, type Detector } from "@/lib/detector/detector";
import { canFlipCamera, getCameraStream, getFlippedCameraStream, type FacingMode } from "@/lib/camera";
import { DetectorConfig } from "@/lib/constants";
import { LiveSession, Monitor } from "@/lib/types";
import {
  RTC_CONFIG,
  candidatesCollection,
  exchangeIceCandidates,
  sessionRef,
  sessionsCollection,
} from "@/lib/webrtc";

export type MonitorStatus = "idle" | "starting" | "running";

interface MonitorContextValue {
  status: MonitorStatus;
  detectorMethod: string | null;
  confidence: number;
  alertCount: number;
  viewerCount: number;
  // The live camera stream, exposed so a page can preview it without owning it.
  stream: MediaStream | null;
  monitor: Monitor | null;
  // Whether this device can switch between a front and rear camera, so a page
  // can show a flip control only when it would do something.
  canFlip: boolean;
  start: (name: string) => Promise<void>;
  stop: () => void;
  flipCamera: () => Promise<void>;
}

const MonitorContext = createContext<MonitorContextValue | null>(null);

export function useMonitor(): MonitorContextValue {
  const value = useContext(MonitorContext);
  if (!value)
    throw new Error("useMonitor must be used within a MonitorProvider");
  return value;
}

// Milliseconds a fresh detection is suppressed after one fires, so a sustained
// fire does not flood the endpoint. Emails have their own server-side cooldown.
const REPORT_DEBOUNCE_MS = 5000;

// Owns the entire monitor lifecycle (camera, detector loop, heartbeat, and the
// WebRTC broadcaster) above the page level. Mounted once in the app layout, it
// survives navigation between app pages, so a running monitor keeps watching
// while the operator browses the dashboard. It only tears down when the app
// itself unmounts (sign out) or the tab closes.
export function MonitorProvider({ children }: { children: React.ReactNode }) {
  // The detector reads frames from this hidden video, which stays mounted for
  // the life of the app so detection never stops on navigation.
  const videoRef = useRef<HTMLVideoElement>(null);
  const detectorRef = useRef<Detector | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const monitorRef = useRef<Monitor | null>(null);
  // The lens currently in use, so a flip knows which one to switch to. Kept in a
  // ref because the flip logic reads it outside of render.
  const facingModeRef = useRef<FacingMode>("user");
  const rafRef = useRef<number | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reportingRef = useRef(false);
  // Sessions listener that answers incoming live viewers, and one peer
  // connection per viewer currently watching this monitor.
  const broadcastRef = useRef<(() => void) | null>(null);
  const peersRef = useRef<Map<string /* sessionId */, { peerConnection: RTCPeerConnection; unsubscribe: () => void }>>(
    new Map(),
  );

  const [status, setStatus] = useState<MonitorStatus>("idle");
  const [detectorMethod, setDetectorMethod] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [alertCount, setAlertCount] = useState(0);
  const [viewerCount, setViewerCount] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [canFlip, setCanFlip] = useState(false);

  // Tear down the peer connection for one viewer, whether they disconnected or
  // the monitor is stopping.
  function closePeer(sessionId: string) {
    const peer = peersRef.current.get(sessionId);
    if (!peer)
      return;
    peer.unsubscribe();
    peer.peerConnection.close();
    peersRef.current.delete(sessionId);
    setViewerCount(peersRef.current.size);
  }

  // Answer a viewer's offer by streaming this device's camera to them. Reads the
  // live stream from the ref rather than a captured value, so viewers who join
  // after a camera flip receive the current lens.
  async function answerViewer(session: LiveSession, monitorId: string) {
    const cameraStream = streamRef.current;
    if (!cameraStream)
      return;
    const peerConnection = new RTCPeerConnection(RTC_CONFIG);
    const unsubscribe = exchangeIceCandidates(
      peerConnection,
      candidatesCollection(monitorId, session.id, Monitor.MONITOR_CANDIDATES_SUBCOLLECTION),
      candidatesCollection(monitorId, session.id, Monitor.VIEWER_CANDIDATES_SUBCOLLECTION),
    );
    peersRef.current.set(session.id, { peerConnection, unsubscribe });
    setViewerCount(peersRef.current.size);

    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      console.debug("broadcast connection state", session.id, state);
      if (state === "failed" || state === "closed" || state === "disconnected")
        closePeer(session.id);
    };

    try {
      cameraStream.getTracks().forEach((track) => peerConnection.addTrack(track, cameraStream));
      await peerConnection.setRemoteDescription(session.offer);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      await updateDoc(sessionRef(monitorId, session.id), {
        answer: { type: answer.type, sdp: answer.sdp },
      });
    } catch (error) {
      console.error("Failed to answer live viewer", error);
      closePeer(session.id);
    }
  }

  async function reportFire(result: DetectionResult) {
    const video = videoRef.current;
    const current = monitorRef.current;
    if (!video || !current || reportingRef.current)
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
        monitor_id: current.id,
        frame: new File([blob], "frame.jpg", { type: "image/jpeg" }),
        confidence: String(result.confidence),
        method: result.method,
      };
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => formData.append(key, value));

      const response = await fetch("/api/detections", { method: "POST", body: formData });
      if (response.ok) {
        setAlertCount((count) => count + 1);
        toast.error(`Fire detected on ${current.name}`);
      }
    } finally {
      setTimeout(() => {
        reportingRef.current = false;
      }, REPORT_DEBOUNCE_MS);
    }
  }

  async function start(name: string) {
    setStatus("starting");
    try {
      const cameraStream = await getCameraStream(facingModeRef.current);
      streamRef.current = cameraStream;
      setStream(cameraStream);
      setCanFlip(await canFlipCamera());
      const video = videoRef.current;
      if (video) {
        video.srcObject = cameraStream;
        await video.play();
      }

      const response = await fetch("/api/monitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok)
        throw new Error("Could not register this monitor");
      const registered = (await response.json()).monitor as Monitor;
      monitorRef.current = registered;
      setMonitor(registered);

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

      // Answer dashboard viewers as they open a live view of this monitor. A
      // peer connection (and camera stream) only exists while someone watches.
      broadcastRef.current = onSnapshot(sessionsCollection(registered.id), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          // The viewer creates an empty session then fills in its offer, so a
          // ready-to-answer session can arrive as an "added" or "modified" change.
          if (change.type === "removed")
            return;
          const session = { id: change.doc.id, ...change.doc.data() } as LiveSession;
          if (!session.offer || session.answer || peersRef.current.has(session.id))
            return;
          if (Date.now() - session.created_at > LiveSession.STALE_AFTER_MS)
            return;
          void answerViewer(session, registered.id);
        });
      });

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

  // Switch to the next camera in place. On multi-camera devices this cycles
  // through the deviceIds; on mobile it toggles the front/rear lens. The new
  // track is handed to every live viewer via replaceTrack, so no connection is
  // renegotiated, and the detector keeps reading from the same hidden video.
  async function flipCamera() {
    const current = streamRef.current;
    if (status !== "running" || !current)
      return;
    let flipped: { stream: MediaStream; facingMode: FacingMode };
    try {
      flipped = await getFlippedCameraStream(current, facingModeRef.current);
    } catch {
      toast.error("Could not switch the camera");
      return;
    }
    const nextStream = flipped.stream;
    const nextTrack = nextStream.getVideoTracks()[0];
    peersRef.current.forEach(({ peerConnection }) => {
      const sender = peerConnection.getSenders().find((rtpSender) => rtpSender.track?.kind === "video");
      void sender?.replaceTrack(nextTrack);
    });
    current.getTracks().forEach((track) => track.stop());
    streamRef.current = nextStream;
    facingModeRef.current = flipped.facingMode;
    setStream(nextStream);
    const video = videoRef.current;
    if (video) {
      video.srcObject = nextStream;
      await video.play();
    }
  }

  function stop() {
    if (rafRef.current !== null)
      cancelAnimationFrame(rafRef.current);
    if (heartbeatRef.current !== null)
      clearInterval(heartbeatRef.current);
    broadcastRef.current?.();
    peersRef.current.forEach((_peer, sessionId) => closePeer(sessionId));
    streamRef.current?.getTracks().forEach((track) => track.stop());
    detectorRef.current?.dispose();

    const current = monitorRef.current;
    if (current)
      fetch(`/api/monitors/${current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: Monitor.STATUS_OFFLINE }),
        keepalive: true,
      });

    const video = videoRef.current;
    if (video)
      video.srcObject = null;

    rafRef.current = null;
    heartbeatRef.current = null;
    broadcastRef.current = null;
    streamRef.current = null;
    detectorRef.current = null;
    monitorRef.current = null;
    facingModeRef.current = "user";
    setCanFlip(false);
    setStatus("idle");
    setDetectorMethod(null);
    setConfidence(0);
    setViewerCount(0);
    setStream(null);
    setMonitor(null);
  }

  // Latest stop, read by the unmount cleanup so it never captures a stale
  // closure while keeping the cleanup effect free of changing dependencies.
  const stopRef = useRef(stop);
  stopRef.current = stop;

  // Mark the monitor offline if the tab is closed, and stop entirely when the
  // app unmounts (leaving the authenticated area). Navigation between app pages
  // keeps this provider mounted, so neither fires on a route change.
  useEffect(() => {
    const markOffline = () => {
      const current = monitorRef.current;
      if (current)
        fetch(`/api/monitors/${current.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: Monitor.STATUS_OFFLINE }),
          keepalive: true,
        });
    };
    window.addEventListener("pagehide", markOffline);
    return () => {
      window.removeEventListener("pagehide", markOffline);
      stopRef.current();
    };
  }, []);

  return (
    <MonitorContext.Provider
      value={{ status, detectorMethod, confidence, alertCount, viewerCount, stream, monitor, canFlip, start, stop, flipCamera }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="pointer-events-none fixed left-0 top-0 size-px opacity-0"
      />
      {children}
    </MonitorContext.Provider>
  );
}
