// Instant, on-device heuristic that highlights fire-coloured regions while a
// scan records. It only powers the live overlay for immediate feedback; the
// authoritative hazard analysis comes from Claude vision server-side. Reuses
// the fire chromatic rule from the fire HeuristicDetector, but clusters the
// tripping pixels into bounding boxes instead of counting them.

export type NormalizedBox = { x: number; y: number; width: number; height: number };

// Downsample size for the pixel scan, and the coarse grid the hot pixels are
// bucketed into before clustering.
const SAMPLE_WIDTH = 160;
const SAMPLE_HEIGHT = 120;
const GRID_COLUMNS = 16;
const GRID_ROWS = 12;
// A grid cell is "hot" once this fraction of its pixels are fire-coloured.
const CELL_HOT_FRACTION = 0.15;

export class HotRegionFinder {
  private canvas = document.createElement("canvas");
  private context = this.canvas.getContext("2d", { willReadFrequently: true });

  // Returns normalised bounding boxes (0..1) around clusters of fire-coloured
  // pixels in the current video frame.
  find(video: HTMLVideoElement): NormalizedBox[] {
    const context = this.context;
    if (!context || !video.videoWidth)
      return [];

    this.canvas.width = SAMPLE_WIDTH;
    this.canvas.height = SAMPLE_HEIGHT;
    context.drawImage(video, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
    const { data } = context.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);

    const cellWidth = SAMPLE_WIDTH / GRID_COLUMNS;
    const cellHeight = SAMPLE_HEIGHT / GRID_ROWS;
    const hotCounts = new Array<number>(GRID_COLUMNS * GRID_ROWS).fill(0);

    for (let pixelIndex = 0; pixelIndex < data.length; pixelIndex += 4) {
      const red = data[pixelIndex];
      const green = data[pixelIndex + 1];
      const blue = data[pixelIndex + 2];
      if (red > 190 && red > green && green > blue && red - blue > 60) {
        const pixel = pixelIndex / 4;
        const column = Math.floor((pixel % SAMPLE_WIDTH) / cellWidth);
        const row = Math.floor(Math.floor(pixel / SAMPLE_WIDTH) / cellHeight);
        hotCounts[row * GRID_COLUMNS + column]++;
      }
    }

    const threshold = cellWidth * cellHeight * CELL_HOT_FRACTION;
    const hot = hotCounts.map((count) => count >= threshold);
    return this.clusterBoxes(hot);
  }

  // Flood-fills adjacent hot cells into connected groups and returns one
  // normalised bounding box per group.
  private clusterBoxes(hot: boolean[]): NormalizedBox[] {
    const visited = new Array<boolean>(hot.length).fill(false);
    const boxes: NormalizedBox[] = [];

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let column = 0; column < GRID_COLUMNS; column++) {
        const start = row * GRID_COLUMNS + column;
        if (!hot[start] || visited[start])
          continue;

        let minColumn = column;
        let maxColumn = column;
        let minRow = row;
        let maxRow = row;
        const stack = [start];
        visited[start] = true;

        while (stack.length) {
          const current = stack.pop() as number;
          const currentColumn = current % GRID_COLUMNS;
          const currentRow = Math.floor(current / GRID_COLUMNS);
          minColumn = Math.min(minColumn, currentColumn);
          maxColumn = Math.max(maxColumn, currentColumn);
          minRow = Math.min(minRow, currentRow);
          maxRow = Math.max(maxRow, currentRow);

          const neighbours = [
            current - 1,
            current + 1,
            current - GRID_COLUMNS,
            current + GRID_COLUMNS,
          ];
          for (const neighbour of neighbours) {
            if (neighbour < 0 || neighbour >= hot.length || visited[neighbour] || !hot[neighbour])
              continue;
            // Skip horizontal wrap-around between rows.
            if (Math.abs((neighbour % GRID_COLUMNS) - (current % GRID_COLUMNS)) > 1)
              continue;
            visited[neighbour] = true;
            stack.push(neighbour);
          }
        }

        boxes.push({
          x: minColumn / GRID_COLUMNS,
          y: minRow / GRID_ROWS,
          width: (maxColumn - minColumn + 1) / GRID_COLUMNS,
          height: (maxRow - minRow + 1) / GRID_ROWS,
        });
      }
    }

    return boxes;
  }
}
