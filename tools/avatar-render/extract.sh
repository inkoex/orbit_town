#!/usr/bin/env bash
# Extract 4-direction walk+idle PNG frames from a Kenney .glb via headed browse.
# Usage: ./extract.sh "pack/Models/GLB format/character-male-a.glb" iso-agent
# WALK_LEN/HEIGHT_SCALE/YAW_OFFSET/FRUSTUM/LOOKY auto-calibrate; override via env if needed.
set -euo pipefail
GLB_REL="$1"; AVATAR_ID="$2"
ROOT="$(git rev-parse --show-toplevel)"
B="$HOME/.claude/skills/gstack/browse/dist/browse"
OUT="$ROOT/public/assets/iso-slice/$AVATAR_ID"
# browse --out only writes to /private/tmp or _src; stage in /tmp then copy.
STAGE="/private/tmp/avatar-render-$AVATAR_ID"
rm -rf "$STAGE"; mkdir -p "$STAGE" "$OUT"
# URL-encode spaces in the glb path
GLB_ENC="${GLB_REL// /%20}"
GLB="http://localhost:8765/_src/$GLB_ENC"

# IMPORTANT: headless WebGL fails on this machine — must use --headed (real GPU).
$B --headed goto "http://localhost:8765/render.html?glb=$GLB" >/dev/null
sleep 2
ready=$($B --headed js "window.__renderReady||false")
[ "$ready" = "true" ] || { echo "FAIL: render not ready (glb load failed?)"; exit 1; }

# Tunable framing (FRUSTUM=zoom, LOOKY=vertical) + direction (YAW_OFFSET deg).
# YAW_OFFSET default -45: with DIRS=(sw se ne nw) this makes each rendered frame
# face its true iso travel direction (matches the original iso-agent). Was 0,
# which rotated every avatar 45deg off from its movement heading.
$B --headed js "window.__setCam(${FRUSTUM:-0.80}, ${LOOKY:-0.72}); window.__yawOffset=${YAW_OFFSET:--45};" >/dev/null

# Height calibration. Normalization fits the TOTAL mesh height, so tall thin
# gear (antennae/hats) shrinks the body. HEIGHT_SCALE=auto renders a probe
# frame, measures the BODY pixel height (rows with ≥40 opaque px) and scales
# to the Kenney body reference; or pass a number to force a multiplier.
REF_BODY_PX=221  # Kenney male-a body px at FRUSTUM 0.80 / LOOKY 0.72, minPx=40
HEIGHT_SCALE="${HEIGHT_SCALE:-auto}"
if [ "$HEIGHT_SCALE" = "auto" ]; then
  $B --headed js "window.__renderFrame(0,-1)" >/dev/null
  body=$($B --headed js "window.__measureBodyH(40)" | tail -1 | tr -dc '0-9')
  if [ -n "$body" ] && [ "$body" -gt 0 ]; then
    HEIGHT_SCALE=$(awk "BEGIN{printf \"%.3f\", $REF_BODY_PX/$body}")
    echo "height calibration: body ${body}px -> scale ${HEIGHT_SCALE}"
  else
    HEIGHT_SCALE=1
    echo "height calibration failed; using 1"
  fi
fi
$B --headed js "window.__setHeightScale($HEIGHT_SCALE)" >/dev/null

# yaw 0/90/180/270 (= dirIndex order) face sw/se/ne/nw respectively, so label
# each rendered yaw with the direction it actually faces (no rotation hack).
DIRS=(sw se ne nw)
# Walk-cycle length. Default to the clip's ACTUAL duration (render.html exposes
# it as window.__walkLen) so a non-Kenney clip isn't sampled against Kenney's
# 0.667s and baked as a partial/limping stride. Override with WALK_LEN=<sec> if
# the clip packs several strides and you want to bake a sub-range.
WALK_LEN="${WALK_LEN:-auto}"
if [ "$WALK_LEN" = "auto" ]; then
  wl=$($B --headed js "window.__walkLen||0" | tail -1 | tr -dc '0-9.')
  if [ -n "$wl" ] && awk "BEGIN{exit !($wl>0)}"; then
    WALK_LEN="$wl"; echo "walk length: ${WALK_LEN}s (from clip)"
  else
    WALK_LEN=0.667; echo "walk length: no clip duration; using 0.667"
  fi
fi
for i in 0 1 2 3; do
  d="${DIRS[$i]}"
  $B --headed js "window.__renderFrame($i, -1)" --out "$STAGE/character-$d-idle.png" >/dev/null
  for f in 0 1 2 3; do
    t=$(awk "BEGIN{print $f/4*$WALK_LEN}")
    $B --headed js "window.__renderFrame($i, $t)" --out "$STAGE/character-$d-walk-$f.png" >/dev/null
  done
done
cp "$STAGE"/character-*.png "$OUT"/
rm -rf "$STAGE"
echo "wrote $(ls "$OUT"/character-*.png | wc -l | tr -d ' ') frames to $OUT"
