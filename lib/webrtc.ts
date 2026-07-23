// Client-side WebRTC signaling over Firestore. There is no dedicated WebSocket
// signaling server, so the running monitor (broadcaster) and each dashboard
// viewer exchange their SDP offer/answer and ICE candidates through short-lived
// Firestore docs under `monitors/{id}/sessions`. Media itself flows peer-to-peer.
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  type CollectionReference,
  type DocumentReference,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Monitor } from "@/lib/types";

// Public STUN servers let peers discover their public-facing candidates. No TURN
// relay is configured, so a viewer behind a symmetric NAT may fail to connect.
export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }],
};

export function sessionsCollection(monitorId: string): CollectionReference {
  return collection(db, Monitor.COLLECTION, monitorId, Monitor.SESSIONS_SUBCOLLECTION);
}

export function sessionRef(monitorId: string, sessionId: string): DocumentReference {
  return doc(db, Monitor.COLLECTION, monitorId, Monitor.SESSIONS_SUBCOLLECTION, sessionId);
}

export function candidatesCollection(
  monitorId: string,
  sessionId: string,
  which: string,
): CollectionReference {
  return collection(
    db,
    Monitor.COLLECTION,
    monitorId,
    Monitor.SESSIONS_SUBCOLLECTION,
    sessionId,
    which,
  );
}

// Wire both directions of ICE candidate trickling for a peer connection: local
// candidates are written to `localCandidates`, remote ones are consumed from
// `remoteCandidates` as they arrive. Returns a teardown that stops both.
//
// A remote candidate cannot be added until the remote description is set, and
// candidates routinely arrive first (the peer often wrote them to Firestore
// before this side has processed the offer/answer). So remote candidates are
// buffered until a remote description lands, then flushed. Dropping this
// buffering starves ICE and the connection never establishes.
export function exchangeIceCandidates(
  peerConnection: RTCPeerConnection,
  localCandidates: CollectionReference,
  remoteCandidates: CollectionReference,
): () => void {
  peerConnection.onicecandidate = (event) => {
    if (event.candidate)
      void addDoc(localCandidates, event.candidate.toJSON());
  };

  const pending: RTCIceCandidateInit[] = [];
  const addCandidate = (candidate: RTCIceCandidateInit) => {
    peerConnection
      .addIceCandidate(new RTCIceCandidate(candidate))
      .catch((error) => console.error("Failed to add ICE candidate", error));
  };
  const flush = () => {
    if (!peerConnection.remoteDescription)
      return;
    while (pending.length)
      addCandidate(pending.shift() as RTCIceCandidateInit);
  };

  // setRemoteDescription changes the signaling state, so this is our cue that
  // buffered candidates can now be applied.
  peerConnection.addEventListener("signalingstatechange", flush);

  const unsubscribe = onSnapshot(remoteCandidates, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type !== "added")
        return;
      const candidate = change.doc.data() as RTCIceCandidateInit;
      if (peerConnection.remoteDescription)
        addCandidate(candidate);
      else
        pending.push(candidate);
    });
  });

  return () => {
    peerConnection.removeEventListener("signalingstatechange", flush);
    unsubscribe();
  };
}
