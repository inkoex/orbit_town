// Isometric "archipelago": three floating platforms (CAFE / LIBRARY / EVENT)
// in space, connected by thin bridges. Same export shape as data/gentle.js so
// convex/init.ts can consume it interchangeably. Collision/object map is indexed
// [x][y] to match movement.ts blocked() (layer[x][y]): -1 = walkable, else blocked.

type Point = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };
export type Platform = { name: string; rect: Rect };

// Bounding grid. Sized so walkable tiles stay ~50% of the grid: agent spawn
// falls back to random-tile search (10 tries) and would crash the seed if the
// walkable area were a tiny island in a huge void. See isoVerticalSlice.test.ts.
const W = 20;
const H = 16;

const layer = (fill: number): number[][] =>
  Array.from({ length: W }, () => Array<number>(H).fill(fill));

// Three platforms. Each rect drives BOTH the collision mask (here) and the
// per-island render + label on the frontend (imported from this module).
export const PLATFORMS: Platform[] = [
  { name: 'CAFE', rect: { x: 1, y: 1, w: 7, h: 7 } },
  { name: 'LIBRARY', rect: { x: 12, y: 1, w: 7, h: 7 } },
  { name: 'EVENT', rect: { x: 6, y: 10, w: 8, h: 6 } },
];

// Bridges weld the islands into ONE connected walkable graph. The engine does
// not verify island connectivity, so without these agents could not cross.
export const BRIDGES: Rect[] = [
  { x: 8, y: 3, w: 4, h: 2 }, // CAFE <-> LIBRARY (horizontal span across the gap)
  { x: 8, y: 5, w: 2, h: 5 }, // that bridge <-> EVENT (vertical drop)
];

// Collision: start everything blocked (void/space), then carve platforms and
// bridges as walkable (-1).
const collision = layer(0);
const carve = (r: Rect) => {
  for (let x = r.x; x < r.x + r.w; x++)
    for (let y = r.y; y < r.y + r.h; y++) collision[x][y] = -1;
};
for (const p of PLATFORMS) carve(p.rect);
for (const b of BRIDGES) carve(b);

export const tilesetpath = '/ai-town/assets/iso-slice/floor-metal.png';
export const tiledim = 32;
export const tilesetpxw = 64;
export const tilesetpxh = 32;
export const screenxtiles = W;
export const screenytiles = H;
export const bgtiles: number[][][] = [layer(0)];
export const objmap: number[][][] = [collision];
export const animatedsprites: never[] = [];
export const mapwidth = bgtiles[0].length; // = W (outer index is x)
export const mapheight = bgtiles[0][0].length; // = H (inner index is y)

export const spawnPoints: { human: Point; agents: Point[] } = {
  human: { x: 4, y: 4 }, // CAFE center
  agents: [{ x: 15, y: 4 }], // LIBRARY center (first agent; rest spawn random-walkable)
};

// No textured objects. The Kenney prototype crates/walls were "1 METER" blockout
// cubes that can't read as iso furniture; iso-native props (glowing pedestals)
// come later, drawn procedurally like the floor.
export type IsoObjectSpec = {
  tile: { x: number; y: number };
  asset: 'wallBackLeft' | 'wallBackRight' | 'door' | 'crate';
  layer: 'wall' | 'object';
};
export const isoObjects: IsoObjectSpec[] = [];
