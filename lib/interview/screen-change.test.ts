import { describe, expect, test } from "bun:test";
import {
  detectFrameChange,
  luminanceFromRgb,
  sampleLuminanceGrid,
  shouldRepushStaleFrame,
} from "@/lib/interview/screen-change";

describe("sampleLuminanceGrid", () => {
  test("detects modal-sized luminance change on same page", () => {
    const width = 64;
    const height = 64;
    const base = new Uint8ClampedArray(width * height * 4);
    for (let index = 0; index < base.length; index += 4) {
      base[index] = 30;
      base[index + 1] = 30;
      base[index + 2] = 30;
      base[index + 3] = 255;
    }

    const modal = new Uint8ClampedArray(base);
    for (let row = 20; row < 44; row += 1) {
      for (let col = 20; col < 44; col += 1) {
        const index = (row * width + col) * 4;
        modal[index] = 220;
        modal[index + 1] = 220;
        modal[index + 2] = 220;
      }
    }

    const previous = sampleLuminanceGrid(base, width, height);
    const next = sampleLuminanceGrid(modal, width, height);

    expect(detectFrameChange(previous, next)).toBe(true);
  });
});

describe("detectFrameChange", () => {
  test("returns true when previous sample is missing", () => {
    expect(detectFrameChange(null, new Uint8Array([10, 20]))).toBe(true);
  });

  test("returns false for identical grids", () => {
    const grid = new Uint8Array([10, 20, 30]);
    expect(detectFrameChange(grid, new Uint8Array([10, 20, 30]))).toBe(false);
  });
});

describe("luminanceFromRgb", () => {
  test("weights green highest", () => {
    expect(luminanceFromRgb(0, 255, 0)).toBeGreaterThan(
      luminanceFromRgb(255, 0, 0),
    );
  });

  test("maps white to 255 without uint8 wrap", () => {
    expect(luminanceFromRgb(255, 255, 255)).toBe(255);
    expect(luminanceFromRgb(254, 254, 254)).toBe(254);
  });
});

describe("shouldRepushStaleFrame", () => {
  test("marks stale frames for repush", () => {
    expect(shouldRepushStaleFrame(0, 4000, 3000)).toBe(true);
    expect(shouldRepushStaleFrame(0, 1000, 3000)).toBe(false);
  });
});
