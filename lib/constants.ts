// Non-entity constants. Entity constants (roles, statuses, collections) live in
// lib/types.ts alongside their interfaces.

export const Auth = {
  SESSION_COOKIE: "fire_session",
  // Firebase session cookies support a maximum lifetime of 14 days.
  SESSION_MAX_AGE_SECONDS: 60 * 60 * 24 * 5,
} as const;

export const Storage = {
  // Storage path prefix for captured proof frames, e.g. detections/{id}.jpg
  PROOF_PREFIX: "detections",
  PROOF_CONTENT_TYPE: "image/jpeg",
} as const;

export const DetectorConfig = {
  MODEL_PATH: "/models/fire.onnx",
  MODEL_INPUT_SIZE: 640,
  // Minimum confidence for the ONNX model to count a detection as fire.
  CONFIDENCE_THRESHOLD: 0.4,
  // Detection loop cadence. Inference is expensive, so we throttle well below 60fps.
  TARGET_FPS: 3,
  // Heuristic detector: fraction of fire-colored pixels required in a frame.
  HEURISTIC_MIN_FRACTION: 0.06,
  // Consecutive tripping frames required before the heuristic reports fire.
  HEURISTIC_CONSECUTIVE_FRAMES: 4,
} as const;

export const Alert = {
  // Fallback used when FIRE_ALERT_COOLDOWN_SECONDS is not set.
  DEFAULT_COOLDOWN_SECONDS: 300,
} as const;
