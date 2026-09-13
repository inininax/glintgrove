# SPDX-License-Identifier: GPL-3.0-or-later
# This Blender API script is licensed under GNU GPL v3 or later.
# See LICENSES.md and COPYING.GPL-3.0 in this directory.
"""Create a separate v3 master from the original v2 woodland scenes.

Open the v2 master before running. This never saves over that input file.
Only locally defined geometry, numerical palettes and procedural shaders are used.
"""
import argparse
import importlib.util
import math
from pathlib import Path
import random
import sys

import bpy

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'art/source/procedural/nocturne-environments-v2.blend'
DEST = ROOT / 'art/source/procedural/nocturne-environments-v3.blend'
spec = importlib.util.spec_from_file_location('woodland_geometry', Path(__file__).with_name('build_procedural_environments.py'))
geometry = importlib.util.module_from_spec(spec)
spec.loader.exec_module(geometry)

# The quiet middle remains open; stronger light and ornament sit at the edges.
PALETTES = {
    'forest': {'shadow': '#123e41', 'water': '#215f64', 'light': '#ffe0a0', 'rim': '#6bd7d2', 'petal': '#a8ddce', 'sky': '#739f91'},
    'depths': {'shadow': '#162c4d', 'water': '#294b81', 'light': '#adcdff', 'rim': '#9a80ed', 'petal': '#b7a8f2', 'sky': '#778fba'},
    'garden': {'shadow': '#233f42', 'water': '#447873', 'light': '#ffe8d2', 'rim': '#c394c8', 'petal': '#f3c5d8', 'sky': '#b3ba9c'},
    'heart': {'shadow': '#243c36', 'water': '#466d59', 'light': '#ffd083', 'rim': '#efa364', 'petal': '#f2d49b', 'sky': '#b5a57a'},
}


def scene_material(scene, stem):
    for obj in scene.objects:
        if obj.type in {'MESH', 'CURVE'}:
            for mat in obj.data.materials:
                if mat and mat.name.split('.')[0] == stem:
                    return mat
    raise ValueError(stem)


def tune_material(mat, color, glow=None, roughness=None):
    shader = mat.node_tree.nodes.get('Principled BSDF')
    if shader:
        shader.inputs['Base Color'].default_value = geometry.linear(color)
        if glow is not None:
            shader.inputs['Emission Color'].default_value = geometry.linear(color)
            shader.inputs['Emission Strength'].default_value = glow
        if roughness is not None:
            shader.inputs['Roughness'].default_value = roughness
    emission = mat.node_tree.nodes.get('Emission')
    if emission:
        emission.inputs['Color'].default_value = geometry.linear(color)


