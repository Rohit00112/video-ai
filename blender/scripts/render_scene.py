"""
Render one shot from a JSON spec using the reusable cast (assets/characters/cast.blend).

Usage:
  Blender -b --factory-startup --python blender/scripts/render_scene.py -- <spec.json> [--stills 1,40,80]

Spec:
{
  "frames": 90, "fps": 30, "set": "street", "out": "public/footage/x/scene-01.mp4",
  "resolution": [1080, 1920], "samples": 16,
  "camera": {"from": {"loc": [0,-3.6,0.7], "look": [0,0,0.55], "lens": 50},
             "to":   {"loc": [0,-3.0,0.7], "look": [0,0,0.55], "lens": 50}},
  "chars": [
    {"id": "alex", "x": 0, "y": 0, "face": 0,
     "track": [{"action": "Idle_Talking_Loop", "start": 0}, {"action": "G_point", "start": 40},
               {"action": "Walk_Loop", "start": 60, "hold": 12}],      # hold = freeze at that action frame
     "path": [[0, 0, 0, 0], [60, 0.8, 0, 90]],                          # [frame, x, y, facingDeg] (eased)
     "visemes": "XXXBBCCDDA...",                                         # per-frame mouth shape A–H/X, optional
     "emph": [12, 40],                                                   # brow-raise frames, optional
     "blink": true}
  ]
}
Facing: 0 = toward camera, 90 = character's left (screen right), -90 = screen left.
"""
import json
import math
import os
import random
import shutil
import subprocess
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lib'))
import toonchar as tc  # noqa: E402
import toonsets as ts  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CAST = os.path.join(ROOT, 'assets/characters/cast.blend')
BLEND = 6  # frames of cross-fade between actions


def argv():
    a = sys.argv[sys.argv.index('--') + 1:]
    spec = json.load(open(a[0]))
    stills = None
    if '--stills' in a:
        stills = [int(x) for x in a[a.index('--stills') + 1].split(',')]
    return spec, stills


def children(rig):
    return [o for o in bpy.data.objects if o.parent == rig]


def remove_rig(rig):
    for o in children(rig):
        bpy.data.objects.remove(o, do_unlink=True)
    bpy.data.objects.remove(rig, do_unlink=True)


def ease(t):
    return t * t * (3 - 2 * t)


# ----------------------------------------------------------------------------- animation
def build_nla(rig, track, frames):
    ad = rig.animation_data_create()
    ad.action = None
    for t in list(ad.nla_tracks):
        ad.nla_tracks.remove(t)
    entries = sorted(track, key=lambda e: e['start'])
    for i, e in enumerate(entries):
        if e.get('freeze') and i > 0:
            p = entries[i - 1]
            pac = bpy.data.actions[p['action']]
            pa0, pa1 = pac.frame_range
            plen = max(1.0, pa1 - pa0)
            base_hold = float(p.get('hold', p.get('offset', 0)))
            elapsed = 0.0 if 'hold' in p else (e['start'] - p['start'])
            e = dict(e, action=p['action'], hold=(base_hold + elapsed) % plen, _noblend=True)
            entries[i] = e
        ac = bpy.data.actions[e['action']]
        start = int(e['start']) + 1
        nxt = int(entries[i + 1]['start']) + 1 if i + 1 < len(entries) else frames + 1
        end = min(frames + 1, nxt + (BLEND if i + 1 < len(entries) else 0))
        span = max(1, end - start)
        tr = ad.nla_tracks.new()
        tr.name = f'{i:02d}_{e["action"]}'
        st = tr.strips.new(e['action'], start, ac)
        if hasattr(st, 'action_slot') and ac.slots:
            st.action_slot = ac.slots[0]
        a0, a1 = ac.frame_range
        if 'hold' in e:  # frozen pose: squeeze 1 action frame across the whole span
            h = a0 + float(e['hold'])
            st.action_frame_start = h
            st.action_frame_end = h + 0.01
            st.scale = span / 0.01
        else:
            offset = float(e.get('offset', 0))
            if offset:
                st.action_frame_start = a0 + offset
            length = st.action_frame_end - st.action_frame_start
            st.repeat = max(0.01, span / max(1.0, length))
        st.frame_end = start + span
        st.blend_type = 'REPLACE'
        st.extrapolation = 'HOLD_FORWARD' if i + 1 == len(entries) else 'NOTHING'
        if i == 0:
            st.extrapolation = 'HOLD' if len(entries) == 1 else 'HOLD'
        if i > 0 and not e.get('_noblend'):
            st.blend_in = min(BLEND, span - 1)


