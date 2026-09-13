# SPDX-License-Identifier: GPL-3.0-or-later
# This Blender API script is licensed under GNU GPL v3 or later.
# See LICENSES.md and COPYING.GPL-3.0 in this directory.
"""Construct original, editable woodland environments without imported artwork.

Run in Blender, with -- --replace to explicitly rebuild the editable master.
Only meshes, curves, numeric palettes and procedural shader nodes are used.
Rendering is separate: render_procedural_environments.py preserves manual edits.
"""
import argparse
import math
from pathlib import Path
import random
import sys

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / 'art/source/procedural/nocturne-environments-v2.blend'
TAU = math.tau


def linear(hex_color):
    rgb = [int(hex_color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in rgb) + (1,)


def material(name, color, roughness=.7, metallic=0, glow=0, grain=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = linear(color)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = linear(color)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metallic
    shader.inputs['Emission Color'].default_value = linear(color)
    shader.inputs['Emission Strength'].default_value = glow
    if grain:
        noise = mat.node_tree.nodes.new('ShaderNodeTexNoise')
        noise.inputs['Scale'].default_value = 7
        noise.inputs['Detail'].default_value = 3
        noise.inputs['Roughness'].default_value = .68
        bump = mat.node_tree.nodes.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value = grain
        bump.inputs['Distance'].default_value = .08
        mat.node_tree.links.new(noise.outputs['Fac'], bump.inputs['Height'])
        mat.node_tree.links.new(bump.outputs['Normal'], shader.inputs['Normal'])
    return mat


def atmosphere_material(name, color):
    mat = material(name, color)
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    emission = nodes.new('ShaderNodeEmission')
    emission.inputs['Color'].default_value = linear(color)
    emission.inputs['Strength'].default_value = .8
    links.new(emission.outputs[0], nodes.get('Material Output').inputs['Surface'])
    return mat


def mesh_object(name, vertices, faces, mat, smooth=True):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    mesh.materials.append(mat)
    for poly in mesh.polygons:
        poly.use_smooth = smooth
    return obj


def ellipsoid(name, loc, size, mat, rng=None, rings=8, sides=16):
    verts, faces = [], []
    for row in range(rings + 1):
        phi = math.pi * row / rings
        for col in range(sides):
            angle = TAU * col / sides
            wobble = 1 + .075 * math.sin(angle * 3 + phi * 5) if rng else 1
            verts.append((loc[0] + math.sin(phi) * math.cos(angle) * size[0] * wobble,
                          loc[1] + math.sin(phi) * math.sin(angle) * size[1] * wobble,
                          loc[2] + math.cos(phi) * size[2]))
    for row in range(rings):
        for col in range(sides):
            a = row * sides + col
            b = row * sides + (col + 1) % sides
            faces.append((a, b, b + sides, a + sides))
    return mesh_object(name, verts, faces, mat)


def curve(name, points, radius, mat, taper=.15):
    data = bpy.data.curves.new(name, 'CURVE')
    data.dimensions = '3D'
    data.resolution_u = 16
    data.bevel_depth = radius
    data.bevel_resolution = 3
    data.use_fill_caps = True
    spline = data.splines.new('BEZIER')
    spline.bezier_points.add(len(points) - 1)
    for index, (point, position) in enumerate(zip(spline.bezier_points, points)):
        point.co = position
        point.handle_left_type = point.handle_right_type = 'AUTO'
        point.radius = 1 - (1 - taper) * index / (len(points) - 1)
    obj = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(obj)
    data.materials.append(mat)
    return obj


class Leaves:
    """Batch custom pointed, ridged leaves into editable meshes by material."""
    def __init__(self, materials):
        self.buckets = {mat: ([], []) for mat in materials}

    def add(self, location, length, width, angle, lean, mat):
        vertices, faces = self.buckets[mat]
        start = len(vertices)
        # A leaf is our own ten-triangle lenticular surface, with a raised spine.
        points = [(0, -length / 2, 0)]
        for t in (.2, .5, .8):
            spread = math.sin(math.pi * t) * width / 2
            y = (t - .5) * length
            points.extend([(-spread, y, .015), (0, y, width * .22), (spread, y, .015)])
        points.append((0, length / 2, -.035))
        for x, y, z in points:
            yy, zz = y * math.cos(lean) - z * math.sin(lean), y * math.sin(lean) + z * math.cos(lean)
            vertices.append((location[0] + x * math.cos(angle) - yy * math.sin(angle),
                             location[1] + x * math.sin(angle) + yy * math.cos(angle), location[2] + zz))
        topology = [(0, 1, 2), (0, 2, 3), (1, 4, 5, 2), (2, 5, 6, 3),
                    (4, 7, 8, 5), (5, 8, 9, 6), (7, 10, 8), (8, 10, 9)]
        faces.extend(tuple(start + i for i in face) for face in topology)

    def finish(self):
        for mat, (vertices, faces) in self.buckets.items():
            if vertices:
                mesh_object('Individually shaped foliage / ' + mat.name, vertices, faces, mat)


def aim(obj, point):
    obj.rotation_euler = (Vector(point) - obj.location).to_track_quat('-Z', 'Y').to_euler()


def light(name, loc, point, color, power, size):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy = power
    data.color = linear(color)[:3]
    data.shape = 'DISK'
    data.size = size
    obj = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = loc
    aim(obj, point)


def make_scene(name, share=False):
    scene = bpy.data.scenes.new(name)
    bpy.context.window.scene = scene
    scene['environment_id'] = name
    scene['recipe'] = 'tools/art/build_procedural_environments.py; numeric geometry only; seed 260913 + chapter index'
    scene['external_artwork'] = 'none'
    scene['output_name'] = 'og.png' if share else name + '-v2.png'
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 24
    scene.cycles.use_denoising = True
    scene.cycles.seed = 1709
    scene.cycles.max_bounces = 5
    scene.cycles.diffuse_bounces = 3
    scene.cycles.glossy_bounces = 3
    scene.render.resolution_x = 1200 if share else 1536
    scene.render.resolution_y = 630 if share else 1024
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGB'
    scene.render.film_transparent = False
    scene.view_settings.view_transform = 'AgX'
    scene.world = bpy.data.worlds.new(name + ' / night air')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = linear('#75958e')
    scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = .27
    camera_data = bpy.data.cameras.new(name + ' / composition')
    camera = bpy.data.objects.new(name + ' / composition', camera_data)
    scene.collection.objects.link(camera)
    camera.location = (0, -23, 8.0)
    aim(camera, (0, 5, 4.0))
    camera_data.type = 'ORTHO'
    camera_data.ortho_scale = 23.5 if share else 22
    scene.camera = camera
    light('Moonlit canopy', (-8, -1, 14), (0, 4, 1), '#c9e5dc', 3900, 7)
    light('Mist in the clearing', (2, 18, 11), (0, 1, 2), '#76b8b0', 5600, 8)
    light('Warm pollen light', (2, -8, 6), (0, 1, 2), '#e9c57c', 650, 9)
    return scene


def build_environment(chapter, index, share=False):
    scene = make_scene('share' if share else chapter, share)
    rng = random.Random(260913 + index)
    palette = {
        'forest': ('#193b38', '#385c50', '#76a284', '#a8c7ad', '#cdd8b4'),
        'depths': ('#243745', '#435566', '#6e91a4', '#a6b3cb', '#aea0c5'),
        'garden': ('#263a3b', '#536963', '#8dada1', '#c3cdc0', '#d8b6c8'),
        'heart': ('#263a32', '#51624c', '#98ad79', '#c2c99c', '#d6b77c'),
    }[chapter]
    mats = {
        'bark': material(chapter + ' / carved bark', '#243b33', grain=.48),
        'barkEdge': material(chapter + ' / bark ridges', '#425248', grain=.28),
        'stone': material(chapter + ' / river stone', palette[1], grain=.2),
        'soil': material(chapter + ' / velvet earth', '#142b2a', grain=.14),
        'dark': material(chapter + ' / velvet moss', palette[0], grain=.10),
        'leaf': material(chapter + ' / jade leaf', palette[2], grain=.08),
        'leafLight': material(chapter + ' / silver leaf', palette[3], grain=.06),
        'leafDark': material(chapter + ' / shaded leaf', palette[1]),
        'accent': material(chapter + ' / chapter petals', palette[4], roughness=.48),
        'glow': material(chapter + ' / pollen light', '#ffe2a0', glow=3),
        'cyan': material(chapter + ' / luminous caps', '#85cfc7', glow=.9),
        'ivory': material(chapter + ' / ivory stalk', '#b9c5b5'),
        'water': material(chapter + ' / still water', palette[1], roughness=.2, metallic=.2),
    }
    leaves = Leaves([mats[k] for k in ('leaf', 'leafLight', 'leafDark', 'accent')])
    # A continuous original shader gradient supplies soft, quiet distant air.
    haze = material(chapter + ' / graduated distant air', palette[0], glow=.35)
    shader = haze.node_tree.nodes.get('Principled BSDF')
    tex = haze.node_tree.nodes.new('ShaderNodeTexCoord')
    sep = haze.node_tree.nodes.new('ShaderNodeSeparateXYZ')
    ramp = haze.node_tree.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = .05
    ramp.color_ramp.elements[0].color = linear('#142f31')
    ramp.color_ramp.elements[1].position = 1
    ramp.color_ramp.elements[1].color = linear('#173b3e')
    ramp.color_ramp.elements.new(.40).color = linear(palette[2])
    haze.node_tree.links.new(tex.outputs['Generated'], sep.inputs[0])
    haze.node_tree.links.new(sep.outputs['Z'], ramp.inputs[0])
    haze.node_tree.links.new(ramp.outputs['Color'], shader.inputs['Base Color'])
    haze.node_tree.links.new(ramp.outputs['Color'], shader.inputs['Emission Color'])
    mesh_object('Distant atmosphere', [(-35, 42, -6), (35, 42, -6), (35, 42, 23), (-35, 42, 23)], [(0, 1, 2, 3)], haze)
    ellipsoid('Broad moss floor', (0, 7, -2.6), (45, 58, 3.0), mats['soil'])
    ellipsoid('Still pool', (0, 16, -.20), (7, 9, .18), mats['water'])
    soil_nodes = mats['soil'].node_tree.nodes
    soil_links = mats['soil'].node_tree.links
    position = soil_nodes.new('ShaderNodeNewGeometry')
    grain = soil_nodes.new('ShaderNodeTexNoise')
    grain.inputs['Scale'].default_value = .85
    grain.inputs['Detail'].default_value = 4
    soil_links.new(position.outputs['Position'], grain.inputs['Vector'])
    soil_color = soil_nodes.new('ShaderNodeValToRGB')
    soil_color.color_ramp.elements[0].color = linear('#102b29')
    soil_color.color_ramp.elements[1].color = linear('#294739')
    soil_links.new(grain.outputs['Fac'], soil_color.inputs[0])
    soil_links.new(soil_color.outputs['Color'], soil_nodes.get('Principled BSDF').inputs['Base Color'])
    for i in range(9):
        hill_material = atmosphere_material(chapter + f' / remote moss bank {i}', '#274946')
        ellipsoid('Remote moss horizon', ((i - 4) * 5.5, 31 + (i % 3) * 2, -.2), (4.8, 4.2, rng.uniform(.8, 1.9)), hill_material)

    # Distant tree layers are colored into their depth; no photo or atmosphere texture.
    for layer in range(3):
        y = 14 + layer * 7
        far = atmosphere_material(chapter + f' / distance layer {layer}', ['#1f4140', '#2c5352', '#385f5d'][layer])
        for n in range(13):
            x = (n - 6) * 2.6 + rng.uniform(-.8, .8)
            z = 10 + rng.random() * 7
            curve('Distant leaning trunk', [(x, y, -3), (x + .3, y, z * .48), (x - .5, y, z)], .14 + rng.random() * .15, far, .28)
            for side in (-1, 1):
                curve('Distant bough', [(x, y, z * .5), (x + side, y, z * .66), (x + side * 2.1, y, z * .73)], .10, far)
            ellipsoid('Distant rounded canopy', (x, y + .3, z), (2.4, 1.4, 1.4), far, rng)

    # Foreground is a pair of asymmetric living columns and overhead boughs.
    for side in (-1, 1):
        x = side * (8.4 if side == -1 else 9.0)
        y = 0 if side == -1 else 2
        trunk = [(x + side * .3, y, -.1), (x - side * .6, y, 3), (x + side * .15, y + .5, 6.2), (x - side * 1.4, y + 1, 10.4)]
        curve('Ancient twisting trunk', trunk, .86 if side == -1 else 1.0, mats['bark'], .48)
        for strand in range(5):
            angle = strand * TAU / 5
            offset = .43
            ridge = [(px + math.cos(angle + j * .4) * offset, py + math.sin(angle + j * .4) * offset, pz) for j, (px, py, pz) in enumerate(trunk)]
            curve('Flowing bark ridge', ridge, .08, mats['barkEdge'], .42)
        for root in range(6):
            angle = rng.uniform(0, TAU)
            reach = rng.uniform(1.8, 4.6)
            curve('Exposed spreading root', [(x, y, .85), (x + math.cos(angle) * reach * .45, y + math.sin(angle) * reach * .4, .28), (x + math.cos(angle) * reach, y + math.sin(angle) * reach, -.02)], .27, mats['bark'], .1)
        for branch in range(3):
            z = 4.9 + branch * 1.25
            end = (x - side * (4.1 - branch * .75), y + 2.8 + branch * .2, z + 3.1)
            curve('Arched canopy branch', [(x, y + .5, z), (x - side * .7, y + .5, z + 1.2), (end[0] + side * .8, y + 1.8, z + 2.8), end], .32, mats['bark'], .08)
            for clump in range(3):
                cx, cy, cz = end[0] + rng.uniform(-1.5, 1.5), end[1] + rng.uniform(-1.1, 1.1), end[2] + rng.uniform(-.3, .8)
                ellipsoid('Moss-soft canopy volume', (cx, cy, cz), (1.18, .90, .52), mats['dark'], rng)
                for leaf in range(340):
                    a = rng.random() * TAU
                    v = rng.uniform(-1, 1)
                    r = math.sqrt(1 - v * v)
                    p = (cx + math.cos(a) * r * 1.40, cy + math.sin(a) * r * 1.07, cz + v * .68)
                    tint = mats['leafLight'] if leaf % 7 == 0 else mats['leaf'] if leaf % 3 == 0 else mats['leafDark']
                    leaves.add(p, rng.uniform(.32, .55), rng.uniform(.17, .27), a, rng.uniform(-1.2, 1.2), tint)
        for patch in range(25):
            z = rng.uniform(.25, 5.5)
            tx = x - side * .35 + math.sin(z * 1.1) * .16
            leaves.add((tx + rng.uniform(-.35, .35), y - .60, z), .20, .075, rng.random() * TAU, 1.0, mats['leafDark'])

    def fern(x, y, z, size):
        for shoot in range(5):
            angle = shoot * 1.3 + rng.random() * .3
            dx, dy = math.cos(angle), math.sin(angle)
            points = [(x, y, z), (x + dx * size * .45, y + dy * size * .45, z + size * .75), (x + dx * size, y + dy * size, z + size * .65)]
            curve('Fern curved spine', points, .013, mats['leafDark'], .25)
            for i in range(1, 9):
                t = i / 9
                for sign in (-1, 1):
                    p = (x + dx * size * t - dy * sign * .09 * size, y + dy * size * t + dx * sign * .09 * size, z + size * (.85 * math.sin(t * 1.5)))
                    leaves.add(p, size * (.30 - .19 * t), size * .06, -angle + sign * .8, .25, mats['leafLight'] if i % 4 == 0 else mats['leaf'])

    def mushroom(x, y, z, size):
        curve('Luminous mushroom stalk', [(x, y, z), (x + size * .05, y, z + size * .4), (x, y, z + size * .68)], size * .05, mats['ivory'], .8)
        ellipsoid('Mushroom ivory underside', (x, y, z + size * .66), (size * .38, size * .30, size * .07), mats['ivory'])
        ellipsoid('Luminous mushroom cap', (x, y, z + size * .73), (size * .4, size * .32, size * .14), mats['cyan'])

    for side in (-1, 1):
        # Sculpted moss banks and ferns frame the board, including a narrow mobile crop.
        for i in range(22):
            x = side * rng.uniform(5.9, 11.5)
            y = rng.uniform(-3.7, 9)
            size = rng.uniform(.5, 1.5)
            ellipsoid('Weathered river stone', (x, y, .1), (size, size * .75, size * .58), mats['stone'], rng)
            ellipsoid('Moss cushion', (x, y, size * .45), (size * .94, size * .71, size * .20), mats['dark'], rng)
            for j in range(12):
                a = rng.random() * TAU
                leaves.add((x + math.cos(a) * size * .6, y + math.sin(a) * size * .5, size * .58), .25, .12, a, .3, mats['leafDark'])
            if i % 2 == 0:
                fern(x - side * .35, y - .45, size * .56, rng.uniform(.65, 1.25))
            if i % 4 == 0:
                for leaf in range(65):
                    a = rng.random() * TAU
                    r = math.sqrt(rng.random())
                    leaves.add((x + math.cos(a) * r * .9, y + math.sin(a) * r * .6, size * .6 + (1 - r) * .8),
                               rng.uniform(.35, .65), .21, a, rng.uniform(.15, 1), mats['leaf'] if leaf % 3 == 0 else mats['leafDark'])
            if i % 3 == 0:
                for j in range(3):
                    mushroom(x - side * .6 + j * .25, y - .4, .3, rng.uniform(.35, .65))
            if chapter == 'depths' and i % 3 == 1:
                for j in range(3):
                    h = rng.uniform(.5, 1.3)
                    verts = []
                    for ring, (r, zz) in enumerate(((.14, 0), (.18, h * .65), (0, h))):
                        for k in range(6):
                            a = k * TAU / 6
                            verts.append((x + j * .24 + math.cos(a) * r, y + math.sin(a) * r, .4 + zz))
                    faces = [(k, (k + 1) % 6, (k + 1) % 6 + 6, k + 6) for k in range(6)]
                    faces.extend((6 + k, 6 + (k + 1) % 6, 12) for k in range(6))
                    mesh_object('Faceted amethyst shoot', verts, faces, mats['accent'], False)
            if chapter in ('garden', 'heart'):
                for blossom in range(6):
                    bx, by, bz = x + rng.uniform(-.6, .6), y + rng.uniform(-.4, .4), size * .62 + .15
                    for petal in range(5):
                        a = petal * TAU / 5
                        leaves.add((bx + math.cos(a) * .07, by + math.sin(a) * .07, bz), .19, .11, a, .2, mats['accent'])
                    ellipsoid('Pollen heart', (bx, by, bz + .035), (.035, .035, .035), mats['glow'], rings=4, sides=8)
        # These near-edge plants remain in portrait crops without blocking the middle.
        for i in range(3):
            fern(side * (3.5 + i * .65), -4 + i * .5, -.02, .9 + i * .2)

    for i in range(75):
        x = rng.uniform(-10, 10)
        y = rng.uniform(1, 13)
        z = rng.uniform(.7, 9)
        if abs(x) < 3.8 and z < 6.2:
            continue
        radius = rng.uniform(.010, .025)
        ellipsoid('Warm floating seed', (x, y, z), (radius, radius, radius), mats['glow'], rings=4, sides=8)
    leaves.finish()
    # Homogeneous volume is generated numerically, without an HDRI or fog bitmap.
    fog = bpy.data.materials.new(chapter + ' / light-catching air')
    fog.use_nodes = True
    nodes, links = fog.node_tree.nodes, fog.node_tree.links
    nodes.remove(nodes.get('Principled BSDF'))
    volume = nodes.new('ShaderNodeVolumePrincipled')
    volume.inputs['Density'].default_value = .017
    volume.inputs['Color'].default_value = linear('#7dafa8')
    volume.inputs['Anisotropy'].default_value = .2
    links.new(volume.outputs['Volume'], nodes.get('Material Output').inputs['Volume'])
    mesh_object('Atmospheric volume', [(-20,-7,-4),(20,-7,-4),(20,41,-4),(-20,41,-4),(-20,-7,20),(20,-7,20),(20,41,20),(-20,41,20)],
                [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)], fog, False)
    if share:
        # An original optical seed sculpture is the wordless social identity.
        gold = material('Share / satin antique gold', '#d9bf79', metallic=.72, roughness=.29)
        glass = material('Share / polished teal stone', '#559b92', metallic=.5, roughness=.22)
        ellipsoid('Share / polished pebble plinth', (0, -1, .4), (2.8, 1.7, .50), mats['stone'], rng)
        for turn in (-1, 1):
            pts = []
            for step in range(37):
                t = step / 36 * math.pi * 1.75
                pts.append((math.sin(t) * (1.35 + turn * .1), -1 + turn * .24, 2.4 + math.cos(t) * 1.35))
            curve('Share / open light orbit', pts, .075, gold, 1)
        ellipsoid('Share / suspended seed', (0, -1.05, 2.45), (.58, .36, .98), glass)
        curve('Share / seed vein', [(0, -1.42, 1.7), (-.15, -1.45, 2.3), (.08, -1.42, 3.1)], .022, mats['glow'], .5)
        for sign in (-1, 1):
            curve('Share / luminous path', [(sign * 5, -2, .55), (sign * 3.4, -1.9, .57), (sign * 1.2, -1.5, 1.1), (0, -1, 2.4)], .018, mats['glow'], .5)
    return scene


def main(argv):
    parser = argparse.ArgumentParser()
    parser.add_argument('--replace', action='store_true')
    args = parser.parse_args(argv)
    if DEST.exists() and not args.replace:
        parser.error('Editable source exists. Render it; --replace explicitly rebuilds it.')
    for scene in list(bpy.data.scenes):
        if len(bpy.data.scenes) > 1:
            bpy.data.scenes.remove(scene)
    initial = bpy.context.scene
    for i, name in enumerate(('forest', 'depths', 'garden', 'heart')):
        build_environment(name, i)
        print('BUILT', name, flush=True)
    build_environment('forest', 0, share=True)
    bpy.data.scenes.remove(initial)
    bpy.context.window.scene = bpy.data.scenes['forest']
    bpy.context.scene['documentation'] = 'art/recipes/procedural-environments-v2.md'
    DEST.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(DEST), compress=True)
    print('SAVED', DEST, flush=True)


if __name__ == '__main__':
    main(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
