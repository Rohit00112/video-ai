"""
Build the reusable chibi cast and render test frames.

  Blender -b --factory-startup --python blender/scripts/build_characters.py -- \
      --chars alex --out assets/characters/cast.blend --test-dir output/previews/blender-test --bg <image>
"""
import math
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lib'))
import toonchar as tc  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
UAL1 = os.path.join(ROOT, 'assets/third_party/ual/ual1/AnimationLibrary_Godot_Standard.glb')

SKIN, SKIN_SH = '#FBE3B4', '#EBC38F'

LOOKS = {
    'alex': dict(top='#3F4766', top_sh='#2A3049', pants='#2C2833', pants_sh='#1C1A22', shoe='#2F2126', hair='#7B3A22', hair_sh='#5A2716', style='spiky', hood=True),
    'chloe': dict(top='#5E8A45', top_sh='#466B33', pants=SKIN, pants_sh=SKIN_SH, shoe='#2F2126', hair='#CF541C', hair_sh='#A23E12', style='bun', dress=True),
    'mayor': dict(top='#F3EACB', top_sh='#D6C9A0', pants='#F0E6C4', pants_sh='#D3C69D', shoe='#5A2E1E', hair='#2E2420', hair_sh='#1E1714', style='hat', glasses=True),
    'chef': dict(top='#F8F4E4', top_sh='#D9D2BC', pants='#2C2833', pants_sh='#1C1A22', shoe='#2F2126', hair='#2E2420', hair_sh='#1E1714', style='chef'),
    'granny': dict(top='#8E5C9E', top_sh='#6B4479', pants='#4A3550', pants_sh='#35253A', shoe='#2F2126', hair='#C9C3BC', hair_sh='#A39C94', style='granny', dress=True),
    'ravi': dict(top='#E65A1E', top_sh='#B33E0E', pants='#E65A1E', pants_sh='#B33E0E', shoe='#1A1014', hair='#1E1A18', hair_sh='#12100E', style='spiky'),
    'warden': dict(top='#1C2A3A', top_sh='#101A24', pants='#1C2A3A', pants_sh='#101A24', shoe='#1A1014', hair='#7A828A', hair_sh='#555C64', style='hat'),
    'guard': dict(top='#364E68', top_sh='#223348', pants='#2A3A4E', pants_sh='#1A2633', shoe='#1A1014', hair='#2B221C', hair_sh='#1A1410', style='hat'),
}


def args():
    a = sys.argv[sys.argv.index('--') + 1:]
    out = {'chars': ['alex'], 'out': None, 'test_dir': None, 'bg': None}
    i = 0
    while i < len(a):
        k = a[i].lstrip('-').replace('-', '_')
        out[k] = a[i + 1].split(',') if k == 'chars' else a[i + 1]
        i += 2
    return out


