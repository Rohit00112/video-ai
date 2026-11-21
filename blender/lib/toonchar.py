"""
Reusable chibi toon characters for Tiny World Stories (Blender 5.x, run headless).

- Rig + motions: Quaternius Universal Animation Library (CC0), assets/third_party/ual/
- The rig is re-proportioned to chibi (short legs/spine/arms, big head). Motions are rotation-based,
  so they keep working; only the small hip translation is scaled with the legs.
- Body parts are rigid meshes parented to bones (no weight painting → no skin tearing/stretching).
- Toon look: 2-step cel shading + inverted-hull ink outlines in warm brown, matching the Gemini sheet.
"""
import math
import bmesh
import bpy
from mathutils import Matrix, Quaternion, Vector

INK = (0.29, 0.165, 0.11, 1.0)  # #4A2A1C


def srgb(hexstr, a=1.0):
    h = hexstr.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return (*lin, a)


# ----------------------------------------------------------------------------- materials
_MATS = {}


def toon_mat(name, base_hex, shade_hex=None, emissive=False):
    """Cel material: Diffuse → Shader-to-RGB → constant ramp (shade/base) → Emission (flat, light-aware)."""
    key = (name, base_hex, shade_hex, emissive)
    if key in _MATS:
        return _MATS[key]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    em = nt.nodes.new('ShaderNodeEmission')
    nt.links.new(em.outputs[0], out.inputs[0])
    if emissive:
        em.inputs['Color'].default_value = srgb(base_hex)
    else:
        diff = nt.nodes.new('ShaderNodeBsdfDiffuse')
        s2r = nt.nodes.new('ShaderNodeShaderToRGB')
        ramp = nt.nodes.new('ShaderNodeValToRGB')
        ramp.color_ramp.interpolation = 'CONSTANT'
        els = ramp.color_ramp.elements
        els[0].position = 0.0
        els[0].color = srgb(shade_hex or base_hex)
        els[1].position = 0.32
        els[1].color = srgb(base_hex)
        nt.links.new(diff.outputs[0], s2r.inputs[0])
        nt.links.new(s2r.outputs['Color'], ramp.inputs['Fac'])
        nt.links.new(ramp.outputs['Color'], em.inputs['Color'])
    em.inputs['Strength'].default_value = 1.0
    _MATS[key] = m
    return m


def ink_mat():
    if 'Ink' in bpy.data.materials:
        return bpy.data.materials['Ink']
    m = bpy.data.materials.new('Ink')
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = INK
    nt.links.new(em.outputs[0], out.inputs[0])
    m.use_backface_culling = True
    return m


def add_outline(obj, thickness=0.012):
    """Inverted-hull outline: solidify with flipped normals using a back-face-culled ink material."""
    if obj.type != 'MESH':
        return
    obj.data.materials.append(ink_mat())
    mod = obj.modifiers.new('Outline', 'SOLIDIFY')
    mod.thickness = thickness
    mod.offset = 1.0
    mod.use_flip_normals = True
    mod.use_rim = False
    mod.material_offset = len(obj.data.materials) - 1


# ----------------------------------------------------------------------------- mesh primitives
def _new_obj(name, bm, mat):
    # Origin at the part's own centre, so scale keys (blink, mouth open) shrink in place
    center = Vector()
    if bm.verts:
        lo = Vector((min(v.co.x for v in bm.verts), min(v.co.y for v in bm.verts), min(v.co.z for v in bm.verts)))
        hi = Vector((max(v.co.x for v in bm.verts), max(v.co.y for v in bm.verts), max(v.co.z for v in bm.verts)))
        center = (lo + hi) / 2
        bmesh.ops.translate(bm, vec=-center, verts=bm.verts)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    ob.location = center
    bpy.context.scene.collection.objects.link(ob)
    me.materials.append(mat)
    return ob


def ellipsoid(name, mat, size, loc=(0, 0, 0), seg=32, rings=20):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    bmesh.ops.translate(bm, vec=Vector(loc), verts=bm.verts)
    return _new_obj(name, bm, mat)


