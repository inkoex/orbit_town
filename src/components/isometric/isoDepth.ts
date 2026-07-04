import type { Point } from '../../rendering/projection/Projection';

// Strictly ranked tiers, each scaled to outrank the SUM of every lower tier
// across the map's coordinate range (tiles up to ~x,y=16; depthOffset ≤ ~100):
//   1. isometric depth (x+y): tiles closer to the camera (larger x+y) draw on top.
//   2. layer band: floor < wall < object < foreground.
//   3. y tie-breaker: within one diagonal (equal x+y, equal layer) larger y is in front.
//   4. depthOffset: a within-layer nudge (e.g. a character over same-tile furniture).
// The layer band (×1000) sits ABOVE the y tie-breaker so a wall never sorts over
// an object even on a high-y tile — the earlier ×10 y term could reach 150 at
// y=15 and cross the old 100-wide band, inverting occlusion near the EVENT platform.
const LAYER_ORDER = { floor: 0, wall: 1, object: 2, foreground: 3 } as const;
const DEPTH_STEP = 100000;
const LAYER_STEP = 1000; // > max(y×10) + max depthOffset (≈160 + 100)

export type IsoLayer = keyof typeof LAYER_ORDER;

export function isoDepthKey(tile: Point, layer: IsoLayer, depthOffset: number): number {
  return (
    (tile.x + tile.y) * DEPTH_STEP +
    LAYER_ORDER[layer] * LAYER_STEP +
    Math.floor(tile.y * 10) +
    depthOffset
  );
}