def build_character(name, rig):
    L = LOOKS[name]
    M = lambda n, base, sh=None, em=False: tc.toon_mat(f'{name}_{n}', base, sh, em)
    skin = M('skin', SKIN, SKIN_SH)
    top = M('top', L['top'], L['top_sh'])
    pants = M('pants', L['pants'], L['pants_sh'])
    shoe = M('shoe', L['shoe'], '#1A1014')
    hair = M('hair', L['hair'], L['hair_sh'])
    dark = M('eye', '#2B1810', em=True)
    white = M('white', '#FFFFFF', em=True)
    cheek = M('cheek', '#F4A98E', em=True)
    nose = M('nose', '#F0A07E', '#E08868')
    mouthm = M('mouth', '#4A2219', em=True)
    tongue = M('tongue', '#C9545E', em=True)
    parts = []

    def part(obj, bone, outline=True):
        tc.attach(obj, rig, bone)
        if outline:
            tc.add_outline(obj, 0.011)
        parts.append(obj)
        return obj

    bw = lambda n: tc.bone_world(rig, n)
    # ---- legs
    for s in ('L', 'R'):
        h, t = bw(f'DEF-thigh.{s}')
        if L.get('dress'):
            h = h + (t - h) * 0.45  # keep thigh tops hidden inside the skirt
        part(tc.capsule(f'{name}_thigh{s}', pants, h, t, 0.075, 0.068), f'DEF-thigh.{s}')
        h2, t2 = bw(f'DEF-shin.{s}')
        part(tc.capsule(f'{name}_shin{s}', pants, h2, t2, 0.068, 0.062), f'DEF-shin.{s}')
        fh, ft = bw(f'DEF-foot.{s}')
        c = (fh + ft) / 2 + Vector((0, 0, -0.012))
        part(tc.ellipsoid(f'{name}_shoe{s}', shoe, (0.075, 0.115, 0.05), c), f'DEF-foot.{s}')
    # ---- pelvis / torso
    hh, ht = bw('DEF-hips')
    s1h, _ = bw('DEF-spine.001')
    _, s3t = bw('DEF-spine.003')
    part(tc.ellipsoid(f'{name}_pelvis', pants if not L.get('dress') else top, (0.17, 0.12, 0.1), hh + Vector((0, 0, 0.03))), 'DEF-hips')
    chest_c = (s1h + s3t) / 2
    part(tc.ellipsoid(f'{name}_torso', top, (0.19, 0.135, 0.18), chest_c), 'DEF-spine.002')
    if L.get('dress'):
        part(tc.ellipsoid(f'{name}_skirt', top, (0.215, 0.165, 0.15), hh + Vector((0, 0, -0.075))), 'DEF-hips')
    if L.get('hood'):
        nh, _ = bw('DEF-neck')
        part(tc.ellipsoid(f'{name}_hood', M('hood', '#2E3550', '#1E2338'), (0.13, 0.08, 0.05), nh + Vector((0, 0.04, 0.0))), 'DEF-spine.003')
        str_mat = M('string', '#EDE6D6', em=True)
        for sx in (-0.03, 0.03):
            a = chest_c + Vector((sx, -0.133, 0.08))
            part(tc.capsule(f'{name}_str{sx}', str_mat, a, a + Vector((0, -0.004, -0.07)), 0.006), 'DEF-spine.002', outline=False)
    # ---- arms
    for s in ('L', 'R'):
        h, t = bw(f'DEF-upper_arm.{s}')
        part(tc.capsule(f'{name}_uarm{s}', top, h, t, 0.056, 0.05), f'DEF-upper_arm.{s}')
        h2, t2 = bw(f'DEF-forearm.{s}')
        part(tc.capsule(f'{name}_farm{s}', top, h2, t2, 0.05, 0.046), f'DEF-forearm.{s}')
        hh2, ht2 = bw(f'DEF-hand.{s}')
        part(tc.ellipsoid(f'{name}_hand{s}', skin, (0.05, 0.045, 0.05), (hh2 + ht2) / 2 + (ht2 - hh2).normalized() * 0.02), f'DEF-hand.{s}')
    # ---- head
    nh, nt = bw('DEF-neck')
    hd, _ = bw('DEF-head')
    part(tc.capsule(f'{name}_neck', skin, nh, hd, 0.035), 'DEF-neck', outline=False)
    R = 0.27
    hc = hd + Vector((0, -0.01, R * 0.88))
    head = part(tc.ellipsoid(f'{name}_head', skin, (R * 1.04, R * 0.98, R * 0.95), hc, 40, 28), 'DEF-head')
    for sx in (-1, 1):
        part(tc.ellipsoid(f'{name}_ear{sx}', skin, (0.04, 0.03, 0.055), hc + Vector((sx * R * 1.0, 0.0, -0.01))), 'DEF-head')
    fy = hc.y - R * 0.95  # face plane (front = -Y)
    face_parts = []

    def feat(obj, outline=False):
        face_parts.append(part(obj, 'DEF-head', outline))
        return obj

    for sx in (-1, 1):
        if L.get('glasses'):
            feat(tc.ellipsoid(f'{name}_lens{sx}', M('lens', '#1E1E22', em=True), (0.068, 0.02, 0.045), hc + Vector((sx * 0.085, -R * 0.92, 0.02))))
        else:
            eye = feat(tc.ellipsoid(f'{name}_eye{sx}', dark, (0.026, 0.012, 0.036), hc + Vector((sx * 0.085, -R * 0.94, 0.02))))
            eye['blink'] = True
            feat(tc.ellipsoid(f'{name}_hl{sx}', white, (0.009, 0.006, 0.009), hc + Vector((sx * 0.085 + 0.008, -R * 0.965, 0.034))))
            feat(tc.capsule(f'{name}_brow{sx}', M('brow', '#5A2E1E', em=True), hc + Vector((sx * 0.055, -R * 0.93, 0.085)), hc + Vector((sx * 0.115, -R * 0.9, 0.08)), 0.008))
        feat(tc.ellipsoid(f'{name}_cheek{sx}', cheek, (0.04, 0.008, 0.024), hc + Vector((sx * 0.14, -R * 0.86, -0.045))))
    feat(tc.ellipsoid(f'{name}_nose', nose, (0.018, 0.016, 0.022), hc + Vector((0, -R * 0.99, -0.03))))
    # mouth: Preston Blair / Rhubarb shape set (A–H, X = rest smile). Exactly one set is visible at a time;
    # render_scene.py switches sets with constant scale keys driven by viseme lip-sync.
    mz = -0.088
    my = -R * 0.94
    teeth = M('teeth', '#FFFDF7', em=True)
    tongue = M('tongue', '#E07A6E', em=True)
    lip = M('lip', '#E59A84', em=True)

    def mpos(dx=0.0, dz=0.0, fwd=0.0):
        return hc + Vector((dx, my - fwd, mz + dz))

    def vis(letter, obj):
        obj['viseme'] = letter
        if letter != 'X':
            obj.scale = (0, 0, 0)
        return obj

    # X rest: gentle smile curve
    pts = [hc + Vector((x, my, mz + 0.004 - 0.012 * (1 - (x / 0.04) ** 2))) for x in [-0.04 + 0.08 * k / 6 for k in range(7)]]
    for i in range(6):
        vis('X', feat(tc.capsule(f'{name}_mX{i}', mouthm, pts[i], pts[i + 1], 0.0065)))
    # A closed (M B P): short straight pressed line
    vis('A', feat(tc.capsule(f'{name}_mA', mouthm, mpos(-0.03), mpos(0.03), 0.0075)))
    # B slightly open with teeth
    vis('B', feat(tc.ellipsoid(f'{name}_mB', mouthm, (0.034, 0.01, 0.012), mpos())))
    vis('B', feat(tc.ellipsoid(f'{name}_mBt', teeth, (0.027, 0.006, 0.0045), mpos(0, 0.0045, 0.006))))
    # C open
    vis('C', feat(tc.ellipsoid(f'{name}_mC', mouthm, (0.038, 0.01, 0.021), mpos(0, -0.004))))
    vis('C', feat(tc.ellipsoid(f'{name}_mCt', teeth, (0.03, 0.006, 0.0055), mpos(0, 0.01, 0.006))))
    vis('C', feat(tc.ellipsoid(f'{name}_mCg', tongue, (0.02, 0.006, 0.006), mpos(0, -0.017, 0.005))))
    # D wide open
    vis('D', feat(tc.ellipsoid(f'{name}_mD', mouthm, (0.038, 0.01, 0.027), mpos(0, -0.008))))
    vis('D', feat(tc.ellipsoid(f'{name}_mDt', teeth, (0.029, 0.006, 0.0055), mpos(0, 0.0125, 0.006))))
    vis('D', feat(tc.ellipsoid(f'{name}_mDg', tongue, (0.022, 0.006, 0.008), mpos(0, -0.024, 0.005))))
    # E rounded
    vis('E', feat(tc.ellipsoid(f'{name}_mE', mouthm, (0.028, 0.01, 0.025), mpos(0, -0.006))))
    vis('E', feat(tc.ellipsoid(f'{name}_mEg', tongue, (0.016, 0.006, 0.007), mpos(0, -0.021, 0.005))))
    # F puckered (OO, W)
    vis('F', feat(tc.ellipsoid(f'{name}_mFl', lip, (0.022, 0.008, 0.02), mpos(0, -0.003))))
    vis('F', feat(tc.ellipsoid(f'{name}_mF', mouthm, (0.012, 0.01, 0.012), mpos(0, -0.003, 0.003))))
    # G teeth on lower lip (F V)
    vis('G', feat(tc.ellipsoid(f'{name}_mG', mouthm, (0.032, 0.01, 0.01), mpos(0, 0.0))))
    vis('G', feat(tc.ellipsoid(f'{name}_mGt', teeth, (0.028, 0.006, 0.006), mpos(0, 0.001, 0.006))))
    # H tongue up (L)
    vis('H', feat(tc.ellipsoid(f'{name}_mH', mouthm, (0.036, 0.01, 0.019), mpos(0, -0.004))))
    vis('H', feat(tc.ellipsoid(f'{name}_mHg', tongue, (0.018, 0.006, 0.006), mpos(0, 0.004, 0.005))))
    # ---- hair / hats
    st = L['style']
    if st == 'spiky':
        # Tufty swept hair (sheet): cap sits high so the forehead shows; chunky tufts lean outward/back
        part(tc.ellipsoid(f'{name}_haircap', hair, (R * 1.07, R * 1.05, R * 0.62), hc + Vector((0, 0.04, R * 0.5))), 'DEF-head')
        tufts = [  # base (rel. head centre) -> tip, radius
            ((-0.22, 0.04, 0.10), (-0.33, 0.06, 0.15), 0.085), ((-0.17, -0.06, 0.2), (-0.30, -0.07, 0.31), 0.09),
            ((-0.08, -0.1, 0.24), (-0.13, -0.17, 0.39), 0.095), ((0.03, -0.11, 0.25), (0.05, -0.19, 0.41), 0.095),
            ((0.12, -0.09, 0.23), (0.23, -0.15, 0.36), 0.09), ((0.2, -0.02, 0.17), (0.34, -0.03, 0.25), 0.085),
            ((-0.1, 0.1, 0.22), (-0.17, 0.2, 0.33), 0.09), ((0.08, 0.11, 0.22), (0.15, 0.22, 0.32), 0.09), ((0.0, 0.05, 0.27), (0.01, 0.08, 0.42), 0.09),
            ((-0.14, -0.19, 0.16), (-0.2, -0.27, 0.08), 0.06), ((0.02, -0.22, 0.18), (0.1, -0.3, 0.1), 0.06),
        ]
        for i, (b0, t0, rr) in enumerate(tufts):
            part(tc.cone(f'{name}_spike{i}', hair, hc + Vector(b0), hc + Vector(t0), rr), 'DEF-head')
    elif st == 'bun':
        part(tc.ellipsoid(f'{name}_haircap', hair, (R * 1.08, R * 1.05, R * 0.72), hc + Vector((0, 0.03, R * 0.34))), 'DEF-head')
        part(tc.ellipsoid(f'{name}_bun', hair, (0.09, 0.09, 0.08), hc + Vector((0, 0.03, R * 1.12))), 'DEF-head')
        for sx in (-1, 1):
            part(tc.ellipsoid(f'{name}_lock{sx}', hair, (0.045, 0.06, 0.13), hc + Vector((sx * R * 0.92, -0.04, -0.06))), 'DEF-head')
    elif st == 'granny':
        part(tc.ellipsoid(f'{name}_haircap', hair, (R * 1.08, R * 1.05, R * 0.7), hc + Vector((0, 0.03, R * 0.36))), 'DEF-head')
        part(tc.ellipsoid(f'{name}_bun', hair, (0.08, 0.08, 0.07), hc + Vector((0, 0.05, R * 1.08))), 'DEF-head')
    elif st == 'hat':
        part(tc.ellipsoid(f'{name}_haircap', hair, (R * 1.06, R * 1.03, R * 0.6), hc + Vector((0, 0.03, R * 0.3))), 'DEF-head')
        hatm = M('hat', '#FBF3D6', '#DCCFA6')
        part(tc.ellipsoid(f'{name}_brim', hatm, (R * 1.75, R * 1.75, 0.022), hc + Vector((0, 0.0, R * 0.62))), 'DEF-head')
        part(tc.ellipsoid(f'{name}_crown', hatm, (R * 0.85, R * 0.85, R * 0.5), hc + Vector((0, 0.0, R * 0.82))), 'DEF-head')
        part(tc.capsule(f'{name}_band', M('band', '#8C6A4A'), hc + Vector((0, 0, R * 0.68)), hc + Vector((0, 0, R * 0.74)), R * 0.86), 'DEF-head', outline=False)
    elif st == 'chef':
        part(tc.ellipsoid(f'{name}_haircap', hair, (R * 1.06, R * 1.03, R * 0.6), hc + Vector((0, 0.03, R * 0.3))), 'DEF-head')
        hatm = M('chefhat', '#FCFAF0', '#DDD8C6')
        part(tc.capsule(f'{name}_hatband', hatm, hc + Vector((0, 0, R * 0.62)), hc + Vector((0, 0, R * 1.05)), R * 0.82), 'DEF-head')
        for i, (x, y) in enumerate(((-0.1, 0), (0.1, 0), (0, -0.06), (0, 0.07))):
            part(tc.ellipsoid(f'{name}_puff{i}', hatm, (0.14, 0.14, 0.12), hc + Vector((x, y, R * 1.3))), 'DEF-head')
    return parts


