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
import toonprops as tp  # noqa: E402
from mathutils import Euler, Matrix  # noqa: E402

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
    layers = [e for e in track if e.get('layer')]
    entries = sorted([e for e in track if not e.get('layer')], key=lambda e: e['start'])
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
            speed = float(e.get('speed', 1.0))
            st.scale = 1.0 / max(0.01, speed)
            length = (st.action_frame_end - st.action_frame_start) * st.scale
            st.repeat = max(0.01, span / max(1.0, length))
        st.frame_end = start + span
        st.blend_type = 'REPLACE'
        st.extrapolation = 'HOLD_FORWARD' if i + 1 == len(entries) else 'NOTHING'
        if i == 0:
            st.extrapolation = 'HOLD' if len(entries) == 1 else 'HOLD'
        if i > 0 and not e.get('_noblend'):
            st.blend_in = min(BLEND, span - 1)
    for j, e in enumerate(layers):  # arms-only overlays (e.g. G_carry) on top of the base motion
        ac = bpy.data.actions[e['action']]
        start = int(e['start']) + 1
        end = min(frames + 1, int(e.get('end', frames)) + 1)
        tr = ad.nla_tracks.new()
        tr.name = f'L{j:02d}_{e["action"]}'
        st = tr.strips.new(e['action'], start, ac)
        if hasattr(st, 'action_slot') and ac.slots:
            st.action_slot = ac.slots[0]
        length = max(1.0, st.action_frame_end - st.action_frame_start)
        st.repeat = max(0.01, (end - start) / length)
        st.frame_end = end
        st.blend_type = 'REPLACE'
        st.extrapolation = 'NOTHING'
        st.blend_in = BLEND if start > 1 else 0
        st.blend_out = BLEND if end <= frames else 0


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


def key_face(rig, visemes, frames, blink, seed, blink_from=0, blink_until=None, emph=None, sleep_from=None):
    eyes = face_parts(rig, 'blink') + [o for o in children(rig) if '_hl' in o.name]
    max_viseme_frame = int(sleep_from) if sleep_from is not None else frames
    if visemes:
        groups = {}
        for o in children(rig):
            if o.get('viseme'):
                groups.setdefault(o['viseme'], []).append(o)
        prev = None
        for f in range(min(max_viseme_frame, len(visemes))):
            v = visemes[f] if visemes[f] in groups else 'X'
            if v == prev:
                continue
            for letter, objs in groups.items():
                if prev is None or letter in (v, prev):
                    for o in objs:
                        o.scale = (1, 1, 1) if letter == v else (0, 0, 0)
                        o.keyframe_insert('scale', frame=f + 1)
            prev = v
        if sleep_from is not None and max_viseme_frame < frames:
            for letter, objs in groups.items():
                for o in objs:
                    o.scale = (1, 1, 1) if letter == 'X' else (0, 0, 0)
                    o.keyframe_insert('scale', frame=max_viseme_frame + 1)
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
        if sleep_from is not None:
            end = min(end, int(sleep_from) - 5)
        while f < end:
            for o in eyes:
                for df, s in ((-1, 1.0), (0, 0.45), (1, 0.08), (2, 0.08), (3, 0.6), (4, 1.0)):
                    o.scale = (1, 1, s)
                    o.keyframe_insert('scale', index=2, frame=max(1, f + df))
            f += rnd.randint(70, 130)
    if sleep_from is not None and eyes:
        sf = int(sleep_from)
        for o in eyes:
            o.scale = (1, 1, 1.0)
            o.keyframe_insert('scale', index=2, frame=max(1, sf - 2))
            o.scale = (1, 1, 0.08)
            o.keyframe_insert('scale', index=2, frame=sf + 3)
            o.keyframe_insert('scale', index=2, frame=frames + 1)


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



# ----------------------------------------------------------------------------- props
def _const(obj):
    if obj.animation_data and obj.animation_data.action:
        for fc in tc.iter_fcurves(obj.animation_data.action):
            for kp in fc.keyframe_points:
                kp.interpolation = 'CONSTANT'


def _key_visible(root, show, frames, base_scale):
    """Visibility window [f0, f1) via constant scale keys on the prop root."""
    f0, f1 = int(show[0]), int(show[1]) if len(show) > 1 and show[1] is not None else frames + 5
    root.scale = (0, 0, 0) if f0 > 0 else base_scale
    root.keyframe_insert('scale', frame=1)
    if f0 > 0:
        root.scale = base_scale
        root.keyframe_insert('scale', frame=f0 + 1)
    if f1 < frames:
        root.scale = (0, 0, 0)
        root.keyframe_insert('scale', frame=f1 + 1)
    _const(root)


