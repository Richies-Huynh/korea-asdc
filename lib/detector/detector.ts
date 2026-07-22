import { DetectorConfig } from "@/lib/constants";

export interface DetectionResult {
  fire: boolean;
  confidence: number;
  method: string;
}

// A fire detector runs against a live <video> element. Implementations either
// wrap an ONNX model or a color heuristic, but the monitor view treats them the same.
export interface Detector {
  readonly method: string;
  load(): Promise<void>;
  detect(video: HTMLVideoElement): Promise<DetectionResult>;
  dispose(): void;
}

async function modelAvailable(): Promise<boolean> {
  try {
    const response = await fetch(DetectorConfig.MODEL_PATH, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}

// Prefer the ONNX model when its weights have been dropped into public/models;
// otherwise fall back to the always-available color+flicker heuristic. The ONNX
// module is imported lazily so onnxruntime-web stays out of the bundle when unused.
export async function createDetector(): Promise<Detector> {
  if (await modelAvailable()) {
    const { OnnxDetector } = await import("@/lib/detector/onnx-detector");
    const detector = new OnnxDetector();
    await detector.load();
    return detector;
  }
  const { HeuristicDetector } = await import("@/lib/detector/heuristic-detector");
  const detector = new HeuristicDetector();
  await detector.load();
  return detector;
}
