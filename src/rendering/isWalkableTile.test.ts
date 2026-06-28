import { isWalkableTile } from './isWalkableTile';
import { objmap, mapwidth, mapheight } from '../../data/isoVerticalSlice';
import type { WorldMap } from '../../convex/aiTown/worldMap';

const map = {
  width: mapwidth,
  height: mapheight,
  objectTiles: objmap,
} as unknown as WorldMap;

describe('isWalkableTile', () => {
  test('interior empty tiles are walkable', () => {
    expect(isWalkableTile(map, { x: 2, y: 7 })).toBe(true);
    expect(isWalkableTile(map, { x: 7, y: 2 })).toBe(true);
    // fractional point inside a walkable tile
    expect(isWalkableTile(map, { x: 3.6, y: 6.2 })).toBe(true);
  });

  test('edge tiles are walkable now that border collision is gone', () => {
    expect(isWalkableTile(map, { x: 0, y: 0 })).toBe(true);
    expect(isWalkableTile(map, { x: 9, y: 9 })).toBe(true);
  });

  test('former furniture tiles are walkable now that prototype crates are removed', () => {
    expect(isWalkableTile(map, { x: 4, y: 4 })).toBe(true);
    expect(isWalkableTile(map, { x: 7, y: 6 })).toBe(true);
  });

  test('points outside the map are not walkable', () => {
    expect(isWalkableTile(map, { x: -1, y: 5 })).toBe(false);
    expect(isWalkableTile(map, { x: 10, y: 5 })).toBe(false);
    expect(isWalkableTile(map, { x: 5, y: 10 })).toBe(false);
  });
});
