// Pure oscillation helpers for the iso scene's ambient motion. Kept free of PIXI
// so the easing math is unit-tested independently of the renderer; the thin
// <Bob>/<Pulse> wrappers feed an accumulated ticker clock (ms) into these.

// 0..1 sine. At t=0 it sits at the midpoint (0.5) and rises, so animations that
// fade in/out never start at a hard edge.
export function oscillate01(timeMs: number, periodMs: number, phase = 0): number {
  const t = (timeMs / periodMs + phase) * Math.PI * 2;
  return (Math.sin(t) + 1) / 2;
}

// Symmetric vertical bob in pixels: swings within ±amplitudePx, zero at t=0.
export function bobOffset(timeMs: number, periodMs: number, amplitudePx: number, phase = 0): number {
  const t = (timeMs / periodMs + phase) * Math.PI * 2;
  return Math.sin(t) * amplitudePx;
}

// Breathing value mapped into [min, max] (e.g. an alpha that pulses).
export function pulseValue(
  timeMs: number,
  periodMs: number,
  min: number,
  max: number,
  phase = 0,
): number {
  return min + (max - min) * oscillate01(timeMs, periodMs, phase);
}

// `count` evenly spaced markers drifting along a 0..1 track, wrapping at the
// ends — for energy flowing along a bridge or particles rising up a beam.
// Caller lerps each fraction onto the actual line.
export function flowFractions(timeMs: number, periodMs: number, count: number): number[] {
  const base = (((timeMs / periodMs) % 1) + 1) % 1;
  const out: number[] = [];
  for (let i = 0; i < count; i++) out.push((i / count + base) % 1);
  return out;
}

// Index that advances once per interval and wraps — drives cycling status text.
export function cycleIndex(timeMs: number, intervalMs: number, length: number): number {
  return Math.floor(timeMs / intervalMs) % length;
}
