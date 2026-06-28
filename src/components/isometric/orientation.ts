export type IsoDirection = 'se' | 'sw' | 'nw' | 'ne';
export type WalkFrame = 'idle' | 'walk-0' | 'walk-1' | 'walk-2' | 'walk-3';

// World facing → iso facing. The four world axes map to the four diagonal
// screen directions: +x→se, +y→sw, -x→nw, -y→ne. On a diagonal the dominant
// axis wins (x ties to se). A zero vector keeps the previous direction, or se.
export function facingToIsoDirection(
  facing: { dx: number; dy: number },
  prev?: IsoDirection,
): IsoDirection {
  const { dx, dy } = facing;
  if (dx === 0 && dy === 0) return prev ?? 'se';
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  // Hysteresis: near a diagonal, keep the previous axis unless the other axis
  // is clearly dominant (margin). Without this a jittering facing vector flips
  // the sprite every frame at the se/sw/nw/ne boundaries.
  if (prev) {
    const margin = 1.3;
    const prevIsX = prev === 'se' || prev === 'nw';
    if (prevIsX && ay <= ax * margin) return dx >= 0 ? 'se' : 'nw';
    if (!prevIsX && ax <= ay * margin) return dy >= 0 ? 'sw' : 'ne';
  }
  if (ax >= ay) return dx >= 0 ? 'se' : 'nw';
  return dy >= 0 ? 'sw' : 'ne';
}

// 10fps walk cycle while moving; idle frame when stopped.
export function walkFrameAt(simulationTime: number, speed: number): WalkFrame {
  if (speed <= 0) return 'idle';
  const i = Math.floor(simulationTime / 100) % 4;
  return `walk-${i}` as WalkFrame;
}
