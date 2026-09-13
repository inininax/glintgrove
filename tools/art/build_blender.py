# SPDX-License-Identifier: GPL-3.0-or-later
# This Blender API script is licensed under GNU GPL v3 or later.
# See LICENSES.md and COPYING.GPL-3.0 in this directory.
"""Author Glintgrove's original editable sculpture library; run inside Blender.

blender --background --factory-startup --python tools/art/build_blender.py
Existing .blend source is protected: use -- --replace only to regenerate it.
Rendering is deliberately separate: render_library.py preserves manual edits.
"""
import bpy
import json
import math
import random
import sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
RECIPE = json.loads((ROOT / 'art/recipes/nocturne-v1.json').read_text())
OUT = ROOT / 'art/source/blender/grove-library-v1.blend'
if OUT.exists() and '--replace' not in sys.argv:
    raise RuntimeError('Editable source already exists. Render it with render_library.py; use --replace only to discard manual edits.')
random.seed(RECIPE['seed'])

def rgba(h):
    # Artist palette is sRGB; shader inputs are linear.
    a = [int(h[i:i+2], 16) / 255 for i in (1, 3, 5)]
    return tuple(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in a) + (1,)

def material(name, color, metal=0, emission=0, texture=False):
    m = bpy.data.materials.new(name)
    m.diffuse_color = rgba(color)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = rgba(color)
    p.inputs['Roughness'].default_value = .44 if metal else .73
    p.inputs['Metallic'].default_value = metal
    p.inputs['Emission Color'].default_value = rgba(color)
    p.inputs['Emission Strength'].default_value = emission
    if texture:
        n = m.node_tree.nodes.new('ShaderNodeTexNoise')
        n.inputs['Scale'].default_value = 13
        n.inputs['Detail'].default_value = 3
        bump = m.node_tree.nodes.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value = .18
        bump.inputs['Distance'].default_value = .08
        m.node_tree.links.new(n.outputs['Fac'], bump.inputs['Height'])
        m.node_tree.links.new(bump.outputs['Normal'], p.inputs['Normal'])
    return m

M = {k: material(k, v, metal=.65 if k == 'brass' else 0, texture=k in ('stone','stoneDark','bark','moss')) for k,v in RECIPE['palette'].items()}
for k in ('cyan','gold','rose','red','green','blue','violet'):
    M[k+'Glow'] = material(k+' / living light', RECIPE['palette'][k], emission=1.7)
M['glass'] = material('Silver / mirror inlay', '#b8d5d3', metal=.82)
M['ink'] = material('Obsidian', '#102728', metal=.1)

def finish(obj, name, mat, smooth=True):
    obj.name = name
    obj.data.materials.append(M[mat] if isinstance(mat,str) else mat)
    if smooth and hasattr(obj.data, 'polygons'):
        for p in obj.data.polygons: p.use_smooth = True
    return obj

def sphere(name, loc, scale, mat, facets=False):
    if facets: bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1, location=loc)
    else: bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=1, location=loc)
    o=bpy.context.object; o.scale=scale
    return finish(o,name,mat,not facets)

def cube(name,loc,scale,mat,bevel=.08):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    o=bpy.context.object; o.dimensions=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        b=o.modifiers.new('Soft hand-carved edges','BEVEL'); b.width=bevel;b.segments=3
        o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return finish(o,name,mat,False)

def cylinder(name,loc,radius,depth,mat,vertices=48):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=loc)
    o=bpy.context.object
    b=o.modifiers.new('Worn rim','BEVEL');b.width=min(.04,depth*.2);b.segments=3
    o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return finish(o,name,mat)

def torus(name,loc,major,minor,mat,rotate=None):
    bpy.ops.mesh.primitive_torus_add(major_segments=64,minor_segments=10,location=loc,major_radius=major,minor_radius=minor)
    o=finish(bpy.context.object,name,mat)
    if rotate:o.rotation_euler=rotate
    return o