def key_path(rig, path, base):
    rig.rotation_mode = 'XYZ'
    if not path:
        rig.location = (base[0], base[1], 0)
        rig.rotation_euler = (0, 0, math.radians(base[2]))
        return
    for f, x, y, face in path:
        rig.location = (x, y, 0)
        rig.rotation_euler = (0, 0, math.radians(face))
        rig.keyframe_insert('location', frame=int(f) + 1)
        rig.keyframe_insert('rotation_euler', frame=int(f) + 1)
    for fc in tc.iter_fcurves(rig.animation_data.action):
        for kp in fc.keyframe_points:
            kp.interpolation = 'LINEAR'  # constant walking speed (no foot sliding from easing)


def face_parts(rig, tag):
    return [o for o in children(rig) if o.get(tag)]


def key_face(rig, visemes, frames, blink, seed, blink_from=0, blink_until=None, emph=None):
    eyes = face_parts(rig, 'blink') + [o for o in children(rig) if '_hl' in o.name]
    if visemes:
        groups = {}
        for o in children(rig):
            if o.get('viseme'):
                groups.setdefault(o['viseme'], []).append(o)
        prev = None
        for f in range(min(frames, len(visemes))):
            v = visemes[f] if visemes[f] in groups else 'X'
            if v == prev:
                continue
            for letter, objs in groups.items():
                if prev is None or letter in (v, prev):
                    for o in objs:
                        o.scale = (1, 1, 1) if letter == v else (0, 0, 0)
                        o.keyframe_insert('scale', frame=f + 1)
            prev = v
        for objs in groups.values():
            for o in objs:
                if o.animation_data and o.animation_data.action:
                    for fc in tc.iter_fcurves(o.animation_data.action):
                        for kp in fc.keyframe_points:
                            kp.interpolation = 'CONSTANT'
    if emph:
        brows = [o for o in children(rig) if '_brow' in o.name]
        for o in brows:
            z0 = o.location.z
            last = -100
            for f in sorted(emph):
                if f - last < 24:
                    continue
                for df, dz in ((-3, 0.0), (1, 0.016), (12, 0.016), (19, 0.0)):
                    o.location.z = z0 + dz
                    o.keyframe_insert('location', index=2, frame=max(1, f + df))
                last = f
            o.location.z = z0
    if blink and eyes:
        rnd = random.Random(seed)
        f = blink_from + rnd.randint(10, 40)
        end = frames if blink_until is None else min(frames, blink_until - 5)
        while f < end:
            for o in eyes:
                for df, s in ((-1, 1.0), (0, 0.45), (1, 0.08), (2, 0.08), (3, 0.6), (4, 1.0)):
                    o.scale = (1, 1, s)
                    o.keyframe_insert('scale', index=2, frame=max(1, f + df))
            f += rnd.randint(70, 130)


def add_shadow(rig):
    mat = bpy.data.materials.get('ContactShadow')
    if not mat:
        mat = bpy.data.materials.new('ContactShadow')
        mat.use_nodes = True
        nt = mat.node_tree
        nt.nodes.clear()
        out = nt.nodes.new('ShaderNodeOutputMaterial')
        mix = nt.nodes.new('ShaderNodeMixShader')
        tr = nt.nodes.new('ShaderNodeBsdfTransparent')
        em = nt.nodes.new('ShaderNodeEmission')
        em.inputs['Color'].default_value = (0.12, 0.06, 0.03, 1)
        mix.inputs['Fac'].default_value = 0.55
        nt.links.new(tr.outputs[0], mix.inputs[1])
        nt.links.new(em.outputs[0], mix.inputs[2])
        nt.links.new(mix.outputs[0], out.inputs[0])
        if hasattr(mat, 'surface_render_method'):
            mat.surface_render_method = 'BLENDED'
        else:
            mat.blend_method = 'BLEND'
    d = tc.ellipsoid(f'{rig.name}_shadow', mat, (0.26, 0.2, 0.004), (0, 0, 0.006), seg=24, rings=6)
    d.parent = rig
    d.matrix_parent_inverse.identity()
    d.location = (0, 0, 0.006)


