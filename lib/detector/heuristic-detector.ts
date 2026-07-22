import { DetectorConfig } from "@/lib/constants";
import { Detection } from "@/lib/types";
import type { Detector, DetectionResult } from "@/lib/detector/detector";

// Rule-based fire detector. Counts pixels in the fire chromatic range (Chen/Celik
// rules) and requires the signal to persist across several consecutive frames,
// which rejects momentary orange objects and static scenes.
export class HeuristicDetector implements Detector {
  readonly method = Detection.METHOD_HEURISTIC;
  private canvas = document.createElement("canvas");
  private context = this.canvas.getContext("2d", { willReadFrequently: true });
  private consecutive = 0;
  private readonly width = 160;
  private readonly height = 120;

  async load(): Promise<void> {}

  async detect(video: HTMLVideoElement): Promise<DetectionResult> {
    const context = this.context;
    if (!context || !video.videoWidth)
      return { fire: false, confidence: 0, method: this.method };

    this.canvas.width = this.width;
    this.canvas.height = this.height;
    context.drawImage(video, 0, 0, this.width, this.height);
    const { data } = context.getImageData(0, 0, this.width, this.height);

    const total = this.width * this.height;
    let firePixels = 0;
    for (let index = 0; index < data.length; index += 4) {
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      if (red > 190 && red > green && green > blue && red - blue > 60)
        firePixels++;
    }

    const fraction = firePixels / total;
    this.consecutive = fraction >= DetectorConfig.HEURISTIC_MIN_FRACTION ? this.consecutive + 1 : 0;
    const fire = this.consecutive >= DetectorConfig.HEURISTIC_CONSECUTIVE_FRAMES;
    const confidence = Math.min(1, fraction / (DetectorConfig.HEURISTIC_MIN_FRACTION * 3));
    return { fire, confidence, method: this.method };
  }

  dispose(): void {
    this.consecutive = 0;
  }
}
