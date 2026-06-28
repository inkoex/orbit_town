import { isWalkableTile } from './isWalkableTile';
import { objmap, mapwidth, mapheight } from '../../data/isoVerticalSlice';
import type { WorldMap } from '../../convex/aiTown/worldMap';

const map = {
  width: mapwidth,
  height: mapheight,
  objectTiles: objmap,
} as unknown as WorldMap;

describe('isWalkableTile (archipelago)', () => {
  test('platform tiles are walkable', () => {
    expect(isWalkableTile(map, { x: 4, y: 4 })).toBe(true); // CAFE
    expect(isWalkableTile(map, { x: 15, y: 4 })).toBe(true); // LIBRARY
    expect(isWalkableTile(map, { x: 9, y: 12 })).toBe(true); // EVENT
    // fractional point inside a walkable tile
    expect(isWalkableTile(map, { x: 4.3, y: 4.6 })).toBe(true);
  });

  test('bridge tiles are walkable', () => {
    expect(isWalkableTile(map, { x: 9, y: 3 })).toBe(true); // CAFE<->LIBRARY bridge
    expect(isWalkableTile(map, { x: 8, y: 7 })).toBe(true); // bridge<->EVENT
  });

  test('the void between islands is not walkable', () => {
    expect(isWalkableTile(map, { x: 0, y: 0 })).toBe(false);
    expect(isWalkableTile(map, { x: 10, y: 8 })).toBe(false); // gap tile
    expect(isWalkableTile(map, { x: mapwidth - 1, y: mapheight - 1 })).toBe(false);
  });

  test('points outside the map are not walkable', () => {
    expect(isWalkableTile(map, { x: -1, y: 5 })).toBe(false);
    expect(isWalkableTile(map, { x: mapwidth, y: 5 })).toBe(false);
    expect(isWalkableTile(map, { x: 5, y: mapheight })).toBe(false);
  });
});
