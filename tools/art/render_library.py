# SPDX-License-Identifier: GPL-3.0-or-later
# This Blender API script is licensed under GNU GPL v3 or later.
# See LICENSES.md and COPYING.GPL-3.0 in this directory.
"""Render manually editable scenes without regenerating their geometry.

blender -b art/source/blender/grove-library-v1.blend -P tools/art/render_library.py
Append -- --only tree.awake,mirror to iterate selected scenes.
The default art/renders/sprites folder holds versioned publication inputs.
Append -- --output art/build/preview to render drafts outside game assets.
"""
import argparse
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[2]


def render_library(bpy, argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument('--only', default=None)
    parser.add_argument('--output', default='art/renders/sprites')
    parser.add_argument('--size', type=int)
    parser.add_argument('--samples', type=int)
    args = parser.parse_args(argv)
    if args.size is not None and not 16 <= args.size <= 4096:
        parser.error('--size must be between 16 and 4096 pixels (runtime square-image budget)')
    if args.samples is not None and not 1 <= args.samples <= 4096:
        parser.error('--samples must be between 1 and 4096')

    scenes = [scene for scene in bpy.data.scenes if scene.get('asset_id')]
    available = {scene['asset_id'] for scene in scenes}
    if not scenes:
        parser.error('The open Blender file contains no asset scenes')
    if len(available) != len(scenes):
        parser.error('The open Blender file has duplicate asset IDs')
    if args.only is not None:
        requested = [asset_id.strip() for asset_id in args.only.split(',')]
        if any(not asset_id for asset_id in requested):
            parser.error('--only must contain one or more nonempty asset IDs')
        unknown = set(requested) - available
        if unknown:
            parser.error('Unknown asset IDs: ' + ', '.join(sorted(unknown)) + '. Available: ' + ', '.join(sorted(available)))
        scenes = [scene for scene in scenes if scene['asset_id'] in requested]
    if not scenes:
        parser.error('No asset scenes selected')

    # Validate every destination before starting a costly render or writing files.
    destination = (ROOT / args.output).resolve()
    allowed_outputs = [ROOT / 'art/renders/sprites', ROOT / 'art/build']
    if not any(destination.is_relative_to(folder.resolve()) for folder in allowed_outputs):
        parser.error('--output must be inside art/renders/sprites or art/build to protect editable sources and published assets')
    output_names = set()
    for scene in scenes:
        asset_id = scene['asset_id']
        output_name = scene.get('output_name')
        if not isinstance(asset_id, str) or re.fullmatch(r'[a-zA-Z][a-zA-Z0-9._-]{0,63}', asset_id) is None:
            parser.error('Invalid asset ID in the open Blender file')
        if not isinstance(output_name, str) or re.fullmatch(r'[a-zA-Z0-9_-]+\.png', output_name) is None:
            parser.error(f'{asset_id}: invalid PNG output_name')
        if output_name in output_names:
            parser.error(f'Duplicate output_name: {output_name}')
        output_names.add(output_name)
        if not (destination / output_name).resolve().is_relative_to(destination):
            parser.error(f'{asset_id}: output escapes the selected directory')

    destination.mkdir(parents=True, exist_ok=True)
    for scene in scenes:
        if args.size is not None:
            scene.render.resolution_x = scene.render.resolution_y = args.size
        if args.samples is not None:
            scene.cycles.samples = args.samples
        scene.render.filepath = str(destination / scene['output_name'])
        bpy.ops.render.render(write_still=True, scene=scene.name)
        print('RENDERED', scene['asset_id'], scene.render.filepath, flush=True)
    return len(scenes)


if __name__ == '__main__':
    import bpy
    render_library(bpy, sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