def stem(name, pts, radius, mat, taper=True):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=12;c.bevel_depth=radius;c.bevel_resolution=3
    sp=c.splines.new('BEZIER');sp.bezier_points.add(len(pts)-1)
    for i,(p,co) in enumerate(zip(sp.bezier_points,pts)):
        p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO';p.radius=1-.68*i/(len(pts)-1) if taper else 1
    o=bpy.data.objects.new(name,c);bpy.context.scene.collection.objects.link(o);c.materials.append(M[mat]);return o

def leaf(name,loc,size,mat,ang=0):
    o=sphere(name,loc,(size*.46,size,size*.11),mat)
    o.rotation_euler=(random.uniform(-.4,.4),random.uniform(-.4,.4),ang)
    return o

def soil():
    sphere('Moss island',(0,0,.03),(.74,.53,.14),'stoneDark',True)
    sphere('Velvet moss',(0,0,.11),(.64,.44,.095),'moss')
    for i in range(9):
        a=i*2.399;r=.42+random.random()*.2
        sphere('River pebble',(math.cos(a)*r,math.sin(a)*r*.6,.12),(.10,.075,.06),'stone')

def frond(x,y,z,size,mat='moss'):
    stem('Fern spine',[(x,y,z),(x+size*.12,y,z+size*.4),(x+size*.35,y,z+size*.55)],.009,mat)
    for i in range(1,6):
        t=i/6
        for side in (-1,1):
            o=leaf('Fern leaflet',(x+size*.22*t+side*size*.09,y+side*size*.07,z+size*.53*t),size*(.13-.055*t),mat,side*.9)
            o.rotation_euler.y=side*.3

def tree(awake):
    soil(); tint='leaf' if awake else 'dormant'; tip='leafLight' if awake else 'stone'
    trunk=[(0,0,.1),(-.07,0,.5),(.06,.015,.94),(-.06,.06,1.35)]
    stem('Twisted heartwood',trunk,.14,'bark')
    for i in range(6):
        a=i*math.tau/6
        stem('Exposed root',[(0,0,.24),(math.cos(a)*.24,math.sin(a)*.20,.12),(math.cos(a)*.54,math.sin(a)*.33,.12)],.075,'bark')
    clusters=[(-.43,0,1.12,.36),(.42,.06,1.22,.38),(-.16,.12,1.6,.39),(.22,-.12,1.6,.32),(0,-.23,1.24,.30)]
    for j,(x,y,z,r) in enumerate(clusters):
        stem('Reaching branch',[(0,0,.62),(x*.45,y*.5,z-.35),(x,y,z-.05)],.066,'bark')
        sphere('Sculpted canopy',(x,y,z),(r,r*.80,r*.52),tint,True)
        for i in range(100):
            a=random.random()*math.tau; q=random.random()**.5
            lx=x+math.cos(a)*r*q;ly=y+math.sin(a)*r*.8*q;lz=z+r*.52*math.sqrt(1-q*q)+.025
            leaf('Canopy leaf',(lx,ly,lz),random.uniform(.065,.105),tip if i%4==0 else tint,a)
    frond(-.44,-.25,.16,.34)
    if awake:
        for x,y,z in [(-.27,-.25,1.25),(.31,-.15,1.45),(.06,-.2,1.78)]: sphere('Seed of light',(x,y,z),(.032,.03,.04),'goldGlow')

def mushroom_cap(x,y,z,r,mat):
    verts=[];faces=[]; profile=[(0, .26),(.24,.25),(.51,.21),(.79,.12),(1,0),(.97,-.06),(.7,-.095),(.25,-.075),(0,-.065)]
    for rad,h in profile:
        for i in range(48):
            a=i*math.tau/48;verts.append((x+math.cos(a)*r*rad,y+math.sin(a)*r*rad,z+h*r))
    for j in range(len(profile)-1):
        for i in range(48): a=j*48+i;b=j*48+(i+1)%48;faces.append((a,b,b+48,a+48))
    mesh=bpy.data.meshes.new('Sculpted cap');mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new('Velvet cap',mesh);bpy.context.scene.collection.objects.link(o);finish(o,'Velvet cap',mat)
    torus('Luminous cap edge',(x,y,z-.015),r*.96,.014,'cyanGlow' if mat=='cyan' else 'dormant')
    for i in range(16):
        a=i*math.tau/16
        stem('Radial gill',[(x+math.cos(a)*r*.16,y+math.sin(a)*r*.16,z-.05),(x+math.cos(a)*r*.88,y+math.sin(a)*r*.88,z-.038)],.006,'ivory')

