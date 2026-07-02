# Avatar bake — Runbook (GLB → 4-direction PNG → game)

The **back half** of the avatar pipeline (see `docs/design/2026-07-02-avatar-system-plan.md`).
Given ANY rigged GLB with a walk/run animation, produce the frame set the game loads.

## One-time setup
1. Put the pack GLBs (or a new model) somewhere under `_src/` (gitignored).
2. Serve this dir on :8765 (any static server), e.g. the scratch helper:
   `node /tmp/serve8765.mjs "$(pwd)" &` — or `python3 -m http.server 8765`.
3. `browse --headed` must have WebGL (real GPU). Headless fails on this machine.

## Model requirements (what a good source GLB looks like)
- **Rigged** (has `skins`) with an animation whose name matches `/walk|run/i`.
  Check: `node` parse of the GLB `animations[]`, or load and read `window.__animCount`.
- **Scale is now handled automatically.** render.html normalizes every model to
  `TARGET_HEIGHT = 0.671` (Kenney male-a's visible-mesh height) using **visible-mesh
  bounds, not the skeleton bbox** — so a Tripo/Mixamo export (meters), Kenney (~0.67u),
  or an oddball like RobotExpressive (100× armature, 149u skeleton bbox) all frame
  identically with the default `FRUSTUM/LOOKY`. No per-model zoom tuning needed.
  Read `window.__dbg` (`{rawH, scaledH}`) to sanity-check the measured height.

## Bake a model
```bash
# from tools/avatar-render/, server running on :8765
WALK_LEN=<clip duration s> ./extract.sh "<path under _src>" <avatarId>
# e.g. WALK_LEN=0.667 ./extract.sh "pack/Models/GLB format/character-female-a.glb" iso-agent-1
```
Writes 20 frames (4 dirs × [idle + 4 walk]) to `public/assets/iso-slice/<avatarId>/`.

### Per-model tuning knobs (env vars, only if needed)
- `YAW_OFFSET` (default **-45**): which physical yaw faces the sw/se/ne/nw labels.
  **This is the one thing that varies per source** — a model whose rest pose faces a
  different axis will look like it walks sideways/backward. Render one frame, eyeball,
  adjust in ±90/±45 steps until "sw" faces screen-lower-left (matches the original
  `iso-agent`). (Kenney needed -45.)
- `FRUSTUM` (0.80) / `LOOKY` (0.72): zoom / vertical framing. Rarely needed now that
  height is normalized; nudge only for unusually wide/tall silhouettes.
- `WALK_LEN`: **one gait cycle in seconds — NOT the full clip length.** Tripo/Mixamo
  walk clips often contain several steps (e.g. the analyst robot's clip is 2.375s
  ≈ 4 steps); sampling the whole clip into 4 frames aliases the stride and plays
  back as pogo-hopping in-game. Use clip duration ÷ number of step-pairs (analyst
  robot: 2.375/2 = 1.1875). Eyeball the 4 walk frames: legs must alternate.

## Register in the game
1. `data/assets/isoSliceManifest.ts` → add the id to `AVATAR_REGISTRY` (the 1..12
   loop already covers `iso-agent-N`; a new naming scheme needs a new entry).
2. `data/characters.ts` → add to `isoCharacters` (validation) + assign via an agent's
   `character` field, OR recast live with `convex/recastAvatars.ts`.
3. Verify in-app with Playwright MCP (gstack browse crashes this app's PIXI Stage;
   Playwright renders it). Screenshot `localhost:5173/ai-town`.

## Validation status (2026-07-02 spike)
Pipeline proven model-agnostic against a non-Kenney rigged robot (three.js
`RobotExpressive`, CC0): fetched autonomously, normalized, framed identically to
Kenney at the default settings, joints clean. The Phase 0b gate ("does an
auto-rigged mesh bake cleanly?") is satisfied for a well-formed rig. Remaining
unknown = AI-generated mesh *topology* quality (Tripo output) — validate that with
a real Tripo→AccuRIG→Mixamo GLB through this same runbook.
