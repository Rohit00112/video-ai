"""
Reusable cel-shaded props for Tiny World Stories (same toon look + ink outlines as the cast).

Every builder returns a single parent EMPTY (the prop's pivot) with its parts parented under it,
built around the origin so render_scene.py can place, hold (hand-attach), swap and animate it.
Scale reference: characters are ~1.05 tall, hands ~0.04 radius, table top at z≈0.42.
"""
import math
import random

import bmesh
import bpy
from mathutils import Matrix, Vector

import toonchar as tc

OUT = 0.009


def M(name, base, shade=None, em=False):
    return tc.toon_mat(f'prop_{name}', base, shade, em)


def _empty(name):
    e = bpy.data.objects.new(name, None)
    e.empty_display_size = 0.05
    bpy.context.scene.collection.objects.link(e)
    return e


def _own(parent, obj, outline=True, thick=OUT):
    obj.parent = parent
    if outline:
        tc.add_outline(obj, thick)
    return obj


def _cyl(name, mat, r, h, loc=(0, 0, 0), seg=28, r2=None):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=h)
    bmesh.ops.translate(bm, vec=Vector(loc), verts=bm.verts)
    ob = tc._new_obj(name, bm, mat)
    return ob


def _box(name, mat, size, loc=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    bmesh.ops.translate(bm, vec=Vector(loc), verts=bm.verts)
    ob = tc._new_obj(name, bm, mat)
    for p in ob.data.polygons:
        p.use_smooth = False
    return ob


def _wedge(name, mat, r0, r1, a0, a1, h, z=0.0, seg=10):
    """Annular wedge (pizza slice / bitten slice) in the XY plane, thickness h."""
    bm = bmesh.new()
    top, bot = [], []
    pts = []
    for k in range(seg + 1):
        a = a0 + (a1 - a0) * k / seg
        pts.append((r1 * math.cos(a), r1 * math.sin(a)))
    inner = [(r0 * math.cos(a1 - (a1 - a0) * k / seg), r0 * math.sin(a1 - (a1 - a0) * k / seg)) for k in range(seg + 1)] if r0 > 0 else [(0.0, 0.0)]
    ring = pts + inner
    for (x, y) in ring:
        top.append(bm.verts.new((x, y, z + h / 2)))
        bot.append(bm.verts.new((x, y, z - h / 2)))
    bm.faces.new(top)
    bm.faces.new(list(reversed(bot)))
    n = len(ring)
    for i in range(n):
        bm.faces.new((bot[i], bot[(i + 1) % n], top[(i + 1) % n], top[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = tc._new_obj(name, bm, mat)
    for p in ob.data.polygons:
        p.use_smooth = False
    return ob


# ----------------------------------------------------------------------------- food
CHEESE = ('#F7C948', '#E0A92E')
CRUST = ('#E3A15A', '#C07F3A')
PEPP = ('#C8432E', '#A1321F')


def _slice_parts(root, name, r0, r1, a0, a1, z=0.0):
    _own(root, _wedge(f'{name}_crustbase', M('crust', *CRUST), r0, r1, a0, a1, 0.018, z))
    _own(root, _wedge(f'{name}_cheese', M('cheese', *CHEESE), r0, r1 - 0.018, a0 + 0.02, a1 - 0.02, 0.008, z + 0.012), outline=False)
    # crust rim
    am = (a0 + a1) / 2
    for k in range(5):
        a = a0 + (a1 - a0) * (k + 0.5) / 5
        _own(root, tc.ellipsoid(f'{name}_rim{k}', M('crust', *CRUST), (0.016, 0.016, 0.013), (r1 * math.cos(a) * 0.97, r1 * math.sin(a) * 0.97, z + 0.009), seg=12, rings=8), outline=False)
    rnd = random.Random(hash(name) & 0xffff)
    for k in range(2):
        rr = r0 + (r1 - r0) * (0.35 + 0.3 * k)
        a = am + (rnd.random() - 0.5) * (a1 - a0) * 0.4
        if rr * (a1 - a0) < 0.03:
            continue
        _own(root, _cyl(f'{name}_pep{k}', M('pepp', *PEPP), 0.017, 0.006, (rr * math.cos(a), rr * math.sin(a), z + 0.018), seg=16), outline=False)


def pizza(name, missing=1):
    """Whole pizza on a wooden board, with `missing` slices removed (8 slices)."""
    root = _empty(name)
    _own(root, _cyl(f'{name}_board', M('board', '#B7774A', '#935A33'), 0.2, 0.02, (0, 0, -0.012)))
    for i in range(8 - missing):
        a0 = math.radians(45 * (i + missing)) + 0.01
        _slice_parts(root, f'{name}_s{i}', 0.0, 0.17, a0, a0 + math.radians(45) - 0.02, z=0.012)
    return root


def slice_(name, bitten=False):
    """One slice held by the crust: origin at the crust, tip pointing along -X."""
    root = _empty(name)
    inner = _empty(f'{name}_inner')
    inner.parent = root
    inner.location = (-0.17, 0, 0)
    a = math.radians(22)
    _slice_parts(inner, name, 0.06 if bitten else 0.0, 0.17, -a, a)
    if bitten:  # bite marks: two little scallops at the bitten edge
        for dy in (-0.012, 0.012):
            _own(inner, tc.ellipsoid(f'{name}_bite{dy}', M('crust', *CRUST), (0.012, 0.012, 0.01), (0.062, dy, 0.004), seg=10, rings=6), outline=False)
    return root


def crumbs(name, n=7):
    root = _empty(name)
    rnd = random.Random(5)
    for i in range(n):
        _own(root, tc.ellipsoid(f'{name}_{i}', M('crust', *CRUST), (0.008, 0.008, 0.006), (rnd.uniform(-0.03, 0.03), rnd.uniform(-0.02, 0.02), rnd.uniform(-0.02, 0.02)), seg=8, rings=5), outline=False)
    return root


def dough(name):
    root = _empty(name)
    _own(root, tc.ellipsoid(f'{name}_d', M('dough', '#F6E3B8', '#E2C994'), (0.14, 0.14, 0.012), (0, 0, 0), seg=28, rings=10))
    _own(root, tc.ellipsoid(f'{name}_flour', M('flour', '#FFFFFF', em=True), (0.07, 0.05, 0.004), (0.02, 0.01, 0.01), seg=16, rings=6), outline=False)
    return root


# ----------------------------------------------------------------------------- drinks
def coffee_cup(name):
    root = _empty(name)
    _own(root, _cyl(f'{name}_cup', M('cup', '#FFFFFF', '#E6E1D6'), 0.034, 0.085, (0, 0, 0.0425), r2=0.042))
    _own(root, _cyl(f'{name}_sleeve', M('sleeve', '#B7774A', '#935A33'), 0.04, 0.03, (0, 0, 0.045), r2=0.042), outline=False)
    _own(root, _cyl(f'{name}_lid', M('lid', '#5A3A2A', '#3E271B'), 0.044, 0.012, (0, 0, 0.09)))
    return root


def coffee_splash(name):
    """Coffee frozen mid-slosh above a cup (droplets + crown)."""
    root = _empty(name)
    cof = M('coffee', '#7A4A2A', '#5C3520')
    rnd = random.Random(11)
    _own(root, tc.ellipsoid(f'{name}_crown', cof, (0.04, 0.03, 0.02), (0.0, 0, 0.11), seg=18, rings=10))
    for i in range(9):
        a = rnd.uniform(0, 2 * math.pi)
        r = rnd.uniform(0.03, 0.09)
        z = 0.12 + rnd.uniform(0.0, 0.12)
        s = rnd.uniform(0.008, 0.016)
        _own(root, tc.ellipsoid(f'{name}_drop{i}', cof, (s, s, s * 1.3), (r * math.cos(a), r * math.sin(a) * 0.5, z), seg=12, rings=8), thick=0.005)
    return root


def tea_set(name):
    """Small round table with cup + saucer; the teapot is a separate (holdable) prop."""
    root = _empty(name)
    wood = M('table', '#B7774A', '#935A33')
    _own(root, _cyl(f'{name}_top', wood, 0.26, 0.035, (0, 0, 0.42)))
    _own(root, _cyl(f'{name}_leg', wood, 0.035, 0.4, (0, 0, 0.21)))
    _own(root, _cyl(f'{name}_foot', wood, 0.13, 0.025, (0, 0, 0.0125)))
    _own(root, _cyl(f'{name}_saucer', M('china', '#FFFFFF', '#E6E1D6'), 0.06, 0.01, (0.05, -0.04, 0.443)))
    _own(root, _cyl(f'{name}_cup', M('china', '#FFFFFF', '#E6E1D6'), 0.032, 0.045, (0.05, -0.04, 0.47), r2=0.038))
    _own(root, _cyl(f'{name}_tea', M('tea', '#B5652E', em=True), 0.034, 0.004, (0.05, -0.04, 0.49)), outline=False)
    return root


def teapot(name):
    """Teapot with spout along +X; origin at the handle grip."""
    root = _empty(name)
    china = M('teapot', '#9CC7C2', '#7FAAA5')
    _own(root, tc.ellipsoid(f'{name}_body', china, (0.075, 0.07, 0.06), (0.1, 0, -0.02), seg=24, rings=14))
    _own(root, tc.capsule(f'{name}_spout', china, (0.16, 0, -0.03), (0.22, 0, 0.02), 0.014, 0.009))
    _own(root, tc.ellipsoid(f'{name}_lid', china, (0.035, 0.035, 0.015), (0.1, 0, 0.04), seg=16, rings=8))
    _own(root, tc.ellipsoid(f'{name}_knob', M('gold', '#F2C14E', '#D9A532'), (0.012, 0.012, 0.012), (0.1, 0, 0.058), seg=10, rings=6))
    _own(root, tc.capsule(f'{name}_handle', china, (0.0, 0, 0.02), (0.0, 0, -0.05), 0.012))
    _own(root, tc.capsule(f'{name}_handle_t', china, (0.0, 0, 0.02), (0.04, 0, 0.02), 0.011), outline=False)
    _own(root, tc.capsule(f'{name}_handle_b', china, (0.0, 0, -0.05), (0.04, 0, -0.05), 0.011), outline=False)
    return root


def tea_stream(name, a, b):
    root = _empty(name)
    _own(root, tc.capsule(f'{name}_s', M('tea', '#B5652E', em=True), a, b, 0.012, 0.009), thick=0.005)
    for k in range(3):
        _own(root, tc.ellipsoid(f'{name}_d{k}', M('tea', '#B5652E', em=True), (0.006, 0.006, 0.008), Vector(b) + Vector((0.02 * (k - 1), -0.01, 0.015 + 0.01 * k)), seg=8, rings=5), outline=False)
    return root


# ----------------------------------------------------------------------------- life & party
def pigeon(name):
    """Pigeon facing +X. Wings are children named *_wingL/_wingR (rotate about X to flap)."""
    root = _empty(name)
    grey = M('pigeon', '#9AA3B5', '#7A8397')
    dark = M('pigeon_d', '#5E6577', '#474D5C')
    _own(root, tc.ellipsoid(f'{name}_body', grey, (0.08, 0.045, 0.045), (0, 0, 0), seg=20, rings=12))
    _own(root, tc.ellipsoid(f'{name}_head', grey, (0.03, 0.03, 0.03), (0.075, 0, 0.035), seg=16, rings=10))
    _own(root, tc.ellipsoid(f'{name}_neck', M('pigeon_n', '#6FB7A0', '#539683'), (0.028, 0.032, 0.025), (0.055, 0, 0.02), seg=14, rings=8), outline=False)
    _own(root, tc.cone(f'{name}_beak', M('beak', '#F2A541', '#D98A2B'), (0.1, 0, 0.035), (0.125, 0, 0.03), 0.009, seg=8))
    _own(root, tc.ellipsoid(f'{name}_eye', M('eye', '#1A1A1A', em=True), (0.006, 0.004, 0.006), (0.088, -0.026, 0.045), seg=8, rings=6), outline=False)
    _own(root, tc.ellipsoid(f'{name}_tail', dark, (0.045, 0.03, 0.008), (-0.09, 0, 0.0), seg=12, rings=6))
    for side, sy in (('L', 1), ('R', -1)):
        piv = _empty(f'{name}_wing{side}')
        piv.parent = root
        piv.location = (0.0, sy * 0.035, 0.02)
        w = tc.ellipsoid(f'{name}_wingmesh{side}', dark, (0.06, 0.07, 0.01), (0.0, sy * 0.06, 0.0), seg=16, rings=8)
        _own(piv, w)
    return root


def confetti(name, n=70, box=(1.6, 0.8, 1.4), z0=0.3, seed=3):
    """A field of confetti flakes; each flake is a child (render_scene animates fall/flutter)."""
    root = _empty(name)
    cols = ['#F28AA0', '#FFD45E', '#7FC8F8', '#9BE39A', '#B58CE0', '#FF9F68']
    rnd = random.Random(seed)
    for i in range(n):
        c = cols[i % len(cols)]
        f = _box(f'{name}_{i}', M(f'conf{c}', c, em=True), (0.045, 0.028, 0.003))
        f.parent = root
        f.location = (rnd.uniform(-box[0] / 2, box[0] / 2), rnd.uniform(-box[1] / 2, box[1] / 2), z0 + rnd.uniform(0, box[2]))
        f.rotation_euler = (rnd.uniform(0, 6.28), rnd.uniform(0, 6.28), rnd.uniform(0, 6.28))
    return root


def bunting(name, a, b, n=9, sag=0.12):
    root = _empty(name)
    a, b = Vector(a), Vector(b)
    cols = ['#E07A5F', '#F2CC8F', '#81B29A', '#3D5A80', '#F28AA0']
    pts = []
    for k in range(n + 1):
        t = k / n
        p = a.lerp(b, t)
        p.z -= sag * 4 * t * (1 - t)
        pts.append(p)
    for k in range(n):
        _own(root, tc.capsule(f'{name}_str{k}', M('string', '#5A3A2A', em=True), pts[k], pts[k + 1], 0.004), outline=False)
        mid = (pts[k] + pts[k + 1]) / 2
        bm = bmesh.new()
        w = (pts[k + 1] - pts[k]).length * 0.42
        v = [bm.verts.new(mid + Vector((-w, 0, 0))), bm.verts.new(mid + Vector((w, 0, 0))), bm.verts.new(mid + Vector((0, 0, -0.13)))]
        bm.faces.new(v)
        f = tc._new_obj(f'{name}_flag{k}', bm, M(f'flag{k % 5}', cols[k % 5], em=True))
        _own(root, f, thick=0.006)
        f.modifiers['Outline'].use_flip_normals = True
        sol = f.modifiers.new('Thick', 'SOLIDIFY')
        sol.thickness = 0.006
        f.modifiers.move(len(f.modifiers) - 1, 0)
    return root


def balloon(name, color, shade, h=1.3):
    root = _empty(name)
    _own(root, tc.ellipsoid(f'{name}_b', M(f'balloon{color}', color, shade), (0.11, 0.11, 0.14), (0, 0, h), seg=24, rings=14))
    _own(root, tc.cone(f'{name}_knot', M(f'balloon{color}', color, shade), (0, 0, h - 0.14), (0, 0, h - 0.17), 0.018, seg=8), outline=False)
    _own(root, tc.capsule(f'{name}_str', M('string', '#5A3A2A', em=True), (0, 0, h - 0.17), (0.02, 0, 0.45), 0.003), outline=False)
    return root


def flag(name):
    """Hand flag: stick along +Z from origin (grip), small waving flag at top."""
    root = _empty(name)
    _own(root, tc.capsule(f'{name}_stick', M('stick', '#8A5A3A', '#6A4028'), (0, 0, -0.04), (0, 0, 0.3), 0.007))
    _own(root, _box(f'{name}_cloth', M('flagcloth', '#E07A5F', '#C25E45'), (0.16, 0.008, 0.1), (0.08, 0, 0.25)))
    _own(root, _box(f'{name}_star', M('gold', '#F2C14E', em=True), (0.03, 0.01, 0.03), (0.08, -0.002, 0.25)), outline=False)
    return root



# ----------------------------------------------------------------------------- party & everyday (v2)
def cake(name):
    """Two-tier birthday cake on a plate; candle flames are children named *_flame* (flicker)."""
    root = _empty(name)
    _own(root, _cyl(f'{name}_plate', M('china', '#FFFFFF', '#E6E1D6'), 0.17, 0.012, (0, 0, 0.006)))
    _own(root, _cyl(f'{name}_t1', M('sponge', '#F7D9E3', '#E4B9C8'), 0.14, 0.1, (0, 0, 0.062)))
    _own(root, _cyl(f'{name}_t2', M('sponge2', '#FFF1D6', '#EBD5AE'), 0.095, 0.075, (0, 0, 0.15)))
    for k in range(10):  # icing drips
        a = 2 * math.pi * k / 10
        _own(root, tc.ellipsoid(f'{name}_drip{k}', M('icing', '#FFFFFF', '#EDE7DE'), (0.022, 0.012, 0.03), (0.138 * math.cos(a), 0.138 * math.sin(a), 0.1), seg=10, rings=6), outline=False)
    for k in range(8):
        a = 2 * math.pi * k / 8 + 0.3
        _own(root, tc.ellipsoid(f'{name}_berry{k}', M('berry', '#E0434F', '#B32E3A'), (0.014, 0.014, 0.014), (0.075 * math.cos(a), 0.075 * math.sin(a), 0.192), seg=10, rings=6), outline=False)
    cols = ['#7FC8F8', '#FFD45E', '#F28AA0']
    for k, (x, y) in enumerate(((-0.035, 0.0), (0.0, 0.03), (0.035, -0.005))):
        _own(root, _cyl(f'{name}_candle{k}', M(f'candle{k}', cols[k], em=True), 0.007, 0.07, (x, y, 0.222)), thick=0.004)
        _own(root, tc.ellipsoid(f'{name}_flame{k}', M('flame', '#FFB23E', em=True), (0.012, 0.012, 0.022), (x, y, 0.272), seg=10, rings=8), outline=False)
        _own(root, tc.ellipsoid(f'{name}_flamecore{k}', M('flamecore', '#FFF3B0', em=True), (0.006, 0.006, 0.011), (x, y - 0.006, 0.268), seg=8, rings=6), outline=False)
    return root


def party_hat(name, color='#F28AA0', stripe='#FFD45E'):
    """Cone party hat, origin at the base centre (sits on a head)."""
    root = _empty(name)
    _own(root, tc.cone(f'{name}_cone', M(f'phat{color}', color, em=True), (0, 0, 0), (0, 0, 0.2), 0.075, seg=24))
    _own(root, _cyl(f'{name}_band', M(f'phatb{stripe}', stripe, em=True), 0.07, 0.018, (0, 0, 0.03), r2=0.062), outline=False)
    _own(root, tc.ellipsoid(f'{name}_pom', M('pom', '#FFFFFF', em=True), (0.025, 0.025, 0.025), (0, 0, 0.205), seg=12, rings=8))
    return root


def gift(name, color='#7FC8F8', ribbon='#F28AA0', size=0.16):
    root = _empty(name)
    _own(root, _box(f'{name}_box', M(f'gift{color}', color, em=True), (size, size, size * 0.8), (0, 0, size * 0.4)))
    _own(root, _box(f'{name}_r1', M(f'rib{ribbon}', ribbon, em=True), (size * 1.02, size * 0.18, size * 0.82), (0, 0, size * 0.4)), outline=False)
    _own(root, _box(f'{name}_r2', M(f'rib{ribbon}', ribbon, em=True), (size * 0.18, size * 1.02, size * 0.82), (0, 0, size * 0.4)), outline=False)
    for sx in (-1, 1):
        _own(root, tc.ellipsoid(f'{name}_bow{sx}', M(f'rib{ribbon}', ribbon, em=True), (size * 0.2, size * 0.1, size * 0.12), (sx * size * 0.16, 0, size * 0.86), seg=12, rings=8))
    return root


def pizza_box(name, open_=False):
    root = _empty(name)
    card = M('cardboard', '#E9C98E', '#CFAE72')
    _own(root, _box(f'{name}_base', card, (0.3, 0.3, 0.04), (0, 0, 0.02)))
    if open_:
        _own(root, _box(f'{name}_lid', card, (0.3, 0.01, 0.3), (0, 0.15, 0.17)))
    else:
        _own(root, _box(f'{name}_logo', M('logo', '#C8432E', em=True), (0.12, 0.12, 0.004), (0, 0, 0.041)), outline=False)
    return root


def box_stack(name, n=6):
    """Wobbly tower of pizza boxes; origin at the bottom (hold under the hands)."""
    root = _empty(name)
    rnd = random.Random(9)
    for i in range(n):
        b = pizza_box(f'{name}_{i}')
        b.parent = root
        b.location = (rnd.uniform(-0.015, 0.015), rnd.uniform(-0.015, 0.015), i * 0.042)
        b.rotation_euler = (0, 0, rnd.uniform(-0.12, 0.12))
    return root


def sun_hat(name):
    """The Mayor's white sun hat as a wearable prop (origin at the head-contact point)."""
    root = _empty(name)
    hatm = M('hat', '#FBF3D6', '#DCCFA6')
    _own(root, tc.ellipsoid(f'{name}_brim', hatm, (0.47, 0.47, 0.022), (0, 0, 0.0), seg=36, rings=10))
    _own(root, tc.ellipsoid(f'{name}_crown', hatm, (0.23, 0.23, 0.135), (0, 0, 0.055), seg=28, rings=14))
    _own(root, tc.capsule(f'{name}_band', M('band', '#8C6A4A'), (0, 0, 0.016), (0, 0, 0.032), 0.232), outline=False)
    return root


def newspaper(name):
    root = _empty(name)
    paper = M('paper', '#F4F1E8', '#D9D4C6')
    _own(root, _box(f'{name}_p1', paper, (0.26, 0.18, 0.004), (0, 0, 0)))
    _own(root, _box(f'{name}_p2', paper, (0.24, 0.17, 0.004), (0.01, 0.005, 0.01)))
    for k in range(4):
        _own(root, _box(f'{name}_line{k}', M('ink', '#5A5560', em=True), (0.18, 0.012, 0.002), (0.0, -0.06 + 0.035 * k, 0.013)), outline=False)
    return root


def feather(name):
    root = _empty(name)
    _own(root, tc.ellipsoid(f'{name}_f', M('pigeon', '#9AA3B5', '#7A8397'), (0.05, 0.016, 0.004), (0, 0, 0), seg=14, rings=6), thick=0.004)
    _own(root, tc.capsule(f'{name}_q', M('quill', '#E8E4DA', em=True), (-0.06, 0, 0), (0.05, 0, 0), 0.002), outline=False)
    return root


def traffic_light(name):
    """Pole + housing with lamps *_lampR/_lampY/_lampG (blink by scale)."""
    root = _empty(name)
    pole = M('pole', '#3E3A45', '#2A2730')
    _own(root, _cyl(f'{name}_pole', pole, 0.03, 1.5, (0, 0, 0.75)))
    _own(root, _box(f'{name}_house', M('tlbox', '#2F2C36', '#1F1D24'), (0.14, 0.12, 0.4), (0, 0, 1.65)))
    for k, (c, z) in enumerate((('#FF4D4D', 1.78), ('#FFC53D', 1.65), ('#4CD964', 1.52))):
        _own(root, tc.ellipsoid(f'{name}_off{k}', M('tloff', '#4A4652', em=True), (0.04, 0.012, 0.04), (0, -0.062, z), seg=14, rings=8), outline=False)
        _own(root, tc.ellipsoid(f'{name}_lamp{"RYG"[k]}', M(f'tl{c}', c, em=True), (0.045, 0.016, 0.045), (0, -0.066, z), seg=14, rings=8), outline=False)
    return root


def podium(name):
    root = _empty(name)
    _own(root, _box(f'{name}_body', M('podium', '#3D5A80', '#2E4562'), (0.36, 0.26, 0.42), (0, 0, 0.21)))
    _own(root, _box(f'{name}_top', M('podtop', '#B7774A', '#935A33'), (0.42, 0.3, 0.04), (0, 0, 0.44)))
    _own(root, tc.ellipsoid(f'{name}_seal', M('gold', '#F2C14E', em=True), (0.07, 0.01, 0.07), (0, -0.135, 0.25), seg=18, rings=8))
    _own(root, tc.capsule(f'{name}_mic', M('pole', '#3E3A45', '#2A2730'), (0.08, 0, 0.46), (0.05, -0.08, 0.6), 0.008), outline=False)
    _own(root, tc.ellipsoid(f'{name}_micball', M('mic', '#5A5560', '#3E3A45'), (0.022, 0.022, 0.028), (0.05, -0.08, 0.62), seg=12, rings=8))
    return root


def mini_sofa(name, color='#E07A5F', shade='#C25E45'):
    """Chibi-scale sofa: seat top at z≈0.15 (matches the Sitting_* motions), seat centre at y=+0.16."""
    root = _empty(name)
    m = M(f'msofa{color}', color, shade)
    _own(root, _box(f'{name}_seat', m, (0.9, 0.42, 0.12), (0, 0.16, 0.08)))
    _own(root, _box(f'{name}_back', m, (0.9, 0.12, 0.42), (0, 0.38, 0.25)))
    for sx in (-0.48, 0.48):
        _own(root, _box(f'{name}_arm{sx}', m, (0.1, 0.46, 0.26), (sx, 0.18, 0.13)))
    _own(root, tc.ellipsoid(f'{name}_cush', M('cushion', '#F2CC8F', '#D9B072'), (0.12, 0.05, 0.1), (-0.3, 0.3, 0.26), seg=16, rings=8))
    return root


def banner_text(name, text='HAPPY BIRTHDAY!', color='#E07A5F', size=0.18):
    """Extruded 3D text on a string, centred at the origin, facing -Y."""
    root = _empty(name)
    cu = bpy.data.curves.new(f'{name}_txt', 'FONT')
    cu.body = text
    cu.align_x = 'CENTER'
    cu.align_y = 'CENTER'
    cu.size = size
    cu.extrude = 0.012
    cu.bevel_depth = 0.004
    ob = bpy.data.objects.new(f'{name}_txt', cu)
    bpy.context.scene.collection.objects.link(ob)
    ob.rotation_euler = (math.radians(90), 0, 0)
    ob.data.materials.append(M(f'banner{color}', color, em=True))
    ob.parent = root
    for o in bpy.context.selected_objects:
        o.select_set(False)
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.convert(target='MESH')
    ob = bpy.context.active_object
    tc.add_outline(ob, 0.006)
    return root


def string_lights(name, a, b, n=14, sag=0.15):
    root = _empty(name)
    a, b = Vector(a), Vector(b)
    cols = ['#FFD45E', '#F28AA0', '#7FC8F8', '#9BE39A']
    prev = None
    for k in range(n + 1):
        t = k / n
        p = a.lerp(b, t)
        p.z -= sag * 4 * t * (1 - t)
        if prev is not None:
            _own(root, tc.capsule(f'{name}_w{k}', M('string', '#5A3A2A', em=True), prev, p, 0.003), outline=False)
        if 0 < k < n:
            _own(root, tc.ellipsoid(f'{name}_bulb{k}', M(f'bulb{k % 4}', cols[k % 4], em=True), (0.018, 0.018, 0.025), p - Vector((0, 0, 0.03)), seg=10, rings=6), outline=False)
        prev = p
    return root


def door_glow(name, w=0.56, h=1.2):
    """Warm light leaking around a closed door (night scenes)."""
    root = _empty(name)
    g = M('doorglow', '#FFD27A', em=True)
    _own(root, _box(f'{name}_under', g, (w, 0.01, 0.018), (0, 0, 0.009)), outline=False)
    _own(root, _box(f'{name}_side', g, (0.012, 0.01, h), (w / 2 + 0.006, 0, h / 2)), outline=False)
    return root

BUILDERS = {
    'pizza': lambda n, p: pizza(n, p.get('missing', 1)),
    'slice': lambda n, p: slice_(n, False),
    'slice_bitten': lambda n, p: slice_(n, True),
    'crumbs': lambda n, p: crumbs(n),
    'dough': lambda n, p: dough(n),
    'coffee_cup': lambda n, p: coffee_cup(n),
    'coffee_splash': lambda n, p: coffee_splash(n),
    'tea_set': lambda n, p: tea_set(n),
    'teapot': lambda n, p: teapot(n),
    'tea_stream': lambda n, p: tea_stream(n, p['a'], p['b']),
    'pigeon': lambda n, p: pigeon(n),
    'confetti': lambda n, p: confetti(n, p.get('n', 70), tuple(p.get('box', (1.6, 0.8, 1.4))), p.get('z0', 0.3), p.get('seed', 3)),
    'bunting': lambda n, p: bunting(n, p['a'], p['b'], p.get('n', 9), p.get('sag', 0.12)),
    'balloon': lambda n, p: balloon(n, p.get('color', '#F28AA0'), p.get('shade', '#D96C84'), p.get('h', 1.3)),
    'flag': lambda n, p: flag(n),
    'table': lambda n, p: _table(n),
    'cake': lambda n, p: cake(n),
    'party_hat': lambda n, p: party_hat(n, p.get('color', '#F28AA0'), p.get('stripe', '#FFD45E')),
    'gift': lambda n, p: gift(n, p.get('color', '#7FC8F8'), p.get('ribbon', '#F28AA0'), p.get('size', 0.16)),
    'pizza_box': lambda n, p: pizza_box(n, p.get('open', False)),
    'box_stack': lambda n, p: box_stack(n, p.get('n', 6)),
    'sun_hat': lambda n, p: sun_hat(n),
    'newspaper': lambda n, p: newspaper(n),
    'feather': lambda n, p: feather(n),
    'traffic_light': lambda n, p: traffic_light(n),
    'podium': lambda n, p: podium(n),
    'mini_sofa': lambda n, p: mini_sofa(n),
    'banner_text': lambda n, p: banner_text(n, p.get('text', 'HAPPY BIRTHDAY!'), p.get('color', '#E07A5F'), p.get('size', 0.18)),
    'string_lights': lambda n, p: string_lights(n, p['a'], p['b'], p.get('n', 14), p.get('sag', 0.15)),
    'door_glow': lambda n, p: door_glow(n),
    'puzzle_box': lambda n, p: puzzle_box(n),
    'case_file': lambda n, p: case_file(n),
    'intercom': lambda n, p: intercom(n),
}


def _table(name):
    root = _empty(name)
    wood = M('table', '#B7774A', '#935A33')
    _own(root, _cyl(f'{name}_top', wood, 0.3, 0.035, (0, 0, 0.42)))
    _own(root, _cyl(f'{name}_leg', wood, 0.035, 0.4, (0, 0, 0.21)))
    _own(root, _cyl(f'{name}_foot', wood, 0.14, 0.025, (0, 0, 0.0125)))
    return root


def puzzle_box(name):
    root = _empty(name)
    wood = M('pbox', '#9E6A38', '#734A22')
    brass = M('pbrass', '#F2C14E', '#C9982E')
    _own(root, _box(f'{name}_cube', wood, (0.35, 0.35, 0.35), (0, 0, 0.175)))
    _own(root, _cyl(f'{name}_ring', brass, 0.08, 0.05, (0, 0, 0.375)))
    return root


def case_file(name):
    root = _empty(name)
    manila = M('cfile', '#D6BE8B', '#B59C68')
    red = M('cseal', '#D93829', '#A82518')
    _own(root, _box(f'{name}_folder', manila, (0.45, 0.6, 0.06), (0, 0, 0.03)))
    _own(root, _cyl(f'{name}_seal', red, 0.08, 0.02, (0, 0, 0.07)))
    return root


def intercom(name):
    root = _empty(name)
    metal = M('intmetal', '#3A424D', '#242930')
    red = M('intred', '#FF3838', em=True)
    _own(root, _box(f'{name}_box', metal, (0.2, 0.3, 0.12), (0, 0, 0.15)))
    _own(root, _cyl(f'{name}_btn', red, 0.04, 0.04, (0, 0.06, 0.15)))
    return root


def build(kind, name, params=None):
    if kind not in BUILDERS:
        raise ValueError(f'Unknown prop {kind}; have {sorted(BUILDERS)}')
    return BUILDERS[kind](name, params or {})
