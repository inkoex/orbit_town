---
name: orbit-avatar
description:
  Generate a new on-model Orbit Station robot avatar (new role, color, or gender)
  that stays a consistent family member, using Codex image_gen anchored to the
  locked base. Covers the prompt recipe, gender/color coding, transparent/no-shadow
  output for Tripo, and an empirical verify step. Use when adding or restyling an
  Orbit avatar, or building the 10-role roster.
---

# Orbit Station Avatar — generation & consistency skill

Produce a new robot avatar that reads as the **same family** as the locked base
while varying role / color / gender freely. The hard problem this solves:
text-to-image **drifts** proportions every generation — so we anchor to one base
image and lock proportion + silhouette, varying only surface design.

## When to use

- Adding a new role/personality avatar (analyst, engineer, manager, …).
- Making a color variant (single signature color, or multicolor).
- Making a female-coded / male-coded variant.
- Preparing an avatar image for the Tripo 3D → rig → bake pipeline.

## The canonical base (do not regenerate — anchor to it)

`docs/design/assets/2026-07-04-avatar-space-Bspec-1-transparent.png`
- Chibi space robot: charcoal helmet, cream/ivory hoodie, chunky sneakers,
  thin antenna w/ cyan tip, blank dark visor + single cyan resting glow.
- Measured proportion: **head 43.0% of figure height, width/height 0.58.**
- RGBA, transparent background, no shadow → Tripo-ready.

Every new avatar is generated with THIS image as the reference (img2img anchor),
not from a text description alone.

## Family locks (NEVER change — these make them one crew)

1. **Proportion**: super-deformed; helmet ≈ half the figure height, ≈ torso width.
2. **Compact-chunky silhouette**: short stubby visible legs, cropped/short top,
   oversized chunky footwear. Top-heavy toy read. *(This is critical — a long/lean
   outfit elongates the perceived proportion even when head% is unchanged.)*
3. **Face language**: large blank dark glossy visor + a single symmetric soft
   **cyan** resting glow. No drawn eyes/mouth/lashes (expression is a runtime overlay).
4. **Ivory/cream trim** (cuffs, helmet ring, shoe soles) — the shared accent thread.
5. **Thin antenna** with a small tip. **Matte finish.**
6. Relaxed neutral **A-pose, empty hands**, symmetric, front view, full body in frame.

## Variation axes (what you CAN change per avatar)

- **Outfit** (hoodie / work overalls / cardigan / blazer+tie / dress …).
- **Helmet shape / detail** (headlamp, temple LED, hair silhouette …).
- **Color** — single signature hue OR coordinated multicolor (see Color principle).
- **Gender coding** — via silhouette, not anatomy (see Gender coding).
- **Props / expression** are added LATER (sockets + visor overlay), not baked here.

## Procedure

1. **Write the prompt** from `references/prompt-template.md`: paste the family
   locks verbatim, set the reference image to the canonical base, and describe
   ONLY the variation.
2. **Generate** with the Codex `image_gen` tool (native, no API key):
   call `mcp__codex__codex` with `sandbox: danger-full-access`,
   `approval-policy: never`, cwd = repo root. Tell it to save to
   `docs/design/assets/2026-07-04-sibling-<name>.png` and to output an **RGBA PNG,
   100% transparent background, NO shadow of any kind, no base disc**.
3. **Verify empirically** (do NOT trust the preview backdrop color — a viewer may
   composite transparency onto grey/black/magenta):
   `python3 .claude/skills/orbit-avatar/scripts/verify-avatar.py <file>`
   Expect: transparency PASS, no-shadow PASS, head ~40–48%, w/h ~0.52–0.64.
4. **Eyeball** the render for family fit + the intended role read.
5. If proportion is off-band or the silhouette drifted (usually a too-long outfit),
   re-generate with the compact-chunky lock emphasized.
6. **Tripo prep**: once transparency + no-shadow pass, the image is Tripo-ready.
   Feed to Tripo (image→3D→auto-rig→walk→GLB), then bake with the pipeline in
   `tools/avatar-render/` (see `tools/avatar-render/RUNBOOK.md`).

## Back view (multi-view input for Tripo)

Image→3D hallucinates whatever it can't see, so a **front-only** input gives a
bland/smeared back — and the iso game shows backs constantly (characters walking
NE/NW away from the camera). Tripo accepts **multi-view input**, so generate a
matching **rear view** for any hero/base avatar to get a proper back.