def capsule(name, mat, a, b, r1, r2=None, seg=20):
    """Tapered capsule from point a to point b (world space)."""
    r2 = r1 if r2 is None else r2
    a, b = Vector(a), Vector(b)
    axis = b - a
    length = axis.length
    bm = bmesh.new()
    rings = []
    # hemisphere at a, cylinder, hemisphere at b (built along +Z then rotated)
    profile = []
    for i in range(7):
        t = (i / 6) * (math.pi / 2)
        profile.append((-math.cos(t) * r1 * 0 + 0, r1 * math.sin(t), -r1 * math.cos(t)))
    for i in range(7):
        t = (i / 6) * (math.pi / 2)
        profile.append((0, r2 * math.cos(t), length + r2 * math.sin(t)))
    for (_, r, z) in profile:
        ring = []
        for k in range(seg):
            ang = 2 * math.pi * k / seg
            ring.append(bm.verts.new((r * math.cos(ang), r * math.sin(ang), z)))
        rings.append(ring)
    for i in range(len(rings) - 1):
        for k in range(seg):
            v1, v2 = rings[i][k], rings[i][(k + 1) % seg]
            v3, v4 = rings[i + 1][(k + 1) % seg], rings[i + 1][k]
            try:
                bm.faces.new((v1, v2, v3, v4))
            except ValueError:
                pass
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    rot = Vector((0, 0, 1)).rotation_difference(axis.normalized()).to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=Matrix.Translation(a) @ rot, verts=bm.verts)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _new_obj(name, bm, mat)


def cone(name, mat, base, tip, r, seg=12):
    base, tip = Vector(base), Vector(tip)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=True, segments=seg, radius1=r, radius2=0.0, depth=(tip - base).length)
    axis = (tip - base)
    rot = Vector((0, 0, 1)).rotation_difference(axis.normalized()).to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=Matrix.Translation((base + tip) / 2) @ rot, verts=bm.verts)
    return _new_obj(name, bm, mat)


# ----------------------------------------------------------------------------- rig
CHIBI = dict(leg=0.4, spine=0.52, arm=0.66, shoulder=0.6, width=0.9)


def import_rig(glb_path):
    bpy.ops.import_scene.gltf(filepath=glb_path)
    rig = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
    for o in list(bpy.data.objects):
        if o.type == 'MESH':
            bpy.data.objects.remove(o, do_unlink=True)
    return rig


def chibify(rig, p=CHIBI):
    """Shorten legs/spine/arms (edit bones), keep orientations. Returns leg factor for hip-motion scaling."""
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='EDIT')
    eb = rig.data.edit_bones
    orig = {b.name: (b.head.copy(), b.tail.copy()) for b in eb}

    def cat(n):
        if n == 'root':
            return None
        if 'hips' in n:
            return 'hips'
        if any(k in n for k in ('thigh', 'shin', 'foot', 'toe')):
            return 'leg'
        if any(k in n for k in ('spine', 'neck', 'head')):
            return 'spine'
        if 'shoulder' in n:
            return 'shoulder'
        return 'arm'

    def depth(b):
        d = 0
        while b.parent:
            d += 1
            b = b.parent
        return d

    new = {}
    for b in sorted(eb, key=depth):
        c = cat(b.name)
        h0, t0 = orig[b.name]
        if c is None:
            new[b.name] = (h0, t0)
            continue
        if c == 'hips':
            h = Vector((h0.x, h0.y, h0.z * p['leg']))
            t = h + (t0 - h0)
        else:
            ph0, _ = orig[b.parent.name]
            phn, _ = new[b.parent.name]
            off = h0 - ph0
            s = p[c]
            if c == 'leg' and 'thigh' in b.name:
                off = Vector((off.x * p['width'], off.y, off.z))
                s_len = p['leg']
            elif c == 'shoulder':
                off = Vector((off.x * p['width'], off.y * p['spine'], off.z * p['spine']))
                s_len = p['shoulder']
            elif c == 'arm' and 'upper_arm' in b.name:
                # attach at the (new) shoulder tail
                s_len = p['arm']
                sh_h0, sh_t0 = orig[b.parent.name]
                sh_hn, sh_tn = new[b.parent.name]
                off = (h0 - sh_t0)
                h = sh_tn + off * p['arm']
                t = h + (t0 - h0) * s_len
                new[b.name] = (h, t)
                continue
            else:
                off = off * s
                s_len = s
            h = phn + off
            t = h + (t0 - h0) * s_len
        new[b.name] = (h, t)
    for b in eb:
        h, t = new[b.name]
        b.head, b.tail = h, t
    bpy.ops.object.mode_set(mode='OBJECT')
    return p['leg']


