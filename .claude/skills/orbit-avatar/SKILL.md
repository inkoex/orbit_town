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
- RGBA, transparent, no shadow. This is the **style/proportion anchor** (arms-down
  display pose). NOTE: a display pose is NOT a direct Tripo input — Tripo needs a
  rig-pose repose with open armpits (Procedure step 6 + Rig pose section).

Every new avatar is generated with THIS image as the reference (img2img anchor),
not from a text description alone.

## Family locks (NEVER change — these make them one crew)

1. **Proportion**: super-deformed; helmet ~just under half the figure height
   (≈43% measured), ≈ torso width.
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
   It **exits non-zero on a hard failure** (non-RGBA, non-transparent bg, or a
   shadow/base-disc) — use it as a gate. Expect: transparency PASS, no-shadow PASS,
   head ~40–48%, w/h ~0.52–0.64. Non-RGBA input fails transparency and its
   proportion is SKIPPED (the luminance heuristic misreads the cream trim by 5+pp).
   The shadow and proportion checks are heuristics with blind spots — so also:
4. **Eyeball** the render for family fit, the intended role read, and anything the
   numbers can't see. Numbers AND eyes both, never one alone.
5. **Fix drift, don't ship it.** If the script FAILs, WARNs off-band, or the
   silhouette drifted (a too-long outfit silently makes long legs — the off-band
   flag catches it; do NOT wave it away), re-generate with the compact-chunky lock
   emphasized until it passes BOTH the script and the eyeball.
6. **Tripo prep — the display image is NOT the Tripo input.** A display/hero pose
   has arms near the torso → fused armpits when auto-rigged (see Rig pose). Before Tripo:
   - 6a. Repose to a **rig pose** — open armpits, legs apart, natural hands (Rig pose section).
   - 6b. For a hero/base avatar, also make a **matching back view** (Back view section).
   Feed the rig-pose set (front [+ back]) to Tripo (image→3D → auto-rig with the
   **humanoid** model → walk → GLB), then bake with `tools/avatar-render/`
   (see `tools/avatar-render/RUNBOOK.md`).

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

**Front + back is the practical sweet spot.** A single front → Tripo hallucinates a
bland back; front+back fixes it. Side/full-turnaround views are riskier: text-gen
only approximates the exact pose/scale, and mis-registered views can make Tripo's
multi-view reconstruction WORSE, not better — add them only for a specific need.
Every view goes through `verify-avatar.py` (proportion) AND a visual check, and is
regenerated if off-band — image-gen drifts (it once silently lengthened the legs).
The manager rig set is a worked pair: `...-rigpose-natural.png` (front) +
`...-rigpose-natural-back.png` (back), matching pose/scale.

## Rig pose (the image you actually feed Tripo)

The display/hero pose (arms near the body) is NOT riggable: if the arms touch the
torso, the auto-rigger skins arm+torso as one blob and raising an arm drags the
side of the body up (fused armpits / weight bleeding). The **Tripo input image
must be a rig-friendly pose**:
- **Arms in a wide A-pose (~45° down-and-out)** with a clear GAP (visible
  background) under each arm — the armpit must be OPEN. Go full T-pose if the
  rigger still fuses them.
- **Legs slightly apart** with a visible gap between them.
- **Hands: keep them NATURAL** — chunky fingers softly curled and held close
  together, hanging relaxed (exactly the display-pose hands). Tripo reconstructs
  natural curled hands fine — the finger worry was overblown. Only avoid a WIDE
  FLAT SPLAY (starfish hand): big spread gaps web/noise in 3D. Do NOT overcorrect
  into featureless nubs or webbed grooves either. Natural relaxed hand = best.
  What actually matters for rigging is the ARM↔torso and leg↔leg gaps, not fingers.
- Keep everything else (proportion, colors, outfit, face) identical to the display
  version. This is a REPOSE of the same character, not a new one.
The rule of thumb: the **silhouette must have daylight through it** — arm↔torso
and leg↔leg separated — so the rigger can find the joints.

Example: `docs/design/assets/2026-07-04-sibling-office-manager-rigpose-natural.png`
(A-pose, open armpits, legs apart; NATURAL relaxed hands kept from the display
pose). This is the keeper — spread the arms/legs, leave the hands alone.

In Tripo, also pick the **humanoid/biped rig model**, NOT "Good for Animals"
(the default may be wrong — a biped rigged with the animal skeleton hangs/fails).

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

Expected input size ~**1024×1536** (the 40px body-row cutoff and bands are
calibrated for it; a downscaled image reads a few pp lower). The script exits
non-zero on any HARD failure, so it can gate.

- **transparency** [HARD]: colortype 6 (RGBA), corner alpha ≈ 0.
- **no-shadow** [HARD]: no broad moderate-alpha region (or opaque disc) below the
  soles. HEURISTIC — a fully-opaque disc flush with the feet can still slip past;
  the eyeball step is the backstop.
- **proportion** [soft/WARN]: head ~43% (40–48% ok; a hair silhouette legitimately
  raises it — female-rose ~47%), w/h ~0.58 (0.52–0.64 ok). Most siblings land near
  the base, but recolors/reposes CAN drift (comp-scientist-red measured ~48%), so
  treat every WARN as real and re-check.
- **Non-RGBA proportion is NOT reported** — the luminance opacity test misreads the
  ivory/cream trim (luminance near the grey bg) as background, moving the neck row
  and skewing head% by 5+pp (e.g. the grey Bspec-1 reads 48% vs the RGBA 43% for
  the identical character). Only the alpha-based RGBA measure is authoritative.

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
- **Feed Tripo a rig pose, not the hero pose.** Arms hugging the torso → fused
  armpits → the arm drags the body when animated. Spread the limbs (see Rig pose).
- **In Tripo, set the rig model to humanoid/biped, not "Good for Animals."** The
  wrong skeleton makes rigging hang for 10+ minutes. Credits aren't the issue.
- A stuck/undeletable Tripo rig task is a zombie — don't fight it; the mesh is safe
  in Assets. Open a fresh session (new tab / re-login) and start a new rig task.

## Related

- `docs/design/2026-07-02-avatar-system-plan.md` — appendices C/D (spike lessons,
  render load, expression-vs-prop split).
- `tools/avatar-render/RUNBOOK.md` — the GLB → 4-direction sprite bake procedure.
- `references/prompt-template.md` — the fill-in-the-blanks generation prompt.
