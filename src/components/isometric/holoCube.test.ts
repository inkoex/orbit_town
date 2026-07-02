import { CUBE_EDGES, CUBE_VERTS, projectedCubeVertices } from './holoCube';

describe('holoCube', () => {
  it('has 8 vertices and 12 edges with valid indices', () => {
    expect(CUBE_VERTS).toHaveLength(8);
    expect(CUBE_EDGES).toHaveLength(12);
    for (const [a, b] of CUBE_EDGES) {
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(8);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(8);
      expect(a).not.toBe(b);
    }
  });

  it('every vertex belongs to exactly 3 edges', () => {
    const counts = new Array(8).fill(0);
    for (const [a, b] of CUBE_EDGES) {
      counts[a]++;
      counts[b]++;
    }
    expect(counts).toEqual(new Array(8).fill(3));
  });

  it('is deterministic for the same time', () => {
    expect(projectedCubeVertices(1234, 46)).toEqual(projectedCubeVertices(1234, 46));
  });

  it('stays within the size * sqrt(3) bound', () => {
    const bound = 46 * Math.sqrt(3);
    for (const t of [0, 800, 1600, 3200, 6400, 9999]) {
      for (const { x, y } of projectedCubeVertices(t, 46)) {
        expect(Math.abs(x)).toBeLessThanOrEqual(bound);
        expect(Math.abs(y)).toBeLessThanOrEqual(bound);
      }
    }
  });
});