def mushroom(awake):
    soil()
    for j,(x,y,z,r) in enumerate([(-.19,.03,.99,.49),(.35,-.18,.57,.27),(-.39,-.29,.36,.20)]):
        stem('Ivory stalk',[(x+.06,y,.12),(x-.045,y,z*.6),(x,y,z)],r*.18,'ivory' if awake else 'dormant')
        mushroom_cap(x,y,z,r,'cyan' if awake else 'dormant')
        for i in range(8):
            a=i*2.399;q=.2+(i%3)*.22
            sphere('Pearl on cap',(x+math.cos(a)*r*q,y+math.sin(a)*r*q,z+r*(.27-.20*q*q)+.01),(r*.040,r*.040,r*.020),'cyanGlow' if awake else 'stone')
    frond(.39,.12,.17,.48)

def flower(awake):
    soil()
    stem('Curved stem',[(0,0,.14),(-.06,0,.59),(.03,0,.98)],.037,'moss')
    for s in (-1,1):
        o=leaf('Broad leaf',(s*.16,0,.48),.24,'leaf' if awake else 'dormant',s*1.3);o.rotation_euler.y=s*.4
    for tier in range(2):
        for i in range(6):
            a=i*math.tau/6+tier*.45;r=.21 if awake else .10
            o=sphere('Silken petal',(math.cos(a)*r,math.sin(a)*r,.98+tier*.045),(.115,.27 if awake else .13,.055 if awake else .16),'rose' if awake else 'dormant')
            o.rotation_euler=(0,0,a-math.pi/2)
    sphere('Golden pollen',(0,0,1.055),(.13,.13,.09),'goldGlow' if awake else 'stone')
    for i in range(9):
        a=i*2.399;sphere('Pollen bead',(math.cos(a)*.085,math.sin(a)*.085,1.12),(.018,.018,.023),'ivory')

def owl(awake):
    soil(); plum='bark' if awake else 'dormant'
    stem('Perch',[(-.55,-.03,.25),(0,0,.31),(.55,.03,.25)],.08,'bark',False)
    sphere('Round body',(0,0,.71),(.35,.25,.46),plum)
    sphere('Heart breast',(0,-.18,.68),(.25,.10,.32),'ivory' if awake else 'stone')
    sphere('Head',(0,-.015,1.10),(.37,.28,.30),plum)
    for side in (-1,1):
        o=sphere('Velvet wing',(side*.30,.01,.72),(.13,.22,.35),plum);o.rotation_euler.y=side*.22
        sphere('Eye feather disk',(side*.15,-.257,1.13),(.15,.058,.16),'ivory' if awake else 'stone')
        if awake:
            sphere('Amber eye',(side*.15,-.31,1.13),(.087,.04,.09),'goldGlow')
            sphere('Obsidian pupil',(side*.15,-.343,1.13),(.033,.012,.055),'ink')
            sphere('Eye catchlight',(side*.15-.017,-.355,1.16),(.016,.008,.017),'ivory')
        else:
            stem('Sleeping eyelid',[(side*.15-.085,-.315,1.13),(side*.15,-.325,1.10),(side*.15+.085,-.315,1.13)],.012,'ink',False)
        bpy.ops.mesh.primitive_cone_add(vertices=16,radius1=.12,radius2=0,depth=.26,location=(side*.26,0,1.40))
        finish(bpy.context.object,'Ear tuft',plum)
    bpy.ops.mesh.primitive_cone_add(vertices=4,radius1=.066,radius2=0,depth=.16,location=(0,-.32,.985),rotation=(math.pi/2,0,math.pi/4))
    finish(bpy.context.object,'Golden beak','brass')
    for row in range(3):
        for col in range(3-row):
            x=(col-(2-row)/2)*.105
            sphere('Breast feather',(x,-.274,.51+row*.11),(.030,.018,.046),plum)

