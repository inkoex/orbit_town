#!/usr/bin/env bash
# Extract 4-direction walk+idle PNG frames from a Kenney .glb via headed browse.
# Usage: WALK_LEN=0.667 ./extract.sh "pack/Models/GLB format/character-male-a.glb" iso-agent
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

DIRS=(se sw nw ne)
WALK_LEN="${WALK_LEN:-0.667}"
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
