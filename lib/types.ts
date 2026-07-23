// Entity interfaces and their constants live together here, so a single
// `import { User }` gives you both the type and the constant values.

export interface User {
  id: string;
  email: string;
  display_name: string;
  role: string;
  created_at: number;
}

export const User = {
  ROLE_ADMIN: "admin",
  ROLE_USER: "user",
  COLLECTION: "users",
} as const;

export interface Monitor {
  id: string;
  name: string;
  user: User;
  status: string;
  last_seen_at: number;
  last_alert_at: number | null;
  created_at: number;
}

export const Monitor = {
  STATUS_ONLINE: "online",
  STATUS_OFFLINE: "offline",
  COLLECTION: "monitors",
  // Subcollections under a monitor doc used to negotiate a live WebRTC view.
  // A viewer creates a session with an SDP offer, the monitor answers, and both
  // sides drop their ICE candidates into a candidates subcollection.
  SESSIONS_SUBCOLLECTION: "sessions",
  VIEWER_CANDIDATES_SUBCOLLECTION: "viewer_candidates",
  MONITOR_CANDIDATES_SUBCOLLECTION: "monitor_candidates",
} as const;

// One live-view negotiation between a viewer and a running monitor. The monitor
// only opens a camera peer connection while a session exists, so a monitor
// streams live video solely while someone is watching it.
export interface LiveSession {
  id: string;
  offer: RTCSessionDescriptionInit;
  answer: RTCSessionDescriptionInit | null;
  created_at: number;
}

export const LiveSession = {
  // Sessions older than this with no answer are treated as stale and ignored,
  // so a viewer that closed its tab before connecting never wedges a monitor.
  STALE_AFTER_MS: 60000,
} as const;

export interface Detection {
  id: string;
  monitor: Monitor;
  confidence: number;
  method: string;
  detected_at: number;
  email_sent: boolean;
}

export const Detection = {
  METHOD_MODEL: "model",
  METHOD_HEURISTIC: "heuristic",
  COLLECTION: "detections",
} as const;
