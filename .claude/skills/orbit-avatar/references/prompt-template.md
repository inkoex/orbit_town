# Avatar generation prompt template

Fill the `<< >>` placeholders and send the whole block to the Codex `image_gen`
tool (`mcp__codex__codex`, `sandbox: danger-full-access`, `approval-policy: never`,
cwd = repo root). Keep the LOCK sections **verbatim** — they are what holds the
family together. Only edit the `VARY` section.

---

```
Use your built-in image generation/editing tool to create ONE character reference
image, using an EXISTING image as the proportion/structure/style reference. Save to:
/Users/inkoex/Documents/Projects/AI_Town/docs/design/assets/2026-07-04-sibling-<<NAME>>.png

REFERENCE IMAGE (match its proportions, compact silhouette, pose, framing, art
style, and face language EXACTLY):
/Users/inkoex/Documents/Projects/AI_Town/docs/design/assets/2026-07-04-avatar-space-Bspec-1-transparent.png

This is a SIBLING of the reference character — the same robot family. Keep these
IDENTICAL to the reference:

PROPORTION LOCK: super-deformed proportions — helmet/head just under half the total
figure height (~43% measured), about as wide as the torso.

COMPACT-CHUNKY SILHOUETTE LOCK (critical): short stubby visible legs, a
short/cropped chunky top ending around the hips, OVERSIZED chunky footwear. Reads
compact and top-heavy like the reference — never tall or lean.

Also identical: relaxed neutral standing A-pose, arms slightly away from the body,
HANDS EMPTY, symmetric, front view; same full-body framing (antenna top to soles
in frame, centered, same figure height); clean stylized 3D with soft even diffuse
lighting and no harsh speculars; matte finish; the shared FACE LANGUAGE — a large
blank dark glossy visor with a single symmetric soft CYAN resting glow (keep the
eye cyan, blank — no drawn eyes/lashes/mouth); thin antenna with a small tip; the
IVORY/CREAM trim as the shared family accent.

VARY ONLY these (this sibling = <<ROLE / PERSONALITY>>):
- Outfit: <<OUTFIT — keep it compact/cropped; e.g. cardigan / blazer+tie / overalls / dress>>
- Helmet: keep the rounded family helmet + blank dark visor + cyan glow; <<HELMET DETAIL, e.g. temple LED / headlamp / hair silhouette>>
- Color: <<PALETTE — single signature hue OR coordinated multicolor; keep cream trim + cyan glow>>
- Footwear: <<chunky sneakers / Mary-Janes — MODERATELY chunky, not extreme:
  oversized shoes interpenetrate during walk animation after auto-rigging>>
- Back: keep it CLEAN — no backpack/bag/dangling gear (auto-skinning makes
  attached accessories wobble; bags become 2D props later, never baked)
- NO worn accessories: no ID badge/lanyard/stethoscope/loose scarf ends —
  they weld into the mesh and jiggle like flesh when animated. Helmet-attached
  shapes and flush clothing details (buttons, pockets, trim) are fine.
<<GENDER CODING (optional): bob/ponytail/twin-tail hair silhouette + bow + dress/skirt + Mary-Janes>>

Output rules: RGBA PNG with a 100% TRANSPARENT background (alpha=0), NO shadow of
any kind (no cast shadow, no contact shadow under the feet, no base disc). Full
body centered.

After saving, reply with just the output file path and its pixel dimensions.
```

---

## Worked examples (head% MEASURED by verify-avatar.py, RGBA)

Most land near the base (~43%), but a recolor/repose CAN still drift — the red
scientist did. Re-measure each; don't assume a recolor kept the geometry.

| Name | Role | Outfit | Color | head% |
|---|---|---|---|---|
| `sibling-engineer` | maker-engineer | work overalls + tool belt, boots | charcoal | 44.0 |
| `sibling-comp-scientist` | computer scientist | knit cardigan + collar + lanyard | charcoal | 43.9 |
| `sibling-comp-scientist-teal` | (recolor) | same cardigan | teal/emerald | 43.9 |
| `sibling-comp-scientist-red` | (recolor) | same cardigan | coral red | **~48 (drifted)** |
| `sibling-office-manager` | desk manager | blazer + tie + ID badge | multicolor (blue/coral/mustard) | 43.8 |
| `sibling-female-rose` | female-coded | pinafore dress + bob hair + bow | dusty rose | 46.8 (hair) |

Recolor an existing sibling by using IT as the reference image and saying "this is
a RECOLOR — keep the form identical, only change the palette to <<COLOR>>; keep the
cyan glow and cream trim."
