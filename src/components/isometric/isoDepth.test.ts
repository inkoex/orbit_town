import { isoDepthKey } from './isoDepth';

describe('isoDepthKey', () => {
  test('layers stack floor < wall < object < foreground at the same tile', () => {
    const t = { x: 3, y: 3 };
    const floor = isoDepthKey(t, 'floor', 0);
    const wall = isoDepthKey(t, 'wall', 0);
    const object = isoDepthKey(t, 'object', 0);
    const fg = isoDepthKey(t, 'foreground', 0);
    expect(floor).toBeLessThan(wall);
    expect(wall).toBeLessThan(object);
    expect(object).toBeLessThan(fg);
  });

  test('larger x+y (closer to camera) gets a greater key', () => {
    expect(isoDepthKey({ x: 5, y: 5 }, 'object', 0)).toBeGreaterThan(
      isoDepthKey({ x: 2, y: 2 }, 'object', 0),
    );
  });

  test('on the same diagonal (equal x+y), larger y is in front', () => {
    expect(isoDepthKey({ x: 2, y: 6 }, 'object', 0)).toBeGreaterThan(
      isoDepthKey({ x: 6, y: 2 }, 'object', 0),
    );
  });

  test('the layer band dominates the y tie-breaker within one tile', () => {
    // A wall on the same tile must still sort below an object, even though the
    // y term is identical.
    expect(isoDepthKey({ x: 4, y: 4 }, 'wall', 0)).toBeLessThan(
      isoDepthKey({ x: 4, y: 4 }, 'object', 0),
    );
  });

  test('layer band dominates the y tie-breaker ACROSS tiles on the same diagonal', () => {
    // Regression: with a ×10 y term, y=15 (=150) crossed the old 100-wide band,
    // so a floor on a high-y tile could outsort a wall on a low-y tile of the
    // same diagonal (wrong occlusion near the EVENT platform, y up to 15).
    expect(isoDepthKey({ x: 5, y: 15 }, 'floor', 0)).toBeLessThan(
      isoDepthKey({ x: 15, y: 5 }, 'wall', 0),
    );
    // …and an object on a low-y tile still outranks a wall on a high-y tile.
    expect(isoDepthKey({ x: 16, y: 4 }, 'object', 0)).toBeGreaterThan(
      isoDepthKey({ x: 5, y: 15 }, 'wall', 0),
    );
  });

  test('same input gives the same key (stable)', () => {
    expect(isoDepthKey({ x: 4, y: 7 }, 'object', 50)).toBe(
      isoDepthKey({ x: 4, y: 7 }, 'object', 50),
    );
  });
});
