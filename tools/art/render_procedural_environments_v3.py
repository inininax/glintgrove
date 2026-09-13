# SPDX-License-Identifier: GPL-3.0-or-later
# This Blender API script is licensed under GNU GPL v3 or later.
# See LICENSES.md and COPYING.GPL-3.0 in this directory.
"""Render the editable v3 master without rebuilding or saving scene edits."""
import argparse
from pathlib import Path
import sys
import bpy

ROOT = Path(__file__).resolve().parents[2]


def main(argv):
    parser = argparse.ArgumentParser()
    parser.add_argument('--only', default='forest,depths,garden,heart')
    parser.add_argument('--percent', type=int, default=100)
    parser.add_argument('--samples', type=int, default=48)
    parser.add_argument('--draft', action='store_true')
    args = parser.parse_args(argv)
    if not 5 <= args.percent <= 100 or not 1 <= args.samples <= 4096:
        parser.error('percent must be 5..100; samples must be 1..4096')
    if not args.draft and args.percent != 100:
        parser.error('Use --draft for reduced-resolution reviews; final sources must stay full size.')
    names = args.only.split(',')
    if any(name not in ('forest', 'depths', 'garden', 'heart') for name in names):
        parser.error('Unknown environment ID')
    for name in names:
        scene = bpy.data.scenes.get(name)
        if scene is None or scene.get('output_name') != name + '-v3.png':
            parser.error('Open the editable nocturne-environments-v3.blend library first')
    for name in names:
        scene = bpy.data.scenes[name]
        destination = ROOT / ('art/build/environment-drafts-v3' if args.draft else 'art/source/procedural') / (name + '-v3.png')
        destination.parent.mkdir(parents=True, exist_ok=True)
        scene.render.resolution_percentage = args.percent
        scene.cycles.samples = args.samples
        scene.render.filepath = str(destination)
        bpy.ops.render.render(write_still=True, scene=name)
        print('RENDERED', name, destination, flush=True)


if __name__ == '__main__':
    main(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
