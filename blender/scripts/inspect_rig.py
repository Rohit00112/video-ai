import bpy, sys
argv = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=argv[0])
rig = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
print('RIG', rig.name, 'loc', tuple(round(v,3) for v in rig.location), 'rot', tuple(round(v,3) for v in rig.rotation_euler), 'scale', tuple(round(v,3) for v in rig.scale))
mw = rig.matrix_world
for b in rig.data.bones:
    if any(k in b.name for k in ('f_','thumb','toe')): continue
    h = mw @ b.head_local; t = mw @ b.tail_local
    print('B', b.name, 'parent', b.parent.name if b.parent else None, 'conn', b.use_connect, 'head', tuple(round(v,3) for v in h), 'tail', tuple(round(v,3) for v in t), 'len', round(b.length,3))
for ac in bpy.data.actions:
    if ac.name in ('Idle_Loop','Walk_Loop'):
        paths = sorted(set(fc.data_path for fc in ac.fcurves if 'location' in fc.data_path))
        print('ACT', ac.name, ac.frame_range[:], 'loc curves', paths)
        for fc in ac.fcurves:
            if fc.data_path.endswith('location') and ('hips' in fc.data_path or 'root' in fc.data_path):
                vals=[k.co[1] for k in fc.keyframe_points]
                print('  ', fc.data_path, fc.array_index, round(min(vals),3), round(max(vals),3))
