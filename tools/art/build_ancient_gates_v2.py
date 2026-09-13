# SPDX-License-Identifier: GPL-3.0-or-later
"""Build original open-aperture woodland gates, without imported assets.

The central color seal is drawn by the game, so matching light visibly opens it.
Build once with Blender --background --factory-startup --python this_script.
Render later with render_library.py to preserve manual edits to the .blend.
"""
import argparse
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / 'art/source/blender/ancient-gates-v2.blend'


def rgba(value):
    rgb = [int(value[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in rgb) + (1,)


def material(name, color, metal=0, emission=0, grain=False):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = rgba(color)
    mat.use_nodes = True
    node = mat.node_tree.nodes.get('Principled BSDF')
    node.inputs['Base Color'].default_value = rgba(color)
    node.inputs['Roughness'].default_value = .38 if metal else .79
    node.inputs['Metallic'].default_value = metal
    node.inputs['Emission Color'].default_value = rgba(color)
    node.inputs['Emission Strength'].default_value = emission
    if grain:
        noise = mat.node_tree.nodes.new('ShaderNodeTexNoise')
        noise.inputs['Scale'].default_value = 8
        noise.inputs['Detail'].default_value = 3
        bump = mat.node_tree.nodes.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value = .22
        bump.inputs['Distance'].default_value = .055
        mat.node_tree.links.new(noise.outputs['Fac'], bump.inputs['Height'])
        mat.node_tree.links.new(bump.outputs['Normal'], node.inputs['Normal'])
    return mat


def finish(obj, name, mat):
    obj.name = name
    obj.data.materials.append(mat)
    return obj


def stone(name, loc, size, mat, tilt=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.rotation_euler[1] = tilt
    modifier = obj.modifiers.new('Rounded weathered corners', 'BEVEL')
    modifier.width = .065
    modifier.segments = 3
    obj.modifiers.new('Stone face normals', 'WEIGHTED_NORMAL')
    return finish(obj, name, mat)


def curve(name, points, radius, mat):
    data = bpy.data.curves.new(name, 'CURVE')
    data.dimensions = '3D'
    data.bevel_depth = radius
    data.bevel_resolution = 3
    spline = data.splines.new('BEZIER')
    spline.bezier_points.add(len(points) - 1)
    for i, (point, position) in enumerate(zip(spline.bezier_points, points)):
        point.co = position
        point.handle_left_type = point.handle_right_type = 'AUTO'
        point.radius = 1 - .65 * i / (len(points) - 1)
    obj = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(obj)
    data.materials.append(mat)


def gem(name, loc, size, mat):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1, location=loc)
    obj = bpy.context.object
    obj.scale = size
    finish(obj, name, mat)


def aim(obj, point):
    obj.rotation_euler = (Vector(point) - obj.location).to_track_quat('-Z', 'Y').to_euler()


def light(name, loc, color, energy, size):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy = energy
    data.color = rgba(color)[:3]
    data.shape = 'DISK'
    data.size = size
    obj = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = loc
    aim(obj, (0, 0, .6))


def gate(color, palette):
    scene = bpy.data.scenes.new('gate.' + color)
    bpy.context.window.scene = scene
    scene['asset_id'] = 'gate.' + color
    scene['output_name'] = 'gate-' + color + '-v2.png'
    scene['recipe'] = 'tools/art/build_ancient_gates_v2.py; original numeric geometry; no imported models/images'
    rock = material(color + ' / ancient greenstone', '#47605a', grain=True)
    edge = material(color + ' / worn pale stone', '#7f9180', grain=True)
    dark = material(color + ' / wet basal stone', '#243c3a', grain=True)
    moss = material(color + ' / small moss cushions', '#617b4c', grain=True)
    root = material(color + ' / slender living root', '#4b5641', grain=True)
    bronze = material(color + ' / narrow aged gold inlay', '#b8a16c', metal=.6)
    glow = material(color + ' / colored waystone', palette, emission=.7)

    # A shallow threshold, two substantial piers and a pointed keystone form a
    # doorway silhouette. The opening is transparent, not a baked solid slab.
    stone('Low irregular threshold', (0, .03, .065), (1.68, .69, .16), dark)
    stone('Inset threshold step', (0, -.18, .15), (1.32, .30, .105), rock)
    for side in (-1, 1):
        stone('Pier foot', (side * .56, 0, .26), (.43, .53, .29), rock)
        stone('Tapered ancient pier', (side * .56, .04, .70), (.32, .42, .81), rock, -side * .045)
        stone('Pier cap', (side * .53, .04, 1.12), (.43, .50, .21), edge, side * .08)
        stone('Pointed arch voussoir', (side * .285, .04, 1.31), (.62, .44, .24), rock, side * .43)
        # Short seams and a thin inner molding make the aperture readable even
        # at board-cell size; no repeated horizontal bars cross the passage.
        curve('Inner worn gold molding', [(side * .405, -.222, .3), (side * .399, -.182, .89), (side * .38, -.195, 1.08), (side * .16, -.18, 1.32), (0, -.18, 1.39)], .016, bronze)
        gem('Small side color stone', (side * .55, -.224, .91), (.065, .035, .115), glow)
        curve('Root embracing pier', [(side * .77, -.13, .12), (side * .64, -.23, .34), (side * .73, -.19, .64), (side * .69, .1, .98), (side * .55, .22, 1.18)], .028, root)
        for i in range(4):
            gem('Moss tuft on stone', (side * (.43 + .065 * i), .035 + .045 * math.sin(i), 1.25 - .025 * i), (.085, .065, .032), moss)
    stone('Central keystone', (0, .025, 1.445), (.24, .49, .29), edge)
    gem('Luminous keystone gem', (0, -.241, 1.445), (.077, .038, .12), glow)
    for x, y in [(-.72, -.23), (.69, .17), (.50, -.3)]:
        gem('Threshold moss', (x, y, .17), (.105, .075, .035), moss)

    data = bpy.data.cameras.new('Orthographic gate camera')
    camera = bpy.data.objects.new('Orthographic gate camera', data)
    scene.collection.objects.link(camera)
    camera.location = (0, -8, 6.7)
    aim(camera, (0, 0, .72))
    data.type = 'ORTHO'
    data.ortho_scale = 2.32
    scene.camera = camera
    world = bpy.data.worlds.new(color + ' / cool forest fill')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = rgba('#b2c8c3')
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = .28
    scene.world = world
    light('Broad upper left key', (-3, -4, 6), '#fff0c5', 440, 4)
    light('Cool side fill', (4, -1, 3), '#93c7cd', 240, 3)
    light('Soft back rim', (0, 4, 4), '#cee3be', 500, 3)
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 48
    scene.cycles.use_denoising = True
    scene.render.resolution_x = scene.render.resolution_y = 384
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.look = 'AgX - Medium High Contrast'
    return scene


def main(argv):
    parser = argparse.ArgumentParser()
    parser.add_argument('--replace', action='store_true')
    args = parser.parse_args(argv)
    if DEST.exists() and not args.replace:
        parser.error('Editable master exists. Render it; --replace explicitly discards manual edits.')
    initial = bpy.context.scene
    for color, palette in [('r', '#ed887f'), ('g', '#82d4ae'), ('b', '#84b9e8')]:
        gate(color, palette)
    bpy.data.scenes.remove(initial)
    bpy.context.window.scene = bpy.data.scenes['gate.r']
    DEST.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(DEST), compress=True)
    print('SAVED', DEST, flush=True)


if __name__ == '__main__':
    main(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
