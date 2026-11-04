"""Boîte à outils commune aux brainrots modélisés dans Blender.

Chaque créature est un script (`tools/blender/brainrots/<id>.py`) qui
construit ses pièces avec ces fonctions, puis appelle `export_ts`. Le jeu lit le
module écrit (`src/app/three/models/brainrots/<id>-mesh.ts`) : une liste de
pièces, chacune avec sa couleur, ses sommets et ses triangles, dans le repère
de three (Y en haut, face vers +Z). Les yeux ne sont pas modélisés ici : ils
passent par le système `Gaze` de `brainrot.ts`, que l'utilisateur veut garder.

Même méthode que le moyai (`moyai.py`) : des blocs aux arêtes arrondies, la
forme de How to Fish, fondus par remaillage voxel quand ils forment une seule
masse, puis ramenés en facettes plates par décimation.
"""
import math
import bpy
import bmesh
from mathutils import Vector

NL = chr(10)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def _activate(ob):
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob


def _apply(ob, mod):
    _activate(ob)
    bpy.ops.object.modifier_apply(modifier=mod.name)


def bevel(ob, width, segments=3):
    mod = ob.modifiers.new('bevel', 'BEVEL')
    mod.width = width
    mod.segments = segments
    mod.limit_method = 'NONE'
    _apply(ob, mod)
    return ob


def block(name, size, loc, round_=0.1, segments=3, corners=None):
    """Boîte aux arêtes arrondies. `corners(x, y, z) -> (x, y, z)` déforme les
    huit coins **avant** l'arrondi : déformés après, les arêtes se plient."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if corners:
        for v in ob.data.vertices:
            v.co = Vector(corners(*v.co))
    if round_:
        bevel(ob, round_, segments)
    return ob


def capsule(name, start, end, radius, segments=8):
    """Membre : un cylindre à bouts ronds entre deux points."""
    a, b = Vector(start), Vector(end)
    axis = b - a
    bpy.ops.mesh.primitive_cylinder_add(vertices=segments, radius=radius, depth=axis.length,
                                        location=(a + b) / 2)
    ob = bpy.context.active_object
    ob.name = name
    ob.rotation_mode = 'QUATERNION'
    ob.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(axis.normalized())
    bpy.ops.object.transform_apply(rotation=True)
    bevel(ob, radius * 0.6, 2)
    return ob


def sphere(name, loc, radius, scale=(1, 1, 1), segments=8, rings=6):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=radius, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = scale
    bpy.ops.object.transform_apply(scale=True)
    return ob


def cone(name, loc, radius, depth, rot=(0, 0, 0), vertices=4):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius, depth=depth, location=loc, rotation=rot)
    ob = bpy.context.active_object
    ob.name = name
    return ob


def join(parts, name):
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    parts[0].name = name
    return parts[0]


def fuse(ob, voxel=0.03):
    """Une seule masse : les blocs qui se chevauchent deviennent une surface."""
    mod = ob.modifiers.new('remesh', 'REMESH')
    mod.mode = 'VOXEL'
    mod.voxel_size = voxel
    _apply(ob, mod)
    return ob


def carve(ob, cutter):
    """Soustraction, **après** `fuse` : sur des blocs qui se chevauchent encore,
    la soustraction exacte prend l'intérieur pour l'extérieur."""
    mod = ob.modifiers.new('cut', 'BOOLEAN')
    mod.operation = 'DIFFERENCE'
    mod.object = cutter
    mod.solver = 'EXACT'
    _apply(ob, mod)
    bpy.data.objects.remove(cutter)
    return ob


def facet(ob, ratio, smooth=0.5, iterations=3):
    """Lissage léger puis décimation : des facettes plates, pas de bruit."""
    if iterations:
        sm = ob.modifiers.new('smooth', 'SMOOTH')
        sm.factor = smooth
        sm.iterations = iterations
        _apply(ob, sm)
    dec = ob.modifiers.new('decimate', 'DECIMATE')
    dec.decimate_type = 'COLLAPSE'
    dec.ratio = ratio
    _apply(ob, dec)
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.dissolve_degenerate(bm, dist=0.004, edges=bm.edges[:])
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(ob.data)
    bm.free()
    return ob


def paint(ob, color):
    """Couleur de la pièce, en hexadécimal comme dans le jeu."""
    ob['color'] = color
    mat = bpy.data.materials.new(ob.name)
    mat.use_nodes = True
    r, g, b = ((color >> 16) & 255, (color >> 8) & 255, color & 255)
    srgb = [c / 255 for c in (r, g, b)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb]
    mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*lin, 1)
    mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.85
    ob.data.materials.clear()
    ob.data.materials.append(mat)
    return ob


def export_ts(objects, path, const, note):
    """Écrit les pièces pour le jeu. Blender (x, y, z) → three (x, z, -y)."""
    out = ['// Généré par ' + note + ' — ne pas retoucher à la main.',
           '// Repère three : Y vers le haut, la face regarde vers +Z.', '',
           'export const ' + const + ' = [']
    total = 0
    for ob in objects:
        bm = bmesh.new()
        bm.from_mesh(ob.data)
        bm.transform(ob.matrix_world)
        bmesh.ops.triangulate(bm, faces=bm.faces[:])
        pos = []
        for v in bm.verts:
            pos += [round(v.co.x, 4), round(v.co.z, 4), round(-v.co.y, 4)]
        bm.verts.index_update()
        idx = []
        for f in bm.faces:
            idx += [v.index for v in f.verts]
        total += len(bm.faces)
        bm.free()
        out.append('  { color: 0x%06x, positions: [%s], indices: [%s] },' % (
            ob['color'], ','.join(repr(p) for p in pos), ','.join(map(str, idx))))
    out.append('] as const;')
    with open(path, 'w', encoding='utf8', newline=NL) as f:
        f.write(NL.join(out) + NL)
    print('TS', len(objects), 'pièces', total, 'triangles')


def render(png, views=((-28, ''), (-90, '-profil')), distance=7.5, height=0.0):
    """Rendu de contrôle, éclairage calé sur `snapshot.ts`, fond du thème."""
    scene = bpy.context.scene
    world = bpy.data.worlds.new('world')
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.017, 0.017, 0.014, 1)
    for name, energy, rot in (('key', 1.1, (52, 18, -32)), ('rim', 0.5, (-60, 0, 150)), ('fill', 0.25, (70, 0, 60))):
        d = bpy.data.lights.new(name, 'SUN')
        d.energy = energy
        o = bpy.data.objects.new(name, d)
        o.rotation_euler = tuple(math.radians(a) for a in rot)
        scene.collection.objects.link(o)
    cam_data = bpy.data.cameras.new('cam')
    cam_data.lens_unit = 'FOV'
    cam_data.angle = math.radians(35)
    cam = bpy.data.objects.new('cam', cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x = 800
    scene.render.resolution_y = 800
    scene.view_settings.view_transform = 'Standard'
    for deg, suffix in views:
        t = math.radians(deg)
        cam.location = (math.sin(t) * distance, -math.cos(t) * distance, height)
        cam.rotation_euler = (math.radians(90), 0, t)
        scene.render.filepath = png.replace('.png', suffix + '.png')
        bpy.ops.render.render(write_still=True)