def iter_fcurves(action):
    for layer in action.layers:
        for strip in layer.strips:
            for slot in action.slots:
                cb = strip.channelbag(slot)
                if cb:
                    yield from cb.fcurves


def scale_hip_motion(factor):
    for ac in bpy.data.actions:
        for fc in iter_fcurves(ac):
            if fc.data_path in ('pose.bones["DEF-hips"].location', 'pose.bones["root"].location'):
                for k in fc.keyframe_points:
                    k.co[1] *= factor
                    k.handle_left[1] *= factor
                    k.handle_right[1] *= factor


def bone_world(rig, name):
    b = rig.data.bones[name]
    mw = rig.matrix_world
    return mw @ b.head_local, mw @ b.tail_local


def attach(obj, rig, bone):
    """Rigidly parent obj to a bone, keeping its current world placement (rig must be in rest pose)."""
    pb = rig.pose.bones[bone]
    b = rig.data.bones[bone]
    world = obj.matrix_basis.copy()  # unparented: basis == world, and it is current without a depsgraph update
    obj.parent = rig
    obj.parent_type = 'BONE'
    obj.parent_bone = bone
    parent_mat = rig.matrix_world @ b.matrix_local @ Matrix.Translation((0, b.length, 0))
    obj.matrix_parent_inverse = parent_mat.inverted()
    # Set basis directly: assigning matrix_world would use the rig's last *evaluated*
    # pose (possibly stale, e.g. a gesture), baking a wrong offset into the part.
    obj.matrix_basis = world
    return obj


# ----------------------------------------------------------------------------- gestures
def _aim(rig, bone, direction):
    """Pose `bone` so it points along `direction` (armature space), keeping its head where the parent puts it."""
    pb = rig.pose.bones[bone]
    b = pb.bone
    if b.parent:
        m0 = pb.parent.matrix @ b.parent.matrix_local.inverted() @ b.matrix_local
    else:
        m0 = b.matrix_local.copy()
    d0 = m0.to_3x3() @ Vector((0, 1, 0))
    q = d0.rotation_difference(Vector(direction).normalized())
    pb.matrix = Matrix.Translation(m0.translation) @ q.to_matrix().to_4x4() @ m0.to_3x3().to_4x4()
    bpy.context.view_layer.update()


def _bone_pos(rig, bone, tail=False):
    pb = rig.pose.bones[bone]
    return (pb.tail if tail else pb.head).copy()


# Character faces -Y; character's right side is -X (".R" bones), left is +X (".L").
GESTURES = {
    'G_point': {'upper_arm.R': (-0.75, -0.6, 0.15), 'forearm.R': (-0.6, -0.8, 0.12), 'upper_arm.L': (0.3, 0.05, -1), 'forearm.L': (0.15, -0.15, -1)},
    'G_wave': {'upper_arm.R': (-0.95, -0.1, 0.25), 'forearm.R': (-0.3, -0.15, 1), 'upper_arm.L': (0.3, 0.05, -1), 'forearm.L': (0.15, -0.15, -1)},
    'G_cheer': {'upper_arm.R': (-0.85, -0.1, 0.5), 'forearm.R': (-0.45, -0.1, 1), 'upper_arm.L': (0.85, -0.1, 0.5), 'forearm.L': (0.45, -0.1, 1)},
    'G_shrug': {'upper_arm.R': (-0.7, 0.05, -0.7), 'forearm.R': (-0.75, -0.55, 0.25), 'upper_arm.L': (0.7, 0.05, -0.7), 'forearm.L': (0.75, -0.55, 0.25)},
    'G_hips': {'upper_arm.R': (-0.8, 0.15, -0.55), 'forearm.R': (0.6, -0.05, -0.55), 'upper_arm.L': (0.8, 0.15, -0.55), 'forearm.L': (-0.6, -0.05, -0.55)},
    'G_cross': {'upper_arm.R': (-0.35, -0.35, -0.85), 'forearm.R': (1, -0.45, 0.15), 'upper_arm.L': (0.35, -0.3, -0.85), 'forearm.L': (-1, -0.55, 0.22)},
    'G_think': {'upper_arm.R': (-0.25, -0.55, -0.75), 'forearm.R': 'chin', 'upper_arm.L': (0.3, -0.3, -0.85), 'forearm.L': (-0.9, -0.4, 0.15)},
    'G_facepalm': {'upper_arm.R': (-0.3, -0.7, -0.2), 'forearm.R': 'face', 'upper_arm.L': (0.3, 0.05, -1), 'forearm.L': (0.15, -0.15, -1)},
    'G_snap': {'upper_arm.R': (-0.75, -0.5, 0.05), 'forearm.R': (-0.05, -0.45, 1), 'upper_arm.L': (0.3, 0.05, -1), 'forearm.L': (0.15, -0.15, -1)},
    'G_rest': {'upper_arm.R': (-0.3, 0.05, -1), 'forearm.R': (-0.15, -0.15, -1), 'upper_arm.L': (0.3, 0.05, -1), 'forearm.L': (0.15, -0.15, -1)},
}
ARM_ORDER = ('upper_arm.R', 'forearm.R', 'upper_arm.L', 'forearm.L')