Rules for the back view:
- Same character, seen **squarely from behind**; keep proportion, silhouette,
  colors, materials, pose, and framing **identical** to the front (so the views
  register for reconstruction). Verify head% and w/h match the front.
- Make the back **purposeful, not blank**:
  - Helmet: smooth dome + antenna base + a subtle vertical back seam + the BACKS
    of the headphone cups. **No visor screen on the back** — the dark screen is
    front-only; the back of the head is bare shell.
  - Hair (if gender-coded): the **ponytail / bob back** — the most visible feature
    when walking away.
  - Outfit back: hood lying down the back (hoodie), cardigan/dress back seam,
    tool-belt / backpack straps (engineer), dress bow.
  - Footwear: sneaker **heels** with cream heel tabs.
- Same output rules (RGBA, transparent, no shadow, centered).
- Base back view: `docs/design/assets/2026-07-04-avatar-space-Bspec-1-back.png`
  (validated: head 43.0%, matches the front).

Front-only is acceptable for a quick/minor avatar (accept a plainer back); generate
the back view at least for the base and any prominent role.

## Gender coding (silhouette, color-independent)

There is no face and no body anatomy, so convey gender through **silhouette +
accessories**, strongest first:

1. **Hair silhouette** (the key): sculpt matte hair-shaped panels around the
   helmet — a chin-length **bob**, **ponytail**, **twin-tails**, or side buns.
   Reads instantly as feminine without a face.
2. **Hair accessory**: a small bow / hair-clip / headband.
3. **Outfit silhouette**: dress / flared skirt / pinafore, rounded peter-pan collar.
4. **Footwear**: Mary-Jane style (strap) vs sneakers.

**Color is independent of gender** — a female-coded robot need not be pink. A bob
+ dress silhouette reads female in teal or charcoal too. Combine gender × role ×
color freely.

## Color principle

- **Single signature** (charcoal / teal / red …): strong role↔color mapping,
  minimal. Keep the visor glow **cyan** even on a red body (red glow reads as an
  "alert/evil" robot).
- **Multicolor "aigijagi"** (e.g. blue helmet + coral blazer + mustard tie):
  livelier, cuter; roles distinguished by outfit. Keep it coordinated, not clownish.
- Either way, keep the **family threads**: cream trim + cyan glow. These bind the
  crew no matter the palette.

## Verify thresholds (from `scripts/verify-avatar.py`)

- **transparency**: colortype 6 (RGBA), corner alpha ≈ 0 → Tripo-ready.
- **no-shadow**: under-sole alpha ≈ 0 (no contact shadow / base disc).
- **proportion**: head ~43% (40–48% ok; a hair silhouette legitimately raises it),
  w/h ~0.58 (0.52–0.64 ok). Empirically siblings land within ~1pp of the base
  when the locks are used.
- (RGB/grey images read a slightly different head% due to the luminance-based
  opacity test; the alpha-based measure on the transparent version is authoritative.)

## Lessons / gotchas (hard-won)

- **Regenerating from text drifts; editing/anchoring from the base holds.** Always
  pass the canonical base as the reference image.
- **Outfit silhouette drives *perceived* proportion.** A full-length jumpsuit
  looked taller than the base even at the same head% — hence the compact-chunky lock.
- **Verify alpha in pixels, not by eye.** Viewers show transparent PNGs on grey /
  black / magenta backdrops; only the decoded alpha channel tells the truth.
- **Antenna stays thin** so the bake's body-pixel height calibration excludes it
  (rows with <40 opaque px don't count as "body"). A thick hat/tip would corrupt
  the height normalization.
- **No shadow, no base disc** in the input — a baked ground shadow becomes a dark
  disc/geometry in the Tripo mesh (the original robot-analyst base-disc bug).
- Keep the **visor screen blank** — expressions are a runtime LED overlay, so a
  baked expression would fight it.

## Related

- `docs/design/2026-07-02-avatar-system-plan.md` — appendices C/D (spike lessons,
  render load, expression-vs-prop split).
- `tools/avatar-render/RUNBOOK.md` — the GLB → 4-direction sprite bake procedure.
- `references/prompt-template.md` — the fill-in-the-blanks generation prompt.
