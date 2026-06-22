import {
  isoWorldToScreen,
  isoWorldToScreenCenter,
  isoScreenToWorld,
  isoOriginX,
  isoViewportSize,
} from './isoCoords';

describe('isoCoords', () => {
  const tileDim = 32;
  const mapH = 4;
  const originX = isoOriginX(mapH, tileDim); // = 64

  test('isoOriginX = mapHeight * tileDim / 2', () => {
    expect(isoOriginX(4, 32)).toBe(64);
    expect(isoOriginX(0, 32)).toBe(0);
  });

  test('isoWorldToScreen: (0,0) → top of diamond at (originX, 0)', () => {
    expect(isoWorldToScreen({ x: 0, y: 0 }, tileDim, originX)).toEqual({ x: 64, y: 0 });
  });

  test('isoWorldToScreen: (1,0) → one step right-down', () => {
    expect(isoWorldToScreen({ x: 1, y: 0 }, tileDim, originX)).toEqual({ x: 80, y: 8 });
  });

  test('isoWorldToScreen: (0,1) → one step left-down', () => {
    expect(isoWorldToScreen({ x: 0, y: 1 }, tileDim, originX)).toEqual({ x: 48, y: 8 });
  });

  test('isoScreenToWorld is inverse of isoWorldToScreen', () => {
    for (const pos of [{ x: 0, y: 0 }, { x: 3, y: 2 }, { x: 1, y: 4 }, { x: 5, y: 5 }]) {
      const screen = isoWorldToScreen(pos, tileDim, originX);
      const back = isoScreenToWorld(screen, tileDim, originX);
      expect(back.x).toBeCloseTo(pos.x, 5);
      expect(back.y).toBeCloseTo(pos.y, 5);
    }
  });

  test('isoViewportSize covers full diamond map', () => {
    const { width, height } = isoViewportSize(8, 4, 32);
    expect(width).toBe(192);  // (8+4) * 16
    expect(height).toBe(96);  // (8+4) * 8
  });
});
