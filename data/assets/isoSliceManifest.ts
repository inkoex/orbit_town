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
// Base contact = bottom diamond center of the crate cube (near sprite bottom).
const BASE_ANCHOR = { x: 0.5, y: 0.92 };

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

// Foot contact for characters. The figure occupies rows ~0.63–0.89 of the 512px
// frame; the bottom-most foot pixel is ~0.89. We sit the anchor a hair above
// that (0.88) so the ground point reads as the stance center (the feet are
// splayed front/back) rather than the single lowest toe. (The old 0.82 left the
// feet hanging ~36px below the tile center.)
export const CHARACTER_FOOT_ANCHOR = { x: 0.5, y: 0.88 };

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

// Per-avatar frame sets: same filename rule, scoped to an avatarId subfolder.
// Rendered by tools/avatar-render/ from a Kenney glb.
const framesIn = (avatarId: string): Record<IsoDirection, { idle: string; walk: string[] }> => {
  const dir = (d: IsoDirection) => ({
    idle: `/ai-town/assets/iso-slice/${avatarId}/character-${d}-idle.png`,
    walk: [0, 1, 2, 3].map(
      (i) => `/ai-town/assets/iso-slice/${avatarId}/character-${d}-walk-${i}.png`,
    ),
  });
  return { se: dir('se'), sw: dir('sw'), nw: dir('nw'), ne: dir('ne') };
};

// Asset Contract: runtime references avatarId only. All 12 Kenney Mini
// characters are rendered (tools/avatar-render/) and registered as
// 'iso-agent-1'..'iso-agent-12' (the numbering in avatar-choices.png:
// 1-6 = female-a..f, 7-12 = male-a..f). Casting is just picking an id per
// agent in the seed — no re-render needed. 'iso-agent' is the original shared
// model, kept as the fallback. (Theme dimension still pinned to 'iso-slice'.)
export const AVATAR_REGISTRY: Record<
  string,
  Record<IsoDirection, { idle: string; walk: string[] }>
> = {
  'iso-agent': framesIn('iso-agent'),
  ...Object.fromEntries(
    Array.from({ length: 12 }, (_, i) => {
      const id = `iso-agent-${i + 1}`;
      return [id, framesIn(id)];
    }),
  ),
};

// Unregistered avatarId falls back to the original single model (top-level paths).
export function resolveAvatarFrames(
  avatarId?: string,
): Record<IsoDirection, { idle: string; walk: string[] }> {
  return (avatarId && AVATAR_REGISTRY[avatarId]) || ISO_CHARACTER_FRAMES;
}