def build_gestures(rig, fps=30):
    """Create looping gesture actions (2 s) with breathing, head motion and per-gesture secondary motion."""
    bpy.context.view_layer.objects.active = rig
    rig.animation_data_create()
    made = []
    keyed = [pb for pb in rig.pose.bones if pb.name.startswith('DEF-') and not any(k in pb.name for k in ('f_', 'thumb'))]
    for gname, spec in GESTURES.items():
        # Pose with NO action assigned: view_layer.update() would otherwise re-evaluate
        # the half-built action and overwrite the pose we are constructing.
        rig.animation_data.action = None
        n = 2 * fps
        samples = []
        for f in range(0, n + 1, 5):
            ph = 2 * math.pi * f / n
            for pb in rig.pose.bones:
                pb.rotation_mode = 'QUATERNION'
                pb.rotation_quaternion = (1, 0, 0, 0)
                pb.location = (0, 0, 0)
            bpy.context.view_layer.update()
            rig.pose.bones['DEF-spine.002'].rotation_quaternion = Quaternion((1, 0, 0), 0.025 * math.sin(ph))
            rig.pose.bones['DEF-head'].rotation_quaternion = Quaternion((0, 0, 1), 0.05 * math.sin(ph * 0.5)) @ Quaternion((1, 0, 0), 0.03 * math.sin(ph))
            if gname == 'G_cheer':
                rig.pose.bones['DEF-hips'].location = (0, 0.06 * abs(math.sin(ph * 2)), 0)
            if gname == 'G_facepalm':
                rig.pose.bones['DEF-head'].rotation_quaternion = Quaternion((1, 0, 0), 0.22)
            if gname == 'G_shrug':
                rig.pose.bones['DEF-head'].rotation_quaternion = Quaternion((0, 1, 0), 0.12)
            bpy.context.view_layer.update()
            for key in ARM_ORDER:
                d = spec[key]
                bone = f'DEF-{key}'
                if d in ('chin', 'face'):
                    head_c = _bone_pos(rig, 'DEF-head') + Vector((0, -0.2, 0.17 if d == 'face' else 0.05))
                    d = head_c - _bone_pos(rig, bone)
                d = Vector(d)
                if gname == 'G_wave' and key == 'forearm.R':
                    d = Vector((d.x - 0.45 * math.sin(ph * 4), d.y, d.z))
                if gname == 'G_snap' and key == 'forearm.R':
                    d = Vector((d.x - 0.18 * max(0.0, math.sin(ph * 2)) ** 6, d.y, d.z))
                if gname == 'G_point' and key == 'forearm.R':
                    d = Vector((d.x, d.y, d.z + 0.06 * math.sin(ph * 2)))
                _aim(rig, bone, d)
            samples.append((f + 1, {pb.name: pb.rotation_quaternion.copy() for pb in keyed},
                            rig.pose.bones['DEF-hips'].location.copy()))
        ac = bpy.data.actions.new(gname)
        ac.use_fake_user = True
        rig.animation_data.action = ac
        for frame, rots, hip in samples:
            for pb in keyed:
                pb.rotation_quaternion = rots[pb.name]
                pb.keyframe_insert('rotation_quaternion', frame=frame)
            rig.pose.bones['DEF-hips'].location = hip
            rig.pose.bones['DEF-hips'].keyframe_insert('location', frame=frame)
        made.append(gname)
    rig.animation_data.action = None
    for pb in rig.pose.bones:
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.location = (0, 0, 0)
    return made
