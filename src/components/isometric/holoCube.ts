// Pure, Vite-free (Jest-safe) wireframe-cube math for the holographic prop:
// a unit cube spinning around Y with a fixed camera tilt, orthographically
// projected to 2D. Rendering (TickGraphics) lives in IsoProps.tsx.

// 8 corners of the unit cube (±1).
export const CUBE_VERTS: readonly [number, number, number][] = [
  [-1, -1, -1],
  [1, -1, -1],
  [1, 1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
  [1, -1, 1],
  [1, 1, 1],
  [-1, 1, 1],
];

// 12 edges as index pairs into CUBE_VERTS.
export const CUBE_EDGES: readonly [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 4],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
];

const SPIN_PERIOD_MS = 6400;
const TILT_RAD = 0.45;

// Screen-space vertices at time t: yaw spin around Y, fixed X tilt, ortho
// projection scaled by `size` (half-extent in px). All coords bounded by
// size * sqrt(3).
export function projectedCubeVertices(tMs: number, size: number): { x: number; y: number }[] {
  const yaw = (tMs / SPIN_PERIOD_MS) * Math.PI * 2;
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const ct = Math.cos(TILT_RAD);
  const st = Math.sin(TILT_RAD);
  return CUBE_VERTS.map(([x, y, z]) => {
    const rx = x * cy - z * sy;
    const rz = x * sy + z * cy;
    return { x: rx * size, y: (y * ct - rz * st) * size };
  });
}