def _world(loc, rot, scale=1.0):
    return Matrix.Translation(Vector(loc)) @ Euler([math.radians(r) for r in rot]).to_matrix().to_4x4() @ Matrix.Scale(scale, 4)


def _attach_holder(holder, rig, bone, world):
    pb = rig.pose.bones[bone]
    holder.parent = rig
    holder.parent_type = 'BONE'
    holder.parent_bone = bone
    holder.matrix_parent_inverse.identity()
    bone_tail = rig.matrix_world @ pb.matrix @ Matrix.Translation((0, pb.bone.length, 0))
    holder.matrix_basis = bone_tail.inverted() @ world


def _animate(root, anim, frames):
    kind = anim.get('type')
    until = int(anim.get('until', frames))  # freeze: motion stops (holds) here
    start = int(anim.get('from', 0))
    if kind == 'flap':
        wings = [o for o in bpy.data.objects if o.parent == root and '_wing' in o.name]
        for f in range(0, min(frames, until + 1), 2):
            for w in wings:
                sgn = 1 if w.name.endswith('L') else -1
                w.rotation_euler = (sgn * 0.9 * math.sin(f * 0.9), 0, 0)
                w.keyframe_insert('rotation_euler', index=0, frame=f + 1)
    elif kind in ('fall', 'drift'):
        rnd = random.Random(len(root.name))
        speed = anim.get('speed', 0.35 if kind == 'fall' else 0.08)
        for c in [o for o in bpy.data.objects if o.parent == root]:
            p0 = c.location.copy()
            r0 = c.rotation_euler.copy()
            ph = rnd.uniform(0, 6.28)
            sp = speed * rnd.uniform(0.7, 1.3)
            for f in list(range(start, min(frames, until + 1), 3)) + [min(frames, until)]:
                t = (f - start) / 30.0
                c.location = (p0.x + 0.04 * math.sin(t * 3 + ph), p0.y, max(0.01, p0.z - sp * t))
                c.rotation_euler = (r0.x + t * 4, r0.y + t * 2.5, r0.z)
                c.keyframe_insert('location', frame=f + 1)
                c.keyframe_insert('rotation_euler', frame=f + 1)
    elif kind == 'flicker':
        flames = [o for o in bpy.data.objects if o.parent == root and '_flame' in o.name]
        rnd = random.Random(7)
        for f in range(0, min(frames, until + 1), 2):
            for o in flames:
                k = 1 + 0.18 * math.sin(f * 1.3 + rnd.random()) + 0.08 * rnd.uniform(-1, 1)
                o.scale = (1 / k ** 0.3, 1 / k ** 0.3, k)
                o.keyframe_insert('scale', frame=f + 1)
    elif kind == 'blink':  # traffic light: cycle R → G → Y
        lamps = {o.name[-1]: o for o in bpy.data.objects if o.parent == root and '_lamp' in o.name}
        period = int(anim.get('period', 40))
        seq = ['R', 'G', 'Y']
        for f in range(0, frames + period, max(1, period // 2)):
            on = seq[(f // period) % 3] if anim.get('mode') != 'yellow' else ('Y' if (f // (period // 2)) % 2 == 0 else None)
            for c, o in lamps.items():
                o.scale = (1, 1, 1) if c == on else (0, 0, 0)
                o.keyframe_insert('scale', frame=f + 1)
        _const_children = [o for o in lamps.values()]
        for o in _const_children:
            _const(o)
    elif kind == 'wobble':
        for f in range(0, min(frames, until + 1), 2):
            root.rotation_euler = (anim.get('amp', 0.05) * math.sin(f * 0.21), anim.get('amp', 0.05) * 0.7 * math.sin(f * 0.17 + 1), 0)
            root.keyframe_insert('rotation_euler', frame=f + 1)
    elif kind == 'tumble':
        for f in range(0, min(frames, until + 1), 2):
            root.rotation_euler = (f * 0.11, math.sin(f * 0.09) * 0.8, f * 0.05)
            root.keyframe_insert('rotation_euler', frame=f + 1)
    elif kind == 'flutter':  # feather: rock side to side while falling (use with a path)
        for f in range(0, min(frames, until + 1), 2):
            root.rotation_euler = (0, 0.6 * math.sin(f * 0.16), 0.3 * math.sin(f * 0.08))
            root.keyframe_insert('rotation_euler', frame=f + 1)
    elif kind == 'bob':
        for f in range(0, min(frames, until + 1), 3):
            root.location = (0, 0, anim.get('amp', 0.03) * math.sin(f * 0.12 + anim.get('phase', 0)))
            root.keyframe_insert('location', index=2, frame=f + 1)
    elif kind == 'spin':
        for f in range(0, min(frames, until + 1), 3):
            root.rotation_euler = (0, 0, f * anim.get('rate', 0.15))
            root.keyframe_insert('rotation_euler', index=2, frame=f + 1)


def build_props(spec, frames):
    sc = bpy.context.scene
    for i, p in enumerate(spec.get('props', [])):
        pid = p.get('id', f'p{i}')
        hold = p.get('hold')
        prm = dict(p.get('params') or {})
        if 'fromProp' in prm:  # e.g. tea stream starting at the held teapot's spout tip
            bpy.context.view_layer.update()
            src = bpy.data.objects[f"{prm['fromProp']}_main"]
            prm['a'] = tuple(src.matrix_world @ Vector(prm.get('fromLocal', (0, 0, 0))))
            if prm.get('cupOn'):  # slide the table's cup set under the spout; stream falls straight in
                ax, ay = prm['a'][0], prm['a'][1]
                for part in ('cup', 'saucer', 'tea'):
                    o = bpy.data.objects.get(f"{prm['cupOn']}_main_{part}")
                    if o:
                        mw = o.matrix_world.copy()
                        mw.translation.x, mw.translation.y = ax - 0.01, ay
                        o.matrix_world = mw
                prm['b'] = (ax - 0.01, ay, 0.495)
            p = dict(p, params=prm)
        copies = []
        if hold and int(hold.get('from', 0)) > 0 and p.get('loc') is not None:
            copies.append(('rest', [0, int(hold['from'])]))
        show = p.get('show') or [0, None]
        if hold:
            show = [max(int(hold.get('from', 0)), int(show[0] or 0)), show[1] if len(show) > 1 else None]
        copies.append(('main', show))
        for tag, show in copies:
            holder = bpy.data.objects.new(f'{pid}_{tag}_holder', None)
            sc.collection.objects.link(holder)
            root = tp.build(p['type'], f'{pid}_{tag}', p.get('params'))
            root.parent = holder
            s = p.get('scale', 1.0)
            if tag == 'main' and hold:
                rig = bpy.data.objects['RIG_' + hold['char']]
                f_at = int(hold.get('from', 0))
                sc.frame_set(f_at + 1)
                bone = hold.get('bone', 'DEF-hand.R')
                pb = rig.pose.bones[bone]
                tail = rig.matrix_world @ pb.matrix @ Vector((0, pb.bone.length, 0))
                base = tail
                if hold.get('onHead'):  # sit on top of the head (hair/hat tops ignored: hats float on the skull)
                    head = bpy.data.objects[f"{hold['char']}_head"]
                    bpy.context.view_layer.update()
                    zs = [(head.matrix_world @ Vector(c)).z for c in head.bound_box]
                    hc = head.matrix_world.translation
                    base = Vector((hc.x, hc.y, hc.z + (max(zs) - hc.z) * hold.get('onHead', 1.0)))
                world = _world(base + Vector(hold.get('offset', (0, 0, 0))), hold.get('rot', p.get('rot', (0, 0, 0))), s)
                if hold.get('aimMouth'):  # point the prop's -X axis (e.g. slice tip) at the holder's mouth
                    hb = rig.pose.bones['DEF-head']
                    mouth = rig.matrix_world @ (hb.head + Vector((0, -0.25, 0.09)))
                    q = (mouth - world.translation).to_track_quat('-X', 'Z')
                    world = Matrix.Translation(world.translation) @ q.to_matrix().to_4x4() @ Matrix.Scale(s, 4)
                _attach_holder(holder, rig, bone, world)
            else:
                holder.matrix_world = _world(p.get('loc', (0, 0, 0)), p.get('rot', (0, 0, 0)), s)
            if p.get('path') and not hold:
                for f, x, y, z in p['path']:
                    holder.location = (x, y, z)
                    holder.keyframe_insert('location', frame=int(f) + 1)
                for fc in tc.iter_fcurves(holder.animation_data.action):
                    for kp in fc.keyframe_points:
                        kp.interpolation = 'LINEAR'
            if p.get('anim'):
                _animate(root, p['anim'], frames)
            _key_visible(root, show, frames, (1, 1, 1))
    sc.frame_set(1)


# ----------------------------------------------------------------------------- environment
GLOW_KEYS = ('glass', 'bulb', 'flame', 'doorglow', 'prop_tl#', 'ovenglass', 'winsky', 'banner', 'candle')


def build_set_anim(spec, frames):
    """Deterministic set-piece physics: sliding gates, falling beams, ticking clocks.

    Entries are {name, type, ...} with frame numbers already resolved by produce-blender.
    Everything is keyframed against the scene clock, so renders are reproducible and
    seek-safe (no rigid-body cache, no simulation dependencies between shots).
    """
    for a in spec.get('setAnim', []):
        root = bpy.data.objects.get(a['name'])
        if not root:
            print('SETANIM: missing object', a['name'])
            continue
        kind = a.get('type', 'slide')
        f0 = max(1, int(a.get('start', 0)) + 1)
        f1 = max(f0 + 1, min(frames + 1, int(a.get('end', frames)) + 1))
        if kind == 'slide':
            axis = {'x': 0, 'y': 1, 'z': 2}[a.get('axis', 'x')]
            v0, v1 = float(a.get('from', 0)), float(a.get('to', 0))
            for f, t in ((f0, 0.0), (f1, 1.0)):
                if a.get('ease', 'inOut') == 'inOut':
                    t = t * t * (3 - 2 * t)
                root.location[axis] = v0 + (v1 - v0) * t
                root.keyframe_insert('location', index=axis, frame=f)
            for fc in tc.iter_fcurves(root.animation_data.action):
                for kp in fc.keyframe_points:
                    kp.interpolation = 'BEZIER' if a.get('ease', 'inOut') == 'inOut' else 'LINEAR'
        elif kind == 'drop':
            # z = z0 + v0*t - 0.5*g*t^2, with damped bounces once the floor is reached.
            g = float(a.get('gravity', 0.018))
            z0, floor = float(a.get('from', 2.5)), float(a.get('to', 0.25))
            bounce = max(0.0, min(0.8, float(a.get('bounce', 0.35))))
            impact = math.sqrt(max(0.0, 2 * (z0 - floor) / g))
            t = 0.0
            bounced = 0
            while t <= f1 - f0:
                if t <= impact:
                    z = z0 - 0.5 * g * t * t
                else:
                    # Successive parabolas with geometric restitution after each impact.
                    z = floor
                    remaining = t - impact
                    for k in range(3):
                        v = g * impact * (bounce ** (k + 1))
                        dur = 2 * v / g
                        if remaining <= dur:
                            z = floor + v * remaining - 0.5 * g * remaining * remaining
                            break
                        remaining -= dur
                root.location.z = max(floor, z)
                root.keyframe_insert('location', index=2, frame=int(f0 + t))
                if t > impact:
                    bounced = min(2, int((t - impact) / max(0.001, 2 * impact)) + 1)
                t += 2
            for fc in tc.iter_fcurves(root.animation_data.action):
                for kp in fc.keyframe_points:
                    kp.interpolation = 'LINEAR'
        elif kind == 'spin':
            axis = {'x': 0, 'y': 1, 'z': 2}[a.get('axis', 'z')]
            root.rotation_mode = 'XYZ'
            for f, t in ((f0, 0.0), (f1, 1.0)):
                root.rotation_euler[axis] = float(a.get('from', 0)) + (float(a.get('to', 6.28)) - float(a.get('from', 0))) * t
                root.keyframe_insert('rotation_euler', index=axis, frame=f)
        elif kind == 'scale':
            v0, v1 = float(a.get('from', 0)), float(a.get('to', 1))
            for f, v in ((f0, v0), (f1, v1)):
                root.scale = (v, v, v)
                root.keyframe_insert('scale', frame=f)
        elif kind == 'slowTick':
            step = max(2, int(a.get('step', 8)))
            for obj in bpy.data.objects:
                if obj.parent != root or not obj.name.endswith('_pivot'):
                    continue
                rate = 0.075 if 'minute' in obj.name else 0.075 / 12
                obj.rotation_mode = 'XYZ'
                for f in range(1, frames + 1, step):
                    obj.rotation_euler.z = -rate * ((f - 1) // step)
                    obj.keyframe_insert('rotation_euler', index=2, frame=f)
            for obj in bpy.data.objects:
                if obj.parent == root and obj.name.endswith('_pivot') and obj.animation_data:
                    for fc in tc.iter_fcurves(obj.animation_data.action):
                        for kp in fc.keyframe_points:
                            kp.interpolation = 'CONSTANT'


def ambient(frames):
    """Gentle life in every shot: leaves sway, clouds drift."""
    for o in bpy.data.objects:
        n = o.name
        if n.startswith('T') and '_l' in n and o.type == 'MESH':
            x0 = o.location.x
            ph = (hash(n) % 100) / 16.0
            for f in range(0, frames + 1, 6):
                o.location.x = x0 + 0.012 * math.sin(f * 0.07 + ph)
                o.keyframe_insert('location', index=0, frame=f + 1)
        elif n.startswith('cloud') and o.type == 'MESH':
            x0 = o.location.x
            for f in (0, frames):
                o.location.x = x0 + 0.004 * f
                o.keyframe_insert('location', index=0, frame=f + 1)


def _tint_material(m, tint, strength):
    nt = m.node_tree if m.use_nodes else None
    if not nt:
        return
    for em in [n for n in nt.nodes if n.type == 'EMISSION']:
        col = em.inputs['Color']
        if col.is_linked:
            src = col.links[0].from_socket
            mix = nt.nodes.new('ShaderNodeMix')
            mix.data_type = 'RGBA'
            mix.blend_type = 'MULTIPLY'
            mix.inputs['Factor'].default_value = 1.0
            nt.links.new(src, mix.inputs[6])
            mix.inputs[7].default_value = (*tint, 1)
            nt.links.new(mix.outputs[2], col)
        else:
            c = col.default_value
            col.default_value = (c[0] * tint[0], c[1] * tint[1], c[2] * tint[2], 1)
        em.inputs['Strength'].default_value = strength


def apply_time(time):
    """Time-of-day grade inside Blender (glows stay bright): day | evening | night | party."""
    if time in (None, 'day'):
        return
    tints = {'evening': ((1.0, 0.82, 0.72), 0.9, 1.4), 'night': ((0.66, 0.72, 0.95), 0.97, 2.2), 'party': ((1.0, 0.9, 0.82), 0.95, 1.6)}
    tint, k, glow = tints[time]
    for m in bpy.data.materials:
        if m.name in ('Ink',) or m.name.startswith('ContactShadow'):
            continue
        if any(g in m.name for g in GLOW_KEYS):
            if m.use_nodes:
                for em in [n for n in m.node_tree.nodes if n.type == 'EMISSION']:
                    em.inputs['Strength'].default_value = glow
            continue
        _tint_material(m, tint, k)
    if time == 'night':
        sky = bpy.data.materials.get('set_sky')
        if sky:
            for n in sky.node_tree.nodes:
                if n.type == 'VALTORGB':
                    n.color_ramp.elements[0].color = tc.srgb('#2B3A6B')
                    n.color_ramp.elements[1].color = tc.srgb('#0E1433')
        ws = bpy.data.materials.get('set_winsky')
        if ws:
            for n in ws.node_tree.nodes:
                if n.type == 'EMISSION':
                    n.inputs['Color'].default_value = tc.srgb('#22305E')
                    n.inputs['Strength'].default_value = 1.0
        for o in bpy.data.objects:
            if o.name.startswith('cloud'):
                o.hide_render = True


def apply_dof(cam, spec):
    d = (spec.get('camera') or {}).get('dof')
    if not d:
        cam.data.dof.use_dof = False
        return
    cam.data.dof.use_dof = True
    cam.data.dof.aperture_fstop = d.get('fstop', 2.8)
    if d.get('char'):
        cam.data.dof.focus_object = bpy.data.objects.get(f"{d['char']}_head")
    elif d.get('point'):
        e = bpy.data.objects.new('dof_target', None)
        bpy.context.scene.collection.objects.link(e)
        e.location = d['point']
        cam.data.dof.focus_object = e

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
    # AUTO sensor-fit picks the shorter sensor side in Blender 5.x portrait renders, which
    # makes 9:16 shots ~2.7x tighter than the framing the shot specs were authored for.
    sc.camera.data.sensor_fit = 'HORIZONTAL'
    ts.build_set(spec.get('set', 'street'))
    for o in bpy.data.objects:  # per-shot: hide set pieces that block the camera (name prefixes)
        if any(o.name.startswith(h) for h in spec.get('hide', [])):
            o.hide_render = True

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
                 blink_from=int(c.get('blinkFrom', 0)), blink_until=c.get('blinkUntil'),
                 emph=c.get('emph'), sleep_from=c.get('sleepFrom'))
        if c.get('scale'):
            rig.scale = (c['scale'],) * 3
        add_shadow(rig)

    build_props(spec, frames)
    build_set_anim(spec, frames)
    place_camera(sc.camera, spec, frames)
    apply_dof(sc.camera, spec)
    if spec.get('ambient', True):
        ambient(frames)
    apply_time(spec.get('time'))

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


if __name__ == '__main__':
    main()
