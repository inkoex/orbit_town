// 10x10 isometric vertical-slice room. Same export shape as data/gentle.js so
// init.ts can consume it interchangeably. Collision/object map is indexed
// [x][y] to match movement.ts `blocked()` (layer[x][y]).

type Point = { x: number; y: number };

const layer = (fill: number): number[][] =>
  Array.from({ length: 10 }, () => Array<number>(10).fill(fill));

// -1 = walkable, 0 = blocked. The Kenney prototype furniture (orange "1 METER"
// blockout cubes) was removed for the Antigravity look, so the whole 10x10
// interior is now walkable. Out-of-map clicks are still rejected by
// isWalkableTile (width/height bounds). Iso-native props come later, procedural.
const collision = layer(-1);

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
  // No objects for now. The Kenney prototype crates/walls are orange "1 METER"
  // blockout cubes — they can't read as iso furniture no matter the orientation,
  // so they're removed (same reason the walls were). Iso-native props (glowing
  // cyan pedestals/consoles) come later, drawn procedurally like the floor.
  return [];
};

export const isoObjects: IsoObjectSpec[] = buildIsoObjects();
