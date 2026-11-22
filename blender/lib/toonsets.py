"""
Procedural cel-shaded sets for Tiny World Stories (same toon look as the characters).

Each set builder places the ground at z=0, keeps the acting area around x∈[-1.2, 1.2], y∈[-0.6, 0.6],
and dresses the background for a portrait (9:16) camera looking down +Y.
Sets: street, home, park, kitchen.
"""
import math
import random

import bmesh
import bpy
from mathutils import Matrix, Vector

import toonchar as tc


def M(name, base, shade=None, em=False):
    return tc.toon_mat(f'set_{name}', base, shade, em)


def box(name, mat, size, loc, outline=True, bevel=0.0):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    bmesh.ops.translate(bm, vec=Vector(loc), verts=bm.verts)
    ob = tc._new_obj(name, bm, mat)
    for p in ob.data.polygons:
        p.use_smooth = False
    if bevel:
        mod = ob.modifiers.new('Bevel', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
    if outline:
        tc.add_outline(ob, 0.014)
    return ob


def roof(name, mat, width, depth, height, loc):
    """Triangular prism roof (ridge along X)."""
    x, y, z = loc
    w, d = width / 2, depth / 2
    bm = bmesh.new()
    v = [bm.verts.new(p) for p in (
        (x - w, y - d, z), (x + w, y - d, z), (x + w, y + d, z), (x - w, y + d, z),
        (x - w, y, z + height), (x + w, y, z + height))]
    for f in ((0, 1, 5, 4), (2, 3, 4, 5), (0, 4, 3), (1, 2, 5), (0, 3, 2, 1)):
        bm.faces.new([v[i] for i in f])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = tc._new_obj(name, bm, mat)
    for p in ob.data.polygons:
        p.use_smooth = False
    tc.add_outline(ob, 0.014)
    return ob


def blob(name, mat, size, loc, outline=True):
    ob = tc.ellipsoid(name, mat, size, loc, seg=20, rings=12)
    if outline:
        tc.add_outline(ob, 0.014)
    return ob


def sky(top='#F6B98A', bottom='#FBE7C6', dist=14.0):
    """Big vertical gradient card behind everything + puffy clouds."""
    mat = bpy.data.materials.new('set_sky')
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    em = nt.nodes.new('ShaderNodeEmission')
    tco = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = tc.srgb(bottom)
    ramp.color_ramp.elements[0].position = 0.25
    ramp.color_ramp.elements[1].color = tc.srgb(top)
    ramp.color_ramp.elements[1].position = 0.85
    nt.links.new(tco.outputs['Generated'], sep.inputs[0])
    nt.links.new(sep.outputs['Y'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], em.inputs['Color'])
    nt.links.new(em.outputs[0], out.inputs[0])
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, dist, 4.0))
    pl = bpy.context.active_object
    pl.name = 'Sky'
    pl.scale = (40, 16, 1)
    pl.rotation_euler = (math.radians(90), 0, 0)
    pl.data.materials.append(mat)
    cloud = M('cloud', '#FFF7EC', em=True)
    rnd = random.Random(7)
    for i in range(7):
        cx, cz = rnd.uniform(-7, 7), rnd.uniform(4.2, 8.5)
        for k in range(4):
            blob(f'cloud{i}_{k}', cloud, (0.7 + rnd.random() * 0.5, 0.2, 0.38 + rnd.random() * 0.2),
                 (cx + k * 0.6 - 0.9, dist - 0.5, cz + (0.15 if k in (1, 2) else 0)), outline=False)


def ground(color, shade, size=(40, 30), y0=0.0):
    return box('Ground', M('ground', color, shade), (size[0], size[1], 0.2), (0, y0 + size[1] / 2 - 6, -0.1), outline=False)


def tree(name, x, y, s=1.0, leaf='#7FA656', leaf_sh='#5E8440'):
    trunk = M('trunk', '#8A5A3A', '#6A4028')
    leaves = M('leaf', leaf, leaf_sh)
    box(f'{name}_trunk', trunk, (0.16 * s, 0.16 * s, 0.9 * s), (x, y, 0.45 * s))
    blob(f'{name}_l0', leaves, (0.55 * s, 0.5 * s, 0.5 * s), (x, y, 1.15 * s))
    blob(f'{name}_l1', leaves, (0.42 * s, 0.4 * s, 0.4 * s), (x - 0.32 * s, y, 0.95 * s))
    blob(f'{name}_l2', leaves, (0.42 * s, 0.4 * s, 0.4 * s), (x + 0.32 * s, y, 0.98 * s))


