import { worldToScreen, worldToScreenCenter, screenToWorld, tilesToPx } from './coords';

describe('coords (top-down projection)', () => {
  const tileDim = 32;

  test('worldToScreen maps tile origin to pixel', () => {
    expect(worldToScreen({ x: 3, y: 5 }, tileDim)).toEqual({ x: 96, y: 160 });
    expect(worldToScreen({ x: 0, y: 0 }, tileDim)).toEqual({ x: 0, y: 0 });
  });

  test('worldToScreenCenter maps tile center to pixel', () => {
    expect(worldToScreenCenter({ x: 0, y: 0 }, tileDim)).toEqual({ x: 16, y: 16 });
    expect(worldToScreenCenter({ x: 3, y: 5 }, tileDim)).toEqual({ x: 112, y: 176 });
  });

  test('screenToWorld converts pixel back to tile', () => {
    expect(screenToWorld({ x: 96, y: 160 }, tileDim)).toEqual({ x: 3, y: 5 });
    expect(screenToWorld({ x: 0, y: 0 }, tileDim)).toEqual({ x: 0, y: 0 });
  });

  test('tilesToPx scales tile count to pixels', () => {
    expect(tilesToPx(5, tileDim)).toBe(160);
    expect(tilesToPx(0, tileDim)).toBe(0);
  });

  test('worldToScreen and screenToWorld are inverse', () => {
    const pos = { x: 7, y: 12 };
    const screen = worldToScreen(pos, tileDim);
    expect(screenToWorld(screen, tileDim)).toEqual(pos);
  });
});