def rock(variant):
    sphere('Weathered boulder',(-.09,0,.32),(.59,.40,.38),'stone',True)
    sphere('Broken shoulder',(.33,.04,.22),(.30,.33,.27),'stoneDark',True)
    sphere('Moss blanket',(-.1,.02,.53),(.46,.32,.17),'moss',True)
    for i in range(12):
        a=random.random()*math.tau;leaf('Moss leaf',(-.1+math.cos(a)*.35,math.sin(a)*.24,.61),.06,'leaf',a)
    frond(-.30,-.05,.62,.27)
    if variant: sphere('Amber mineral',(.30,-.28,.29),(.10,.06,.13),'gold',True)

def device_base(square=False):
    if square:
        cube('Carved stone plinth',(0,0,.05),(1.45,1.45,.18),'stoneDark',.17)
        cube('Moss stone face',(0,0,.15),(1.28,1.28,.12),'stone',.14)
    else:
        cylinder('Carved stone plinth',(0,0,.08),.74,.22,'stoneDark')
        cylinder('Moss stone face',(0,0,.20),.66,.11,'stone')
    torus('Antique brass rim',(0,0,.265),.58,.024,'brass')
    for i in range(8):
        a=i*math.pi/4
        o=cube('Engraved radial notch',(math.cos(a)*.50,math.sin(a)*.50,.272),(.025,.09,.012),'brass',.006);o.rotation_euler.z=a-math.pi/2

def mirror():
    device_base(True)
    cylinder('Dark compass inset',(0,0,.27),.44,.055,'ink')
    torus('Inner filigree',(0,0,.31),.40,.012,'brass')
    for i in range(4):
        a=i*math.pi/2;sphere('Setting pin',(math.cos(a)*.60,math.sin(a)*.60,.28),(.038,.038,.025),'gold')

def emitter():
    device_base()
    cylinder('Beacon cup',(0,0,.30),.36,.12,'brass')
    sphere('Luminous pearl',(0,0,.49),(.26,.26,.25),'goldGlow')
    for i in range(4):
        a=i*math.pi/2
        stem('Beacon prong',[(math.cos(a)*.31,math.sin(a)*.31,.28),(math.cos(a)*.30,math.sin(a)*.30,.54),(math.cos(a)*.20,math.sin(a)*.20,.66)],.036,'brass')

def splitter():
    device_base(True)
    o=cube('Prismatic quartz',(0,0,.36),(.62,.62,.16),'glass',.045);o.rotation_euler.z=math.pi/4
    o=cube('Jade core',(0,0,.45),(.29,.29,.07),'cyan',.025);o.rotation_euler.z=math.pi/4

def crystal(color):
    device_base()
    for i,(x,y,h,r) in enumerate([(0,0,.80,.26),(-.31,0,.45,.14),(.28,.05,.40,.13)]):
        bpy.ops.mesh.primitive_cone_add(vertices=6,radius1=r,radius2=r*.80,depth=h*.65,location=(x,y,.27+h*.325))
        finish(bpy.context.object,'Hexagonal crystal shaft',color,False)
        bpy.ops.mesh.primitive_cone_add(vertices=6,radius1=r*.8,radius2=0,depth=h*.35,location=(x,y,.27+h*.825))
        finish(bpy.context.object,'Crystal crown',color,False)
    torus('Crystal halo setting',(0,0,.3),.34,.018,'brass')