def house(name, x, y, w, h, wall, wall_sh, roof_c, roof_sh, door='#7B4A2E'):
    box(f'{name}_wall', M(f'wall{wall}', wall, wall_sh), (w, 1.2, h), (x, y, h / 2))
    roof(f'{name}_roof', M(f'roof{roof_c}', roof_c, roof_sh), w + 0.25, 1.4, 0.7, (x, y, h))
    glass = M('glass', '#FFE6A8', em=True)
    frame = M('frame', '#FFF4E2', '#E8D6BC')
    # Door sized for the chibi cast (~1.05 tall): 1.2 tall, 0.56 wide, with frame, step and knob
    box(f'{name}_doorframe', M('frame', '#FFF4E2', '#E8D6BC'), (0.66, 0.05, 1.27), (x, y - 0.605, 0.635))
    box(f'{name}_door', M(f'door{door}', door, '#5A3420'), (0.56, 0.06, 1.2), (x, y - 0.62, 0.6))
    box(f'{name}_doorpanel', M(f'doorp{door}', '#8E5A3A', '#6E4228'), (0.36, 0.02, 0.36), (x, y - 0.655, 0.86), outline=False)
    blob(f'{name}_knob', M('gold', '#F2C14E', '#D9A532'), (0.03, 0.025, 0.03), (x + 0.19, y - 0.665, 0.58))
    box(f'{name}_step', M('step', '#D2C2AA', '#B5A48B'), (0.8, 0.25, 0.06), (x, y - 0.72, 0.03))
    for wx in (-w * 0.335, w * 0.335):
        for wz in ([max(h * 0.68, 1.42)] if h < 1.9 else [h * 0.45, h * 0.78]):
            box(f'{name}_wf{wx}{wz}', frame, (0.36, 0.05, 0.36), (x + wx, y - 0.61, wz))
            box(f'{name}_wg{wx}{wz}', glass, (0.27, 0.06, 0.27), (x + wx, y - 0.625, wz), outline=False)


def lamp(name, x, y):
    pole = M('pole', '#3E3A45', '#2A2730')
    box(f'{name}_pole', pole, (0.06, 0.06, 1.6), (x, y, 0.8))
    blob(f'{name}_bulb', M('bulb', '#FFE9A6', em=True), (0.11, 0.11, 0.13), (x, y, 1.65))


# ----------------------------------------------------------------------------- sets
def build_street():
    sky('#F4A97C', '#FCE3C0')
    ground('#C9B7A0', '#A8957F')  # road
    box('Sidewalk', M('sidewalk', '#E6D8C2', '#CDBDA4'), (40, 1.4, 0.06), (0, 1.3, 0.03), outline=False)
    box('Curb', M('curb', '#D2C2AA', '#B5A48B'), (40, 0.12, 0.09), (0, 0.6, 0.045), outline=False)
    palette = [('#F3C9A0', '#DDAE84', '#C9533A', '#A23F2B'), ('#BFD8D2', '#9EBDB6', '#5C6E9E', '#465781'),
               ('#F7E3A1', '#E0C67F', '#B5543F', '#8F3F2F'), ('#E8B4B8', '#CF979C', '#6F5A86', '#56456A'),
               ('#CFE3B0', '#B1C992', '#C66B3D', '#9F512C')]
    for i, xx in enumerate((-5.0, -3.3, -1.6, 0.1, 1.8, 3.5, 5.2)):
        c = palette[i % len(palette)]
        house(f'H{i}', xx, 2.8 + (0.15 if i % 2 else 0), 1.55, 1.7 + (i % 3) * 0.35, *c)
    for i, xx in enumerate((-4.15, -0.75, 2.65)):
        tree(f'T{i}', xx, 1.9, 0.9)
    for i, xx in enumerate((-2.45, 0.95, 4.35)):
        lamp(f'L{i}', xx, 1.75)


