"use client";

import { useEffect, useRef, useState } from "react";
import { addDoc, deleteDoc, onSnapshot, updateDoc, type DocumentReference } from "firebase/firestore";
import { Monitor } from "@/lib/types";
import {
  RTC_CONFIG,
  candidatesCollection,
  exchangeIceCandidates,
  sessionsCollection,
} from "@/lib/webrtc";

type ConnectionState = "connecting" | "live" | "failed";

// Renders the live camera of a running monitor by negotiating a WebRTC session
// over Firestore. The session doc (and thus the monitor's peer connection) is
// created on mount and deleted on unmount, so the feed only exists while open.
export function MonitorLiveView({ monitor }: { monitor: Monitor }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<ConnectionState>("connecting");

  useEffect(() => {
    const peerConnection = new RTCPeerConnection(RTC_CONFIG);
    const remoteStream = new MediaStream();
    if (videoRef.current)
      videoRef.current.srcObject = remoteStream;

    peerConnection.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => remoteStream.addTrack(track));
      setState("live");
      // Autoplay can be blocked until tracks arrive, so nudge playback.
      void videoRef.current?.play().catch(() => {});
    };
    peerConnection.oniceconnectionstatechange = () => {
      console.debug("live view ICE state", peerConnection.iceConnectionState);
    };
    peerConnection.onconnectionstatechange = () => {
      console.debug("live view connection state", peerConnection.connectionState);
      if (peerConnection.connectionState === "failed")
        setState("failed");
    };

    let sessionDoc: DocumentReference | null = null;
    let unsubscribeAnswer = () => {};
    let unsubscribeCandidates = () => {};
    let cancelled = false;

    async function connect() {
      // Create the session shell first so both sides have a doc id to attach
      // their ICE candidates to, then wire signaling before the offer is made
      // so no early candidate is dropped.
      const created = await addDoc(sessionsCollection(monitor.id), {
        offer: null,
        answer: null,
        created_at: Date.now(),
      });
      if (cancelled) {
        void deleteDoc(created);
        return;
      }
      sessionDoc = created;

      unsubscribeCandidates = exchangeIceCandidates(
        peerConnection,
        candidatesCollection(monitor.id, created.id, Monitor.VIEWER_CANDIDATES_SUBCOLLECTION),
        candidatesCollection(monitor.id, created.id, Monitor.MONITOR_CANDIDATES_SUBCOLLECTION),
      );
      unsubscribeAnswer = onSnapshot(created, (snapshot) => {
        const data = snapshot.data();
        if (data?.answer && !peerConnection.currentRemoteDescription)
          void peerConnection.setRemoteDescription(data.answer);
      });

      peerConnection.addTransceiver("video", { direction: "recvonly" });
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      await updateDoc(created, { offer: { type: offer.type, sdp: offer.sdp } });
    }

    void connect();

    return () => {
      cancelled = true;
      unsubscribeAnswer();
      unsubscribeCandidates();
      peerConnection.close();
      if (sessionDoc)
        void deleteDoc(sessionDoc);
    };
  }, [monitor.id]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
      <video ref={videoRef} autoPlay playsInline muted className="size-full object-contain" />
      {state !== "live" ? (
        <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-white/70">
          {state === "failed"
            ? "Could not connect to this monitor. It may have gone offline."
            : "Connecting to the live feed..."}
        </div>
      ) : null}
    </div>
  );
}
