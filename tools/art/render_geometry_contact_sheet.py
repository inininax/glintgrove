# SPDX-License-Identifier: GPL-3.0-or-later
# This Blender API script is licensed under GNU GPL v3 or later.
# See LICENSES.md and COPYING.GPL-3.0 in this directory.
"""Render a wordless review sheet directly from the 21 original Blender scenes.

No existing image is edited; no image/font is loaded; original objects are copied
into a temporary scene and the editable source is never saved by this script.
"""
from pathlib import Path
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
sources = sorted((s for s in bpy.data.scenes if s.get('asset_id')), key=lambda s: s['asset_id'])
if len(sources) != 21:
    raise RuntimeError('Open the original 21-scene grove-library-v1.blend first')

sheet = bpy.data.scenes.new('Wordless original sculpture collection')
bpy.context.window.scene = sheet
sheet.render.engine = 'CYCLES'
sheet.cycles.samples = 24
sheet.cycles.seed = 1709
sheet.cycles.use_denoising = True
sheet.render.resolution_x = 1600
sheet.render.resolution_y = 960
sheet.render.resolution_percentage = 100
sheet.render.image_settings.file_format = 'JPEG'
sheet.render.image_settings.color_mode = 'RGB'
sheet.render.image_settings.quality = 94
sheet.view_settings.view_transform = 'AgX'
sheet.view_settings.look = 'AgX - Medium High Contrast'
sheet.world = bpy.data.worlds.new('Soft jade review air')
sheet.world.use_nodes = True
sheet.world.node_tree.nodes['Background'].inputs[0].default_value = (.12, .20, .19, 1)
sheet.world.node_tree.nodes['Background'].inputs[1].default_value = .4
for index, original in enumerate(sources):
    group = bpy.data.objects.new(original['asset_id'] + ' / contact sheet group', None)
    sheet.collection.objects.link(group)
    group.location = ((index % 7 - 3) * 2.45, (1 - index // 7) * 2.65, 0)
    for obj in original.objects:
        if obj.type not in ('MESH', 'CURVE'):
            continue
        copy = obj.copy()
        sheet.collection.objects.link(copy)
        copy.parent = group

floor = bpy.data.materials.new('Original geometric review backdrop')
floor.diffuse_color = (.026, .059, .051, 1)
floor.use_nodes = True
floor.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = floor.diffuse_color
floor.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .92
mesh = bpy.data.meshes.new('Original flat review floor')
mesh.from_pydata([(-20, -20, -.18), (20, -20, -.18), (20, 20, -.18), (-20, 20, -.18)], [], [(0, 1, 2, 3)])
mesh.materials.append(floor)
obj = bpy.data.objects.new('Original flat review floor', mesh)
sheet.collection.objects.link(obj)

camera_data = bpy.data.cameras.new('Collection camera')
camera_data.type = 'ORTHO'
camera_data.ortho_scale = 18.2
camera = bpy.data.objects.new('Collection camera', camera_data)
sheet.collection.objects.link(camera)
camera.location = (0, -17, 24)
camera.rotation_euler = (Vector((0, 0, .38)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
sheet.camera = camera
for name, loc, color, energy, size in [
        ('Cool broad key', (-7, -5, 14), (.78, .89, 1), 4300, 11),
        ('Warm broad fill', (6, -3, 11), (1, .80, .49), 2800, 10),
        ('Jade broad rim', (1, 7, 9), (.37, 1, .82), 4000, 9)]:
    data = bpy.data.lights.new(name, 'AREA')
    data.energy = energy
    data.color = color
    data.size = size
    light = bpy.data.objects.new(name, data)
    sheet.collection.objects.link(light)
    light.location = loc
    light.rotation_euler = (Vector((0, 0, .5)) - light.location).to_track_quat('-Z', 'Y').to_euler()
target = ROOT / 'art/previews/sprite-contact-sheet-v1.jpg'
target.parent.mkdir(parents=True, exist_ok=True)
sheet.render.filepath = str(target)
bpy.ops.render.render(write_still=True, scene=sheet.name)
print('RENDERED WORDLESS SHEET', target, flush=True)
