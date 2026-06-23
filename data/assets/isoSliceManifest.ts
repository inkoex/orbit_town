// Manifest for the iso-slice prototype, built from Kenney CC0 "Isometric
// Prototype" sprites (256x512 each). The floor is drawn in code (PIXI diamond),
// so only objects (walls/door/crate) and the 4-direction character frames are
// textures here. Anchors are normalized base/foot contact and are tuned
// visually in Task 8.

export type IsoAsset = {
  src: string;
  displaySize: { width: number; height: number };
  anchor: { x: number; y: number };
};

const SPRITE = { width: 256, height: 512 };
const BASE_ANCHOR = { x: 0.5, y: 0.85 };

const obj = (file: string): IsoAsset => ({
  src: `/ai-town/assets/iso-slice/${file}`,
  displaySize: SPRITE,
  anchor: BASE_ANCHOR,
});

export const ISO_OBJECTS = {
  wallBackLeft: obj('wall-back-left.png'),
  wallBackRight: obj('wall-back-right.png'),
  door: obj('door.png'),
  crate: obj('crate.png'),
};

export type IsoDirection = 'se' | 'sw' | 'nw' | 'ne';
export const ISO_DIRECTIONS: IsoDirection[] = ['se', 'sw', 'nw', 'ne'];

// Foot contact for characters: bottom-center of the 256x512 sprite.
export const CHARACTER_FOOT_ANCHOR = { x: 0.5, y: 0.82 };

const character = (dir: IsoDirection): { idle: string; walk: string[] } => ({
  idle: `/ai-town/assets/iso-slice/character-${dir}-idle.png`,
  walk: [0, 1, 2, 3].map((i) => `/ai-town/assets/iso-slice/character-${dir}-walk-${i}.png`),
});

export const ISO_CHARACTER_FRAMES: Record<IsoDirection, { idle: string; walk: string[] }> = {
  se: character('se'),
  sw: character('sw'),
  nw: character('nw'),
  ne: character('ne'),
};
