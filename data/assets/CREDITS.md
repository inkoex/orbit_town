# Asset Credits

## Character sprites (`public/assets/space-folk.png`)

- Source: AI Town `public/assets/32x32folk.png` ([repository](https://github.com/a16z-infra/ai-town))
- Base license: MIT
- Author: AI Town contributors
- Modifications: Space-uniform variants created for this project with OpenAI image generation,
  then cropped to the original 32x32 frame grid. Project modifications are distributed under this
  repository's MIT license.

## Tileset (`public/assets/space-tiles.png`)

- Source: [Tiny RPG - Forest](https://opengameart.org/content/tiny-rpg-forest), via AI Town's
  `public/assets/gentle-obj.png`
- License: CC0 (public domain; commercial use and modification permitted)
- Author: Luis Zuno (`ansimuz`)
- Modifications: Deterministic cool-tone palette conversion only. The original 1440x1024 atlas and
  32x32 tile positions are unchanged.

## Isometric vertical slice (`public/assets/iso-slice/`)

- Source: Kenney "Isometric Prototype" pack ([kenney.nl](https://kenney.nl/assets/tag:isometric))
- License: **CC0 1.0 Universal** (public domain; no attribution required, credited voluntarily)
- Date added: 2026-06-23
- Derived files: `wall-back-left/right.png`, `door.png`, `crate.png` (from `Angle/`),
  `character-{se,sw,nw,ne}-{idle,walk-0..3}.png` (from `Characters/Human/`, 8 directions
  sampled to 4 isometric directions; walk frames sampled from the 10-frame Run cycle).
- The floor is rendered in code (PIXI diamond), not a texture.
- **Temporary prototype assets — replace before commercial release.**