def upgrade(name, index):
    scene = bpy.data.scenes[name]
    bpy.context.window.scene = scene
    rng = random.Random(26091330 + index)
    palette = PALETTES[name]
    scene['recipe'] = 'tools/art/upgrade_procedural_environments_v3.py; original numeric additions; seed 26091330 + chapter index'
    scene['parent_master'] = 'art/source/procedural/nocturne-environments-v2.blend'
    scene['documentation'] = 'art/recipes/procedural-environments-v3.md'
    scene['output_name'] = name + '-v3.png'
    scene['external_artwork'] = 'none'
    scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = geometry.linear(palette['shadow'])
    scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = .22
    scene.view_settings.exposure = -.15
    for obj in scene.objects:
        if obj.type == 'LIGHT':
            if obj.name.startswith('Moonlit canopy'):
                obj.data.energy = 1650
                obj.data.color = geometry.linear(palette['rim'])[:3]
                obj.data.size = 5
            elif obj.name.startswith('Mist in the clearing'):
                obj.data.energy = 3600
                obj.data.color = geometry.linear(palette['light'])[:3]
                obj.location = (4, 17, 12)
                obj.data.size = 4
                geometry.aim(obj, (-2, 1, 0))
            else:
                obj.data.energy = 180
        # Flat distant canopy disks were visible across the upper edge.
        if obj.name.startswith('Distant rounded canopy'):
            obj.hide_render = True
    haze = scene_material(scene, name + ' / graduated distant air')
    ramp = next(node for node in haze.node_tree.nodes if node.bl_idname == 'ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = geometry.linear(palette['shadow'])
    ramp.color_ramp.elements[1].color = geometry.linear(palette['sky'])
    ramp.color_ramp.elements[2].color = geometry.linear(palette['shadow'])
    for layer, tint in enumerate((palette['shadow'], palette['water'], palette['sky'])):
        mat = scene_material(scene, name + f' / distance layer {layer}')
        tune_material(mat, tint)
        mat.node_tree.nodes['Emission'].inputs['Strength'].default_value = (.38, .46, .52)[layer]
    fog = scene_material(scene, name + ' / light-catching air')
    volume = fog.node_tree.nodes.get('Principled Volume')
    volume.inputs['Density'].default_value = .012
    volume.inputs['Color'].default_value = geometry.linear('#b4c7c3')
    volume.inputs['Anisotropy'].default_value = .45
    tune_material(scene_material(scene, name + ' / luminous caps'), palette['rim'], glow=2.2)
    if name != 'forest':
        tune_material(scene_material(scene, name + ' / chapter petals'), palette['petal'], glow=.12)
    tune_material(scene_material(scene, name + ' / silver leaf'), palette['petal'], roughness=.4)

    # A gently winding reflective surface, above the earth, exposes the pool.
    water = geometry.material(name + ' / v3 luminous current', palette['water'], roughness=.27, metallic=.35)
    nodes, links = water.node_tree.nodes, water.node_tree.links
    position = nodes.new('ShaderNodeNewGeometry')
    stretch = nodes.new('ShaderNodeVectorMath')
    stretch.operation = 'MULTIPLY'
    stretch.inputs[1].default_value = (.7, 7, 2)
    links.new(position.outputs['Position'], stretch.inputs[0])
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 1.5
    noise.inputs['Detail'].default_value = 3
    links.new(stretch.outputs['Vector'], noise.inputs['Vector'])
    bump = nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = .42
    bump.inputs['Distance'].default_value = .10
    links.new(noise.outputs['Fac'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], nodes['Principled BSDF'].inputs['Normal'])
    verts, faces = [], []
    for row in range(76):
        y = -45 + row
        center = math.sin(y * .17) * .7
        width = 4.3 + math.sin(y * .19) * .45 + max(0, -y - 2) * .9
        verts.extend([(center - width, y, .47), (center + width, y, .47)])
        if row:
            a = (row - 1) * 2
            faces.append((a, a + 1, a + 3, a + 2))
    geometry.mesh_object('V3 / winding mirror pool', verts, faces, water)
    silver = geometry.material(name + ' / v3 water filament', palette['rim'], roughness=.22, metallic=.35, glow=.35)
    # Broken, very slender reflections keep the middle restful for UI text.
    for i in range(32):
        y = rng.uniform(-10, 23)
        x = rng.uniform(-2.8, 2.8)
        length = rng.uniform(.16, .62)
        points = [(x + length * (t / 8 - .5), y + math.sin(t / 8 * math.pi) * .035, .484) for t in range(9)]
        geometry.curve('V3 / reflected thread', points, rng.uniform(.003, .009), silver, .2)
    # One original luminous celestial disc, filtered by the volumetric canopy.
    moon_mat = geometry.material(name + ' / v3 distant lantern', palette['light'], glow=3.6)
    geometry.ellipsoid('V3 / moon beyond the clearing', (1.8, 24, 6.1), (.83, .18, .83), moon_mat, rings=24, sides=48)
    geometry.light('V3 / warm pool reflection', (3.8, 12, 8.5), (0, 1, .4), palette['light'], 850, 2.6)
    geometry.light('V3 / cool bank rim', (-6.5, 6, 4.6), (-4, -2, 1), palette['rim'], 750, 3)
    # Broad soft volumetric shafts are actual light passing through numeric fog.
    for i, (x, power) in enumerate(((4.5, 2000), (1.8, 1400))):
        data = bpy.data.lights.new(name + f' / v3 canopy shaft {i}', 'SPOT')
        data.energy = power
        data.color = geometry.linear(palette['light'])[:3]
        data.spot_size = .42 if i == 0 else .23
        data.spot_blend = .82
        data.shadow_soft_size = .4
        obj = bpy.data.objects.new(data.name, data)
        scene.collection.objects.link(obj)
        obj.location = (x, 11 + i * 3, 13)
        geometry.aim(obj, (-4 + i * 4, -5, .3))

    # Detailed hanging fronds and blossoms frame the edges without filling center.
    moss = geometry.material(name + ' / v3 hanging moss', palette['shadow'], roughness=.76)
    petal = geometry.material(name + ' / v3 illuminated petal', palette['petal'], roughness=.44, glow=.18)
    leaves = geometry.Leaves([moss, petal])
    for side in (-1, 1):
        for strand in range(7):
            x = side * (6.0 + strand * .49)
            y = 1.5 + rng.uniform(0, 2)
            top = 10 + rng.uniform(-.4, .6)
            length = rng.uniform(1.3, 3)
            points = [(x, y, top), (x + side * .15, y, top - length * .55), (x - side * .18, y, top - length)]
            geometry.curve('V3 / suspended moss strand', points, .016, moss, .3)
            for j in range(15):
                t = j / 15
                leaves.add((x + math.sin(t * 5) * .12, y, top - t * length), .19, .075, j * 2.4, .8, petal if j % 7 == 0 else moss)
        # Small backlit blooms at a bank bring layered foreground depth.
        for i in range(14):
            x = side * rng.uniform(4.8, 8.3)
            y = rng.uniform(-6, 3)
            z = .45 + rng.random() * .8
            geometry.curve('V3 / bank flower stem', [(x, y, .3), (x + .08, y, z)], .018, moss, .8)
            for k in range(5):
                angle = k * math.tau / 5
                leaves.add((x + math.cos(angle) * .10, y + math.sin(angle) * .10, z), .3, .14, angle, .3, petal)
            geometry.ellipsoid('V3 / bank flower light', (x, y, z + .035), (.035, .035, .035), moon_mat, rings=4, sides=8)
    leaves.finish()
    scene.cycles.samples = 48
    scene.cycles.use_denoising = True
    scene.cycles.seed = 1709
    return scene


def main(argv):
    parser = argparse.ArgumentParser()
    parser.add_argument('--replace', action='store_true', help='Explicitly rebuild the separate v3 master from v2, discarding v3 edits.')
    args = parser.parse_args(argv)
    if Path(bpy.data.filepath).resolve() != SOURCE:
        parser.error('Open the v2 master first; this upgrade saves only a separate v3 file.')
    if DEST.exists() and not args.replace:
        parser.error('The v3 editable master exists. Render it, or explicitly rebuild with --replace.')
    for i, name in enumerate(PALETTES):
        upgrade(name, i)
        print('UPGRADED', name, flush=True)
    bpy.context.window.scene = bpy.data.scenes['forest']
    bpy.ops.wm.save_as_mainfile(filepath=str(DEST), compress=True)
    print('SAVED', DEST, flush=True)


if __name__ == '__main__':
    main(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
