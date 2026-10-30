import { describe, expect, it } from "vitest";
import {
  ACT_COUNT,
  actFade,
  clamp01,
  damp,
  progressOf,
  sampleCam,
  smoothstep,
} from "@/game/scroll";

describe("clamp01 / smoothstep", () => {
  it("clamps to [0, 1]", () => {
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(1.5)).toBe(1);
  });

  it("smoothstep hits 0, 0.5 and 1", () => {
    expect(smoothstep(0)).toBe(0);
    expect(smoothstep(0.5)).toBe(0.5);
    expect(smoothstep(1)).toBe(1);
  });
});

describe("damp", () => {
  it("moves toward the target and never past it", () => {
    const a = damp(0, 1, 5, 0.5);
    expect(a).toBeGreaterThan(0.9);
    expect(a).toBeLessThanOrEqual(1);
    expect(damp(2, 1, 5, 0.5)).toBeLessThan(1.1);
  });
});

describe("progressOf", () => {
  it("maps scroll into [0,1] and guards zero scrollable height", () => {
    expect(progressOf(0, 6000, 1000)).toBe(0);
    expect(progressOf(2500, 6000, 1000)).toBe(0.5);
    expect(progressOf(5000, 6000, 1000)).toBe(1);
    expect(progressOf(100, 1000, 1000)).toBe(0);
  });
});

describe("actFade", () => {
  it("is 1 at an act's center and 0 between acts", () => {
    for (let act = 0; act < ACT_COUNT; act++) {
      const center = act / (ACT_COUNT - 1);
      expect(actFade(center, act)).toBe(1);
      expect(actFade(center + 0.1, act)).toBe(0);
      expect(actFade(center - 0.1, act)).toBe(0);
    }
  });

  it("fades monotonically from the center outward", () => {
    let prev = 1;
    for (let d = 0; d <= 0.11; d += 0.01) {
      const v = actFade(0.4 + d, 2);
      expect(v).toBeLessThanOrEqual(prev);
      prev = v;
    }
  });
});

describe("sampleCam", () => {
  const keys = [
    { at: 0, pos: [0, 0, 10] as [number, number, number], look: [0, 0, 0] as [number, number, number] },
    { at: 1, pos: [0, -10, 8] as [number, number, number], look: [0, -10, 0] as [number, number, number] },
  ];

  it("returns the first key before the range and the last key after it", () => {
    const pos: number[] = [];
    const look: number[] = [];
    sampleCam(keys, -1, pos, look);
    expect(pos).toEqual([0, 0, 10]);
    sampleCam(keys, 2, pos, look);
    expect(pos).toEqual([0, -10, 8]);
  });

  it("interpolates smoothly at the midpoint", () => {
    const pos: number[] = [];
    const look: number[] = [];
    sampleCam(keys, 0.5, pos, look);
    expect(pos[1]).toBeCloseTo(-5, 5);
    expect(look[1]).toBeCloseTo(-5, 5);
  });
});
