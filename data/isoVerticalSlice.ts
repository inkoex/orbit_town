// 10x10 isometric vertical-slice room. Same export shape as data/gentle.js so
// init.ts can consume it interchangeably. Collision/object map is indexed
// [x][y] to match movement.ts `blocked()` (layer[x][y]).

type Point = { x: number; y: number };

const layer = (fill: number): number[][] =>
  Array.from({ length: 10 }, () => Array<number>(10).fill(fill));

// -1 = walkable, 0 = blocked. Outer border (36 tiles) + furniture footprints.
const collision = layer(-1);
for (let x = 0; x < 10; x++) {
  collision[x][0] = 0;
  collision[x][9] = 0;
}
for (let y = 0; y < 10; y++) {
  collision[0][y] = 0;
  collision[9][y] = 0;
}
const FURNITURE: Array<[number, number]> = [
  [4, 4],
  [4, 5],
  [5, 4],
  [5, 5],
  [7, 6],
];
for (const [x, y] of FURNITURE) {
  collision[x][y] = 0;
}

export const tilesetpath = '/ai-town/assets/iso-slice/floor-metal.png';
export const tiledim = 32;
export const tilesetpxw = 64;
export const tilesetpxh = 32;
export const screenxtiles = 10;
export const screenytiles = 10;
export const bgtiles: number[][][] = [layer(0)];
export const objmap: number[][][] = [collision];
export const animatedsprites: never[] = [];
export const mapwidth = bgtiles[0].length;
export const mapheight = bgtiles[0][0].length;

export const spawnPoints: { human: Point; agents: Point[] } = {
  human: { x: 2, y: 7 },
  agents: [{ x: 7, y: 2 }],
};

// Render manifest for the iso scene (frontend only; asset is a manifest key so
// convex never imports the texture manifest). Back walls cover the two rear
// edges (x=0 and y=0); furniture footprints match the Task 2 collision map.
// Placement is provisional and tuned visually in Task 8.
export type IsoObjectSpec = {
  tile: { x: number; y: number };
  asset: 'wallBackLeft' | 'wallBackRight' | 'door' | 'crate';
  layer: 'wall' | 'object';
};

const buildIsoObjects = (): IsoObjectSpec[] => {
  const out: IsoObjectSpec[] = [];
  // Rear-left wall (x = 0 edge), with a doorway opening.
  for (let y = 0; y < 10; y++) {
    out.push({ tile: { x: 0, y }, asset: y === 4 ? 'door' : 'wallBackLeft', layer: 'wall' });
  }
  // Rear-right wall (y = 0 edge), skipping the shared corner at (0,0).
  for (let x = 1; x < 10; x++) {
    out.push({ tile: { x, y: 0 }, asset: 'wallBackRight', layer: 'wall' });
  }
  // Furniture (desk 2x2 + console), matching collision footprints.
  for (const [x, y] of [
    [4, 4],
    [4, 5],
    [5, 4],
    [5, 5],
    [7, 6],
  ] as Array<[number, number]>) {
    out.push({ tile: { x, y }, asset: 'crate', layer: 'object' });
  }
  return out;
};

export const isoObjects: IsoObjectSpec[] = buildIsoObjects();
