/**
 * Pure scroll/narrative math for the Stripe scrollytelling experience.
 * Imports neither React nor three.js so it stays unit-testable.
 */

export const ACT_COUNT = 6;

export const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

export const smoothstep = (t: number): number => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

/** Frame-rate independent exponential damping. */
export const damp = (current: number, target: number, lambda: number, dt: number): number =>
  current + (target - current) * (1 - Math.exp(-lambda * dt));

/** Shared, mutable scroll state written by the capture listener, read in useFrame/rAF. */
export const scrollState = {
  target: 0,
  current: 0,
};

/** Page progress in [0, 1] from raw scroll position. */
export const progressOf = (scrollY: number, docHeight: number, viewportH: number): number => {
  const max = docHeight - viewportH;
  return max > 0 ? clamp01(scrollY / max) : 0;
};

/** Start listening; returns a cleanup function. */
export function initScrollCapture(): () => void {
  const read = () => {
    scrollState.target = progressOf(
      window.scrollY,
      document.documentElement.scrollHeight,
      window.innerHeight,
    );
  };
  read();
  window.addEventListener("scroll", read, { passive: true });
  window.addEventListener("resize", read);
  return () => {
    window.removeEventListener("scroll", read);
    window.removeEventListener("resize", read);
  };
}

/**
 * Text fade for an act. Acts are centered at act / (ACT_COUNT - 1) of page
 * progress; fully visible within `inner`, gone by `outer`.
 */
export function actFade(p: number, act: number, inner = 0.055, outer = 0.105): number {
  const center = act / (ACT_COUNT - 1);
  const d = Math.abs(p - center);
  return 1 - smoothstep((d - inner) / (outer - inner));
}

export interface CamKey {
  at: number;
  pos: [number, number, number];
  look: [number, number, number];
}

/** Piecewise smoothstep interpolation through camera keyframes, written into out arrays. */
export function sampleCam(keys: CamKey[], p: number, outPos: number[], outLook: number[]): void {
  const first = keys[0];
  const last = keys[keys.length - 1];
  if (p <= first.at) {
    outPos.splice(0, 3, ...first.pos);
    outLook.splice(0, 3, ...first.look);
    return;
  }
  if (p >= last.at) {
    outPos.splice(0, 3, ...last.pos);
    outLook.splice(0, 3, ...last.look);
    return;
  }
  let i = 0;
  while (i < keys.length - 2 && p >= keys[i + 1].at) i++;
  const a = keys[i];
  const b = keys[i + 1];
  const t = smoothstep((p - a.at) / (b.at - a.at));
  for (let k = 0; k < 3; k++) {
    outPos[k] = a.pos[k] + (b.pos[k] - a.pos[k]) * t;
    outLook[k] = a.look[k] + (b.look[k] - a.look[k]) * t;
  }
}
