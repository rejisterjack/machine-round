import { SCREEN_FRAME_CHANGE_THRESHOLD } from "@/lib/session/session-limits";

export const CHANGE_GRID_SIZE = 32;

export function luminanceFromRgb(r: number, g: number, b: number): number {
  return Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
}

export function sampleLuminanceGrid(
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
  gridSize = CHANGE_GRID_SIZE,
): Uint8Array {
  const grid = new Uint8Array(gridSize * gridSize);
  if (!width || !height || imageData.length === 0) {
    return grid;
  }

  for (let row = 0; row < gridSize; row += 1) {
    for (let col = 0; col < gridSize; col += 1) {
      const sourceX = Math.min(
        width - 1,
        Math.floor((col / gridSize) * width),
      );
      const sourceY = Math.min(
        height - 1,
        Math.floor((row / gridSize) * height),
      );
      const index = (sourceY * width + sourceX) * 4;
      grid[row * gridSize + col] = luminanceFromRgb(
        imageData[index],
        imageData[index + 1],
        imageData[index + 2],
      );
    }
  }

  return grid;
}

export function sampleLuminanceGridFromCanvas(
  canvas: HTMLCanvasElement,
  gridSize = CHANGE_GRID_SIZE,
): Uint8Array | null {
  const ctx = canvas.getContext("2d");
  if (!ctx || !canvas.width || !canvas.height) return null;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  return sampleLuminanceGrid(
    imageData,
    canvas.width,
    canvas.height,
    gridSize,
  );
}

export function detectFrameChange(
  previous: Uint8Array | null | undefined,
  next: Uint8Array | null | undefined,
  threshold = SCREEN_FRAME_CHANGE_THRESHOLD,
): boolean {
  if (!previous || !next || previous.length !== next.length) {
    return true;
  }

  let diffSum = 0;
  for (let index = 0; index < next.length; index += 1) {
    diffSum += Math.abs(next[index] - previous[index]);
  }

  return diffSum / (next.length * 255) >= threshold;
}

export function detectCenterWeightedChange(
  previous: Uint8Array | null | undefined,
  next: Uint8Array | null | undefined,
  threshold = SCREEN_FRAME_CHANGE_THRESHOLD * 0.5,
): boolean {
  if (!previous || !next || previous.length !== next.length) {
    return true;
  }

  const gridSize = Math.round(Math.sqrt(next.length));
  const centerStart = Math.floor(gridSize / 4);
  const centerEnd = Math.ceil((gridSize * 3) / 4);
  let diffSum = 0;
  let count = 0;

  for (let row = centerStart; row < centerEnd; row += 1) {
    for (let col = centerStart; col < centerEnd; col += 1) {
      const index = row * gridSize + col;
      diffSum += Math.abs(next[index] - previous[index]);
      count += 1;
    }
  }

  if (count === 0) return false;
  return diffSum / (count * 255) >= threshold;
}

export function shouldRepushStaleFrame(
  lastPushedAt: number,
  now: number,
  staleAfterMs: number,
): boolean {
  return now - lastPushedAt >= staleAfterMs;
}