def build_park():
    sky('#9FCBEA', '#E8F4F6')
    ground('#9BC46B', '#7DA651')
    box('Path', M('path', '#E7D3AE', '#CDB892'), (40, 1.0, 0.03), (0, 0.0, 0.015), outline=False)
    for i, (xx, yy, s) in enumerate(((-3.2, 3.0, 1.3), (-1.4, 4.0, 1.1), (1.0, 3.4, 1.4), (3.4, 3.0, 1.2),
                                     (5.0, 4.5, 1.0), (-5.0, 4.4, 1.2), (-2.3, 2.0, 0.8), (2.4, 1.9, 0.85))):
        tree(f'T{i}', xx, yy, s)
    wood = M('bench', '#B7774A', '#935A33')
    box('Bench_seat', wood, (1.1, 0.35, 0.07), (1.6, 1.1, 0.36))
    box('Bench_back', wood, (1.1, 0.07, 0.3), (1.6, 1.27, 0.6))
    for bx in (1.15, 2.05):
        box(f'Bench_leg{bx}', M('pole', '#3E3A45', '#2A2730'), (0.06, 0.3, 0.33), (bx, 1.1, 0.165))
    flower_cols = ['#F28AA0', '#FFD45E', '#FFFFFF', '#B58CE0']
    rnd = random.Random(3)
    for i in range(40):
        x, y = rnd.uniform(-5, 5), rnd.uniform(0.9, 3.5)
        blob(f'F{i}', M(f'flower{i % 4}', flower_cols[i % 4], em=True), (0.05, 0.05, 0.05), (x, y, 0.06), outline=False)
    lamp('L0', -1.8, 1.0)


def build_home():
    floor = M('floor', '#D9A877', '#BD8B5C')
    wallm = M('wall', '#F6E2C4', '#E2C9A6')
    box('Floor', floor, (12, 8, 0.1), (0, 2.0, -0.05), outline=False)
    box('BackWall', wallm, (12, 0.2, 5), (0, 2.2, 2.5), outline=False)
    box('Skirting', M('skirt', '#C98E62', '#A9724A'), (12, 0.06, 0.14), (0, 2.08, 0.07), outline=False)
    # window with sky
    box('Win_frame', M('frame', '#FFF4E2', '#E8D6BC'), (1.3, 0.08, 1.15), (-1.2, 2.06, 1.55))
    box('Win_sky', M('winsky', '#A9D6F2', em=True), (1.1, 0.09, 0.95), (-1.2, 2.04, 1.55), outline=False)
    box('Win_bar', M('frame', '#FFF4E2', '#E8D6BC'), (0.05, 0.1, 0.95), (-1.2, 2.02, 1.55), outline=False)
    # sofa
    sofa = M('sofa', '#E07A5F', '#C25E45')
    box('Sofa_base', sofa, (1.7, 0.7, 0.38), (1.2, 1.6, 0.22), bevel=0.04)
    box('Sofa_back', sofa, (1.7, 0.22, 0.5), (1.2, 1.9, 0.6), bevel=0.04)
    for sx in (0.42, 1.98):
        box(f'Sofa_arm{sx}', sofa, (0.2, 0.7, 0.5), (sx, 1.6, 0.32), bevel=0.04)
    blob('Cushion', M('cushion', '#F2CC8F', '#D9B072'), (0.2, 0.08, 0.17), (0.75, 1.68, 0.56))
    # picture + lamp + rug + plant
    box('Pic_frame', M('picf', '#8A5A3A', '#6A4028'), (0.7, 0.05, 0.5), (1.2, 2.08, 1.6))
    box('Pic_art', M('picart', '#81B29A', em=True), (0.58, 0.06, 0.38), (1.2, 2.06, 1.6), outline=False)
    box('Rug', M('rug', '#3D5A80', '#2E4562'), (2.6, 1.6, 0.02), (0.0, 0.1, 0.012), outline=False)
    lamp('Lamp', -2.2, 1.7)
    box('Pot', M('pot', '#C9533A', '#A23F2B'), (0.3, 0.3, 0.32), (-2.0, 1.2, 0.16))
    blob('Plant', M('leaf', '#7FA656', '#5E8440'), (0.3, 0.3, 0.38), (-2.0, 1.2, 0.6))
    bpy.data.worlds[0].node_tree.nodes['Background'].inputs['Strength'].default_value = 0.7


