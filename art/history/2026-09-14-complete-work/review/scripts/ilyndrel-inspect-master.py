import bpy,json
print('INDEPENDENT_INSPECTION',json.dumps({
 'scenes':sorted(s.name for s in bpy.data.scenes),
 'libraries':len(bpy.data.libraries),
 'fonts':len(bpy.data.fonts),
 'textObjects':sum(o.type=='FONT' for o in bpy.data.objects),
 'linkedObjects':sum(o.library is not None for o in bpy.data.objects),
 'textureImageNodes':sum(n.type in {'TEX_IMAGE','TEX_ENVIRONMENT'} for m in bpy.data.materials if m.use_nodes for n in m.node_tree.nodes),
 'images':[[i.name,i.source] for i in bpy.data.images]
}))
