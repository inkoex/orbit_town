import type { WorldMap } from '../../convex/aiTown/worldMap';
import type { Point } from './projection/Projection';

// A tile is walkable when it's inside the map and no object layer blocks it.
// objectTiles are indexed [x][y] (matching movement.ts `blocked`), where -1
// means empty and any other value is a collision.
export function isWalkableTile(map: WorldMap, point: Point): boolean {
  const x = Math.floor(point.x);
  const y = Math.floor(point.y);
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) {
    return false;
  }
  return map.objectTiles.every((layer) => layer[x][y] === -1);
}