def build_kitchen():
    build_home_shell = M('kwall', '#FBEFD9', '#E6D3B4')
    box('Floor', M('kfloor', '#E9E1D3', '#CFC5B4'), (12, 8, 0.1), (0, 2.0, -0.05), outline=False)
    box('BackWall', build_home_shell, (12, 0.2, 5), (0, 2.2, 2.5), outline=False)
    tile = M('tile', '#9CC7C2', '#7FAAA5')
    for i in range(-8, 9):
        box(f'Tile{i}', tile, (0.32, 0.03, 0.32), (i * 0.36, 2.09, 1.25), outline=False)
    counter = M('counter', '#F5F5F0', '#DCDCD4')
    top = M('ctop', '#8A5A3A', '#6A4028')
    box('Counter', counter, (5.0, 0.7, 0.85), (0.0, 1.7, 0.425))
    box('Counter_top', top, (5.1, 0.78, 0.07), (0.0, 1.68, 0.885))
    box('Oven', M('oven', '#3E3A45', '#2A2730'), (0.8, 0.05, 0.55), (-1.4, 1.33, 0.4))
    box('Oven_glass', M('ovenglass', '#FFB55E', em=True), (0.6, 0.06, 0.3), (-1.4, 1.31, 0.4), outline=False)
    for i, px in enumerate((0.6, 1.0, 1.4)):
        box(f'Pan{i}', M('pan', '#5A5560', '#3E3A45'), (0.26, 0.04, 0.26), (px, 2.06, 2.0 - i * 0.05))
    blob('Pizza_display', M('pizza', '#F2B84B', '#D99A2E'), (0.32, 0.32, 0.03), (1.4, 1.62, 0.95))


def build_prison():
    sky('#24303D', '#121820')
    box('Floor', M('pfloor', '#363D47', '#22272E'), (14, 10, 0.1), (0, 1.5, -0.05), outline=False)
    stone_mat = M('pwall', '#48525F', '#2C323B')
    box('BackWall', stone_mat, (14, 0.4, 6), (0, 3.2, 3.0))
    box('Window_frame', M('wframe', '#1A1D22', '#101216'), (1.8, 0.5, 1.4), (0, 3.2, 4.2))
    box('Window_glass', M('wglass', '#6BA4D8', em=True), (1.4, 0.55, 1.0), (0, 3.2, 4.2), outline=False)
    bar_mat = M('bar', '#1A1E24', '#101317')
    box('Bar_top', bar_mat, (10, 0.14, 0.14), (0, -0.8, 5.0))
    box('Bar_bot', bar_mat, (10, 0.14, 0.14), (0, -0.8, 0.05))
    for i in range(-10, 11):
        box(f'IronBar_{i}', bar_mat, (0.07, 0.07, 5.0), (i * 0.45, -0.8, 2.5))
    cot_mat = M('cot', '#252B33', '#171B20')
    box('Cot_frame', cot_mat, (2.2, 1.1, 0.08), (-1.8, 1.8, 0.45))
    box('Cot_mattress', M('mattress', '#566270', '#3D4650'), (2.1, 1.0, 0.14), (-1.8, 1.8, 0.56))
    box('Cot_pillow', M('pillow', '#8692A0', '#66717E'), (0.7, 0.8, 0.12), (-2.4, 1.8, 0.68))


