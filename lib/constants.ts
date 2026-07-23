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
  // Storage path prefix for recorded prevention scans, e.g. scans/{id}.webm
  SCAN_PREFIX: "scans",
  SCAN_CONTENT_TYPE: "video/webm",
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

export const PreventionConfig = {
  // How often a scan keyframe is sent to Claude for hazard analysis.
  KEYFRAME_INTERVAL_MS: 1500,
  // Maximum scan length, to bound storage and analysis cost.
  MAX_SCAN_MS: 180000,
  // MediaRecorder target bitrate, keeps a 90s clip around 15-20 MB.
  VIDEO_BITS_PER_SECOND: 1500000,
  // Cadence of the on-device heuristic overlay that highlights heat sources.
  LIVE_TARGET_FPS: 4,
  // A hazard box is drawn during review when playback is within this window
  // of the moment it was flagged.
  REVIEW_BOX_WINDOW_MS: 1200,
  // During a live scan, a detected hazard box stays at full opacity for
  // LIVE_HAZARD_HOLD_MS, then fades out over LIVE_HAZARD_FADE_MS, so boxes are
  // clearly visible but do not accumulate and clutter the overlay. Timed from
  // when the box appears, not when the frame was captured.
  LIVE_HAZARD_HOLD_MS: 6000,
  LIVE_HAZARD_FADE_MS: 2500,
} as const;