def setup_scene(bg_path):
    sc = bpy.context.scene
    engines = [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items]
    sc.render.engine = 'BLENDER_EEVEE' if 'BLENDER_EEVEE' in engines else engines[0]
    sc.render.resolution_x, sc.render.resolution_y = 1080, 1920
    sc.render.fps = 30
    sc.view_settings.view_transform = 'Standard'
    world = bpy.data.worlds.new('World')
    sc.world = world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = tc.srgb('#F2D6B0')
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.6
    sun = bpy.data.objects.new('Sun', bpy.data.lights.new('Sun', 'SUN'))
    sun.data.energy = 3.0
    sun.data.color = (1.0, 0.93, 0.82)
    sun.rotation_euler = (math.radians(50), 0, math.radians(-35))
    sc.collection.objects.link(sun)
    cam = bpy.data.objects.new('Cam', bpy.data.cameras.new('Cam'))
    cam.data.lens = 50
    cam.location = (0, -3.6, 0.62)
    cam.rotation_euler = (math.radians(87), 0, 0)
    sc.collection.objects.link(cam)
    sc.camera = cam
    if bg_path and os.path.exists(bg_path):
        img = bpy.data.images.load(bg_path)
        mat = bpy.data.materials.new('BG')
        mat.use_nodes = True
        nt = mat.node_tree
        nt.nodes.clear()
        out = nt.nodes.new('ShaderNodeOutputMaterial')
        em = nt.nodes.new('ShaderNodeEmission')
        tex = nt.nodes.new('ShaderNodeTexImage')
        tex.image = img
        nt.links.new(tex.outputs['Color'], em.inputs['Color'])
        nt.links.new(em.outputs[0], out.inputs[0])
        bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 4.0, 1.25))
        pl = bpy.context.active_object
        pl.name = 'Backdrop'
        pl.scale = (8.6 * 1080 / 1920, 8.6, 1)
        pl.rotation_euler = (math.radians(90), 0, 0)
        pl.data.materials.append(mat)
    # ground contact shadow disc
    sh = bpy.data.materials.new('Shadow')
    sh.use_nodes = True
    nt = sh.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    mix = nt.nodes.new('ShaderNodeMixShader')
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = (0.1, 0.05, 0.02, 1)
    grad = nt.nodes.new('ShaderNodeTexGradient')
    grad.gradient_type = 'SPHERICAL'
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (1, 1, 1, 1)
    ramp.color_ramp.elements[1].position = 0.55
    ramp.color_ramp.elements[1].color = (0.6, 0.6, 0.6, 1)
    nt.links.new(grad.outputs['Fac'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], mix.inputs['Fac'])
    nt.links.new(em.outputs[0], mix.inputs[1])
    nt.links.new(tr.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs[0])
    sh.blend_method = 'BLEND' if hasattr(sh, 'blend_method') else None
    return sc