def build_warden_office():
    sky('#3A2A1E', '#1C140E')
    box('Floor', M('ofloor', '#543621', '#3B2414'), (14, 10, 0.1), (0, 1.5, -0.05), outline=False)
    wood_mat = M('owall', '#63432B', '#48301D')
    box('BackWall', wood_mat, (14, 0.4, 6), (0, 3.2, 3.0))
    box('W_desk', M('wdesk', '#3B2011', '#26140A'), (2.6, 1.3, 0.8), (0.0, 1.2, 0.4))
    box('W_chair', M('wchair', '#1A1C22', '#101216'), (0.8, 0.8, 1.3), (0.0, 2.2, 0.65))
    box('Bookshelf', M('bshelf', '#4A2D19', '#321D0E'), (1.8, 0.5, 3.2), (-2.8, 2.8, 1.6))
    box('Book1', M('b1', '#9E2A2B', em=True), (0.3, 0.35, 0.4), (-2.8, 2.7, 0.8), outline=False)
    box('Book2', M('b2', '#335C67', em=True), (0.3, 0.35, 0.4), (-2.8, 2.7, 1.6), outline=False)
    box('Book3', M('b3', '#E09F3E', em=True), (0.3, 0.35, 0.4), (-2.8, 2.7, 2.4), outline=False)
    # Banker's lamp on desk
    box('Lamp_base', M('lbase', '#D4AF37', '#AA8C2C'), (0.16, 0.16, 0.04), (0.85, 1.2, 0.82))
    box('Lamp_stem', M('lstem', '#D4AF37', '#AA8C2C'), (0.04, 0.04, 0.28), (0.85, 1.2, 0.96))
    box('Lamp_shade', M('lshade', '#1B4332', em=True), (0.28, 0.14, 0.12), (0.85, 1.2, 1.12), outline=False)


def build_laundry():
    sky('#222C38', '#141A22')
    box('Floor', M('laundry_floor', '#4A5568', '#323B4A'), (14, 10, 0.1), (0, 1.5, -0.05), outline=False)
    box('BackWall', M('laundry_wall', '#718096', '#4A5568'), (14, 0.4, 6), (0, 3.2, 3.0))
    # Washers
    w_mat = M('washer', '#EDF2F7', '#CBD5E0')
    door_mat = M('wdoor', '#4A5568', '#2D3748')
    glass_mat = M('wglass', '#63B3ED', em=True)
    for i, x in enumerate((-2.2, -0.7, 0.8, 2.3)):
        box(f'Washer_{i}', w_mat, (1.1, 1.1, 1.4), (x, 2.2, 0.7))
        box(f'WasherDoor_{i}', door_mat, (0.7, 0.1, 0.7), (x, 1.62, 0.75))
        box(f'WasherGlass_{i}', glass_mat, (0.5, 0.12, 0.5), (x, 1.61, 0.75), outline=False)
    # Laundry hamper
    box('Hamper', M('hamper', '#D69E2E', '#975A16'), (1.0, 0.8, 0.9), (-1.8, 0.6, 0.45))
    box('Jumpsuits', M('jumpsuits', '#DD6B20', em=True), (0.85, 0.65, 0.3), (-1.8, 0.6, 0.9), outline=False)


def build_prison_gates():
    sky('#5D7896', '#2A3A4E')
    box('Ground', M('gates_ground', '#3A424D', '#242930'), (20, 20, 0.1), (0, 1.5, -0.05), outline=False)
    pillar_mat = M('pillar', '#5A6577', '#3D4552')
    box('Pillar_L', pillar_mat, (1.8, 1.8, 6.0), (-3.2, 2.0, 3.0))
    box('Pillar_R', pillar_mat, (1.8, 1.8, 6.0), (3.2, 2.0, 3.0))
    bar_mat = M('gate_bar', '#1A1E24', '#101317')
    box('Gate_L', bar_mat, (2.6, 0.14, 4.5), (-1.4, 2.0, 2.25))
    box('Gate_R', bar_mat, (2.6, 0.14, 4.5), (1.4, 2.0, 2.25))
    hazard_mat = M('hazard', '#ECC94B', em=True)
    box('Hazard_L', hazard_mat, (2.4, 0.18, 0.25), (-1.4, 1.99, 0.4), outline=False)
    box('Hazard_R', hazard_mat, (2.4, 0.18, 0.25), (1.4, 1.99, 0.4), outline=False)


SETS = {
    'street': build_street,
    'park': build_park,
    'home': build_home,
    'kitchen': build_kitchen,
    'prison': build_prison,
    'office': build_warden_office,
    'laundry': build_laundry,
    'gates': build_prison_gates,
}


def build_set(name):
    if name not in SETS:
        raise ValueError(f'Unknown set {name}; have {list(SETS)}')
    SETS[name]()
