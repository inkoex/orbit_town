#!/usr/bin/env bash
# Validate an extracted avatar frame set. Usage: ./check-frames.sh iso-agent
set -euo pipefail
DIR="public/assets/iso-slice/$1"
n=$(ls "$DIR"/character-*.png 2>/dev/null | wc -l | tr -d ' ')
[ "$n" -eq 20 ] || { echo "FAIL: expected 20 frames, got $n"; exit 1; }
for f in "$DIR"/character-*.png; do
  w=$(sips -g pixelWidth "$f" | awk '/pixelWidth/{print $2}')
  h=$(sips -g pixelHeight "$f" | awk '/pixelHeight/{print $2}')
  [ "$w" = "256" ] && [ "$h" = "512" ] || { echo "FAIL: $f is ${w}x${h}, want 256x512"; exit 1; }
  sips -g hasAlpha "$f" | grep -q "hasAlpha: yes" || { echo "FAIL: $f no alpha"; exit 1; }
done
echo "OK: 20 frames, 256x512, alpha"