def set_action(rig, name):
    ac = bpy.data.actions[name]
    rig.animation_data_create()
    rig.animation_data.action = ac
    if ac.slots:
        rig.animation_data.action_slot = ac.slots[0]
    return ac


LINEUPS = [
    {'alex': 'G_point', 'chloe': 'G_cross', 'mayor': 'G_cheer', 'chef': 'G_facepalm', 'granny': 'G_wave'},
    {'alex': 'Walk_Loop', 'chloe': 'Dance_Loop', 'mayor': 'G_shrug', 'chef': 'G_hips', 'granny': 'G_think'},
    {'alex': 'Idle_Talking_Loop', 'chloe': 'G_shrug', 'mayor': 'G_point', 'chef': 'G_cheer', 'granny': 'Idle_Loop'},
]


def main():
    a = args()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    base = tc.import_rig(UAL1)
    base.data.pose_position = 'REST'
    legf = tc.chibify(base)
    tc.scale_hip_motion(legf)
    base.data.pose_position = 'POSE'
    tc.build_gestures(base)
    base.data.pose_position = 'REST'
    rigs = {}
    for i, n in enumerate(a['chars']):
        rig = base if i == 0 else base.copy()
        if i:
            rig.data = base.data.copy()  # own armature data per character
            bpy.context.scene.collection.objects.link(rig)
        rig.name = f'RIG_{n}'
        rig.animation_data_create()
        rig.animation_data.action = None
        rig.data.pose_position = 'REST'
        build_character(n, rig)
        rigs[n] = rig
    for rig in rigs.values():
        rig.data.pose_position = 'POSE'
    sc = setup_scene(a.get('bg'))
    xs = [(-1.6 + 3.2 * i / max(1, len(rigs) - 1)) if len(rigs) > 1 else 0 for i in range(len(rigs))]
    for (n, rig), x in zip(rigs.items(), xs):
        rig.location.x = x
    if len(rigs) > 1:
        cam = sc.camera
        cam.location = (0, -9.0, 0.95)
        bd = bpy.data.objects.get('Backdrop')
        if bd:
            bd.scale *= 1.7
    if a.get('out'):
        os.makedirs(os.path.dirname(os.path.join(ROOT, a['out'])), exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, a['out']))
    if a.get('test_dir'):
        d = os.path.join(ROOT, a['test_dir'])
        os.makedirs(d, exist_ok=True)
        for li, lineup in enumerate(LINEUPS):
            for n, rig in rigs.items():
                ac = set_action(rig, lineup.get(n, 'Idle_Loop'))
            sc.frame_set(17)
            sc.render.filepath = os.path.join(d, f'lineup_{li}.png')
            bpy.ops.render.render(write_still=True)
            print('RENDERED', sc.render.filepath)


main()
