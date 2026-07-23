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

// A single fire hazard flagged during a prevention scan. Embedded in a Scan
// document, so it has no collection of its own. The box is normalised to the
// video frame (0..1) so it can be redrawn at any player size.
export interface Hazard {
  id: string;
  label: string;
  category: string;
  severity: string;
  confidence: number;
  box: { x: number; y: number; width: number; height: number };
  time_offset: number;
  recommendation: string;
  method: string;
}

export const Hazard = {
  SEVERITY_LOW: "low",
  SEVERITY_MEDIUM: "medium",
  SEVERITY_HIGH: "high",
  SEVERITY_CRITICAL: "critical",
  // Open flame, gas burner, portable stove, space heater.
  CATEGORY_IGNITION: "ignition",
  // Overloaded outlet, exposed or tangled wiring.
  CATEGORY_ELECTRICAL: "electrical",
  // LPG or propane cylinder, flammable liquids.
  CATEGORY_FUEL: "fuel",
  // Clutter or combustibles that let a fire spread.
  CATEGORY_FUEL_LOAD: "fuel_load",
  // Blocked aisle or exit.
  CATEGORY_EGRESS: "egress",
  METHOD_MODEL: "model",
  METHOD_HEURISTIC: "heuristic",
} as const;

export interface Scan {
  id: string;
  user: User;
  name: string;
  status: string;
  risk_score: number;
  risk_level: string;
  hazards: Hazard[];
  duration_ms: number;
  created_at: number;
}

export const Scan = {
  STATUS_ANALYZING: "analyzing",
  STATUS_COMPLETE: "complete",
  RISK_LOW: "Low",
  RISK_MODERATE: "Moderate",
  RISK_HIGH: "High",
  RISK_SEVERE: "Severe",
  COLLECTION: "scans",
} as const;

// A cited reference backing a historical fire event.
export interface FireEventSource {
  title: string;
  publisher: string;
  url: string;
}

// A historical, catastrophic fire in the Gwangju area. This is curated
// reference content shipped in the codebase (see lib/fire-history.ts), not a
// Firestore entity, so the const carries severity values but no COLLECTION.
export interface FireEvent {
  id: string;
  title: string;
  location_name: string;
  latitude: number;
  longitude: number;
  occurred_at: number;
  cause: string;
  casualties: string;
  severity: string;
  summary: string;
  sources: FireEventSource[];
}

export const FireEvent = {
  SEVERITY_CATASTROPHIC: "catastrophic",
  SEVERITY_MAJOR: "major",
  SEVERITY_MODERATE: "moderate",
} as const;
