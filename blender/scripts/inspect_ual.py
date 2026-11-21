import bpy, sys, json
argv = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=argv[0])
arms = [o for o in bpy.data.objects if o.type == 'ARMATURE']
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
out = {'armatures': [a.name for a in arms], 'meshes': [(m.name, len(m.data.vertices)) for m in meshes]}
if arms:
    a = arms[0]
    out['bones'] = [b.name for b in a.data.bones]
    out['height'] = max(v.co.z for m in meshes for v in m.data.vertices) if meshes else None
out['actions'] = sorted((ac.name, round(ac.frame_range[1]-ac.frame_range[0])) for ac in bpy.data.actions)
print('JSON' + json.dumps(out))
