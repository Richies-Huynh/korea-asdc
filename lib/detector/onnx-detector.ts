import * as ort from "onnxruntime-web";
import { DetectorConfig } from "@/lib/constants";
import { Detection } from "@/lib/types";
import type { Detector, DetectionResult } from "@/lib/detector/detector";

// Runs a YOLOv8n fire/smoke model via onnxruntime-web. We only need a yes/no fire
// signal, so we take the peak class score across all boxes rather than decoding
// and running non-maximum suppression on every anchor.
export class OnnxDetector implements Detector {
  readonly method = Detection.METHOD_MODEL;
  private session: ort.InferenceSession | null = null;
  private canvas = document.createElement("canvas");
  private context = this.canvas.getContext("2d", { willReadFrequently: true });
  private readonly size = DetectorConfig.MODEL_INPUT_SIZE;

  async load(): Promise<void> {
    ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/";
    const executionProviders = "gpu" in navigator ? ["webgpu", "wasm"] : ["wasm"];
    this.session = await ort.InferenceSession.create(DetectorConfig.MODEL_PATH, {
      executionProviders,
      graphOptimizationLevel: "all",
    });
  }

  async detect(video: HTMLVideoElement): Promise<DetectionResult> {
    const session = this.session;
    const context = this.context;
    if (!session || !context || !video.videoWidth)
      return { fire: false, confidence: 0, method: this.method };

    const size = this.size;
    this.canvas.width = size;
    this.canvas.height = size;
    context.drawImage(video, 0, 0, size, size);
    const { data } = context.getImageData(0, 0, size, size);

    const area = size * size;
    const input = new Float32Array(3 * area);
    for (let pixel = 0; pixel < area; pixel++) {
      input[pixel] = data[pixel * 4] / 255;
      input[pixel + area] = data[pixel * 4 + 1] / 255;
      input[pixel + 2 * area] = data[pixel * 4 + 2] / 255;
    }

    const tensor = new ort.Tensor("float32", input, [1, 3, size, size]);
    const outputs = await session.run({ [session.inputNames[0]]: tensor });
    const confidence = this.peakScore(outputs[session.outputNames[0]]);
    return {
      fire: confidence >= DetectorConfig.CONFIDENCE_THRESHOLD,
      confidence,
      method: this.method,
    };
  }

  // Output shape is [1, 4 + numClasses, anchors], laid out flat as channel-major.
  private peakScore(output: ort.Tensor): number {
    const data = output.data as Float32Array;
    const channels = output.dims[1];
    const anchors = output.dims[2];
    const numClasses = channels - 4;
    let best = 0;
    for (let anchor = 0; anchor < anchors; anchor++) {
      for (let cls = 0; cls < numClasses; cls++) {
        const score = data[(4 + cls) * anchors + anchor];
        if (score > best)
          best = score;
      }
    }
    return best;
  }

  dispose(): void {
    this.session = null;
  }
}
