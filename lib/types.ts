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
