import type { Point } from '../../rendering/projection/Projection';

// Layer bands keep floor below walls below objects below foreground. The band
// (×1..300) sits above the per-tile y tie-breaker (×10) so a wall on the same
// tile always sorts under an object on that tile. The dominant term is the
// isometric depth (x+y)×1000: tiles closer to the camera (larger x+y) draw on
// top. Within one diagonal (equal x+y) the larger y wins.
const LAYER_ORDER = { floor: 0, wall: 100, object: 200, foreground: 300 } as const;

export type IsoLayer = keyof typeof LAYER_ORDER;

export function isoDepthKey(tile: Point, layer: IsoLayer, depthOffset: number): number {
  return (
    Math.floor((tile.x + tile.y) * 1000) +
    Math.floor(tile.y * 10) +
    LAYER_ORDER[layer] +
    depthOffset
  );
}