def place_camera(cam, spec, frames):
    c = spec.get('camera') or {}
    a = c.get('from') or {'loc': [0, -5.4, 0.85], 'look': [0, 0, 0.6], 'lens': 70}
    b = c.get('to') or a
    n = max(1, frames - 1)
    for f in range(0, frames, 3) if a != b else [0]:
        t = ease(f / n)
        loc = Vector(a['loc']).lerp(Vector(b['loc']), t)
        look = Vector(a['look']).lerp(Vector(b['look']), t)
        cam.location = loc
        cam.rotation_mode = 'QUATERNION'
        cam.rotation_quaternion = (look - loc).to_track_quat('-Z', 'Y')
        cam.data.lens = a.get('lens', 50) + (b.get('lens', 50) - a.get('lens', 50)) * t
        if a != b:
            cam.keyframe_insert('location', frame=f + 1)
            cam.keyframe_insert('rotation_quaternion', frame=f + 1)
            cam.data.keyframe_insert('lens', frame=f + 1)


# ----------------------------------------------------------------------------- main
def main():
    spec, stills = argv()
    bpy.ops.wm.open_mainfile(filepath=CAST)
    sc = bpy.context.scene
    frames = int(spec['frames'])
    sc.render.fps = int(spec.get('fps', 30))
    sc.frame_start, sc.frame_end = 1, frames
    rx, ry = spec.get('resolution', [1080, 1920])
    sc.render.resolution_x, sc.render.resolution_y = rx, ry
    sc.render.resolution_percentage = 100
    if hasattr(sc, 'eevee'):
        sc.eevee.taa_render_samples = int(spec.get('samples', 16))
    sc.render.film_transparent = False
    sc.view_settings.view_transform = 'Standard'
    for n in ('Backdrop',):
        if n in bpy.data.objects:
            bpy.data.objects.remove(bpy.data.objects[n], do_unlink=True)
    ts.build_set(spec.get('set', 'street'))

    wanted = {c['id'] for c in spec['chars']}
    for o in [o for o in bpy.data.objects if o.type == 'ARMATURE']:
        if o.name.replace('RIG_', '') not in wanted:
            remove_rig(o)
    for i, c in enumerate(spec['chars']):
        rig = bpy.data.objects['RIG_' + c['id']]
        rig.data.pose_position = 'POSE'
        rig.animation_data_create()
        rig.animation_data.action = None
        build_nla(rig, c.get('track') or [{'action': 'Idle_Loop', 'start': 0}], frames)
        key_path(rig, c.get('path'), (c.get('x', 0), c.get('y', 0), c.get('face', 0)))  # after NLA (active action)
        key_face(rig, c.get('visemes'), frames, c.get('blink', True), seed=i * 13 + 5,
                 blink_from=int(c.get('blinkFrom', 0)), blink_until=c.get('blinkUntil'), emph=c.get('emph'))
        if c.get('scale'):
            rig.scale = (c['scale'],) * 3
        add_shadow(rig)

    place_camera(sc.camera, spec, frames)

    out = os.path.join(ROOT, spec['out'])
    frame_dir = os.path.splitext(out)[0] + '_frames'
    os.makedirs(frame_dir, exist_ok=True)
    sc.render.image_settings.file_format = 'PNG'
    if stills:
        for f in stills:
            sc.frame_set(f)
            sc.render.filepath = os.path.join(frame_dir, f'still_{f:04d}.png')
            bpy.ops.render.render(write_still=True)
            print('STILL', sc.render.filepath)
        return
    for f in os.listdir(frame_dir):
        os.remove(os.path.join(frame_dir, f))
    sc.render.filepath = os.path.join(frame_dir, 'f_')
    bpy.ops.render.render(animation=True)
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-framerate', str(sc.render.fps), '-i',
                    os.path.join(frame_dir, 'f_%04d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
                    '-crf', '16', '-preset', 'medium', out], check=True)
    if not spec.get('keep_frames'):
        shutil.rmtree(frame_dir)
    print('SHOT', out)


main()
