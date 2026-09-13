#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
if [[ -n "${GLINTGROVE_BLENDER:-}" ]]; then
  blender_bin="$GLINTGROVE_BLENDER"
elif command -v blender >/dev/null 2>&1; then
  blender_bin="$(command -v blender)"
elif [[ -x /Applications/Blender.app/Contents/MacOS/Blender ]]; then
  blender_bin=/Applications/Blender.app/Contents/MacOS/Blender
else
  echo 'Blender not found. Install Blender or set GLINTGROVE_BLENDER to its executable.' >&2
  exit 1
fi
exec "$blender_bin" --background art/source/blender/grove-library-v1.blend --python-exit-code 1 --python tools/art/render_library.py -- "$@"
