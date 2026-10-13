#!/bin/bash
# Usage: scripts/thumbs.sh <track> <slug> [wait-ms]  — captures dark and light thumbnails of a built lesson.
set -e
cd "$(dirname "$0")/.."
CAP=${CAPTURE:-$HOME/.claude/skills/anatomy/scripts/capture.mjs}
for t in dark light; do
  f=site/$1/$2/index.html; [ $t = light ] && f=site/$1/$2/index-light.html
  node "$CAP" "$f" --select ".iso-stage" --out "assets/thumbs/$1-$2-$t.png" --scale 1 --wait "${3:-9000}" | grep -E "exception" || true
done