def gate(color):
    device_base(True)
    for side in (-1,1):
        cube('Gate pier',(side*.39,0,.39),(.17,1.02,.35),'stone',.035)
        for y in (-.38,.38):sphere('Gate inset',(side*.39,y,.59),(.046,.046,.026),color+'Glow')
    for y in (-.36,0,.36):
        cube('Stained glass band',(0,y,.40),(.65,.085,.12),color,.02)

def portal(color):
    device_base()
    cylinder('Portal well',(0,0,.29),.47,.045,'ink')
    torus('Living portal ring',(0,0,.34),.40,.047,color+'Glow')
    torus('Outer carved ring',(0,0,.3),.50,.045,'brass')
    for i in range(6):
        a=i*math.tau/6
        o=cube('Rune stone',(math.cos(a)*.54,math.sin(a)*.54,.36),(.14,.16,.11),'stone',.025);o.rotation_euler.z=a
        sphere('Rune',(math.cos(a)*.54,math.sin(a)*.54,.42),(.024,.024,.016),color+'Glow')

def setup_scene(name,top=False):
    scene=bpy.data.scenes.new(name)
    bpy.context.window.scene=scene
    scene.render.engine='CYCLES';scene.cycles.samples=RECIPE['samples'];scene.cycles.use_denoising=True
    scene.render.resolution_x=scene.render.resolution_y=RECIPE['spriteSize'];scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True
    scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
    world=bpy.data.worlds.new(name+' / atmosphere');world.use_nodes=True
    world.node_tree.nodes['Background'].inputs[0].default_value=(.18,.27,.3,1)
    world.node_tree.nodes['Background'].inputs[1].default_value=.24;scene.world=world
    camdata=bpy.data.cameras.new('Orthographic sprite camera');cam=bpy.data.objects.new('Orthographic sprite camera',camdata);scene.collection.objects.link(cam)
    cam.location=(0,0,7) if top else (0,-6.8,5.0)
    target=Vector((0,0,0 if top else .82));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();camdata.type='ORTHO';camdata.ortho_scale=2.12 if top else 2.32;scene.camera=cam
    for name2,loc,energy,size,color in [('Moon softbox',(-3,-4,6),370,4.0,(.78,.89,1)),('Warm canopy',(2,-1,4),210,3,(1,.80,.49)),('Jade rim',(1,3,4),430,2.5,(.37,1,.82))]:
        d=bpy.data.lights.new(name2,'AREA');d.energy=energy;d.shape='DISK';d.size=size;d.color=color;o=bpy.data.objects.new(name2,d);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,.5))-o.location).to_track_quat('-Z','Y').to_euler()
    scene['asset_id']=name;scene['output_name']=name.replace('.','-')+'-v1.png';scene['authoring_recipe']='art/recipes/nocturne-v1.json';scene['description']='Original Glintgrove asset. Objects and materials are editable; render with tools/art/render_library.py.'
    return scene

builders={}
for typ,fn in [('tree',tree),('mushroom',mushroom),('flower',flower),('owl',owl)]:
    for state in ('dormant','awake'):builders[typ+'.'+state]=(lambda f=fn,a=state=='awake':f(a),False)
builders.update({'rock':(lambda:rock(0),False),'rock.alt':(lambda:rock(1),False),'mirror':(mirror,True),'emitter':(emitter,True),'splitter':(splitter,True)})
for ch,col in [('r','red'),('g','green'),('b','blue')]:
    builders['crystal.'+ch]=(lambda c=col:crystal(c),False)
    builders['gate.'+ch]=(lambda c=col:gate(c),True)
builders['portal.violet']=(lambda:portal('violet'),True)
builders['portal.gold']=(lambda:portal('gold'),True)

old=list(bpy.data.scenes)
for name,(fn,top) in builders.items():
    random.seed(RECIPE['seed']+sum(ord(c) for c in name.split('.')[0]))
    setup_scene(name,top);fn();print('AUTHORED',name,flush=True)
for s in old:bpy.data.scenes.remove(s)
bpy.context.window.scene=bpy.data.scenes['tree.awake']
OUT.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT))
print('SAVED EDITABLE LIBRARY',OUT,flush=True)
