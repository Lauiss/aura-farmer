"""Tête de moyai, modélisée dans Blender.

    D:/blender/blender.exe -b -P tools/blender/moyai.py -- <sortie.glb> [<rendu.png>] [<moyai-mesh.ts>]

Le jeu lit `src/app/three/models/moyai-mesh.ts`, que ce script écrit : les
sommets et les triangles de chaque matériau, déjà passés dans le repère de
three (Y vers le haut, face vers +Z). Le chargement reste synchrone — les
vignettes, le favicon et Chad construisent la tête d'un seul appel — et le
modèle reste du code versionné ; le .glb n'est qu'une copie pour Blender.

La forme suit How to Fish (forme seulement) : des volumes simples et gonflés,
blocs à angles arrondis, puis fondus en une seule pierre par un remaillage
voxel et ramenés en facettes plates par décimation. Les traits sont ceux des
moai de Rapa Nui et du 🗿 : arcade lourde en surplomb, orbites creusées dessous,
nez long qui s'évase en narines, lèvres pincées projetées, menton relevé,
oreilles longues et rectangulaires, crâne plat coupé net sous la mâchoire.

Repère Blender : Z vers le haut, la face regarde vers -Y. Hauteur ≈ 2,7, comme
la tête actuelle (gabarit des créatures à 2,8).
"""
import sys
import math
import bpy
import bmesh
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
GLB = argv[0] if argv else None
PNG = argv[1] if len(argv) > 1 and argv[1] else None
TS = argv[2] if len(argv) > 2 else None

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def block(name, size, loc, bevel=0.12, segments=3, taper=None):
    """Boîte aux arêtes arrondies. `taper` : {coin: décalage} sur les sommets
    du haut (+z) ou de l'avant (-y), pour incliner un plan sans sculpter."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if taper:
        me = ob.data
        for v in me.vertices:
            for test, offset in taper:
                if test(v.co):
                    v.co += Vector(offset)
    if bevel:
        mod = ob.modifiers.new('bevel', 'BEVEL')
        mod.width = bevel
        mod.segments = segments
        mod.limit_method = 'NONE'
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return ob


def cut(target, cutter):
    mod = target.modifiers.new('cut', 'BOOLEAN')
    mod.operation = 'DIFFERENCE'
    mod.object = cutter
    mod.solver = 'EXACT'
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter)


def join(parts):
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    return parts[0]


top = lambda co: co.z > 0
front = lambda co: co.y < 0
front_top = lambda co: co.z > 0 and co.y < 0
back_top = lambda co: co.z > 0 and co.y > 0
bottom_front = lambda co: co.z < 0 and co.y < 0

# --- Le bloc du crâne : haut, plus profond en haut, front qui fuit ---------
# Un seul bloc du sommet à la coupe : une mâchoire posée à part se lisait
# comme un tiroir sous le visage. C'est l'élargissement du bas qui la dessine.
skull = block('skull', (1.4, 1.2, 2.7), (0, 0.1, 1.35), bevel=0.3, segments=4,
              taper=[(front_top, (0, 0.2, 0)), (back_top, (0, -0.06, 0)),
                     (bottom_front, (0, -0.06, 0)),
                     # La mâchoire s'élargit : sur les huit coins du bloc,
                     # **avant** l'arrondi. Élargi après, l'arrondi des arêtes
                     # verticales se pliait à mi-hauteur et tirait une fente
                     # noire sur l'arrière du crâne.
                     (lambda co: co.z < 0 and co.x > 0, (0.042, 0, 0)),
                     (lambda co: co.z < 0 and co.x < 0, (-0.042, 0, 0))])

# --- L'arcade : un bourrelet qui déborde du front, pas une visière -------
brow = block('brow', (1.4, 0.42, 0.24), (0, -0.54, 2.0), bevel=0.1, segments=3,
             taper=[(front_top, (0, 0.14, 0))])
# Ses extrémités fuient vers les tempes : droite, elle se lisait comme une
# casquette.
for v in brow.data.vertices:
    v.co = v.co + Vector((0, 0.22 * (abs(v.co.x) / 0.68) ** 2, 0))

# --- Le nez : une arête longue qui part de l'arcade et s'évase en bas ----
def hexa(name, top, bottom, loc, bevel):
    """Hexaèdre décrit par ses deux faces (quatre coins chacune, dans l'ordre
    avant-gauche, avant-droit, arrière-droit, arrière-gauche), normales
    recalculées. Une boîte déformée sommet par sommet donnait au remaillage un
    volume qu'il lisait comme une arête mince."""
    me = bpy.data.meshes.new(name)
    verts = [Vector(c) for c in bottom] + [Vector(c) for c in top]
    faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    me.from_pydata(verts, [], faces)
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    ob.location = loc
    scene.collection.objects.link(ob)
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    mod = ob.modifiers.new('bevel', 'BEVEL')
    mod.width = bevel
    mod.segments = 3
    mod.limit_method = 'NONE'
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return ob


# Un coin et non une barre : mince et collé au front à la racine, profond et
# large en bas, où les ailes s'écartent.
nose = hexa('nose',
            top=[(-0.12, -0.04, 0.56), (0.12, -0.04, 0.56), (0.12, 0.5, 0.56), (-0.12, 0.5, 0.56)],
            bottom=[(-0.3, -0.36, -0.56), (0.3, -0.36, -0.56), (0.3, 0.5, -0.56), (-0.3, 0.5, -0.56)],
            loc=(0, -0.62, 1.36), bevel=0.08)

# --- La bouche : une seule lèvre en moue, projetée ------------------------
lip = block('lip', (0.7, 0.3, 0.28), (0, -0.54, 0.6), bevel=0.12, segments=3,
            taper=[(lambda co: co.y < 0, (0, -0.04, 0))])

# --- Le menton : relevé, qui avance sous la lèvre -------------------------
chin = block('chin', (0.9, 0.3, 0.3), (0, -0.46, 0.2), bevel=0.12, segments=3,
             taper=[(bottom_front, (0, 0.1, 0))])

# --- Les oreilles : longues dalles rectangulaires collées aux tempes ------
ears = []
for side in (-1, 1):
    ears.append(block('ear', (0.16, 0.34, 1.2), (side * 0.72, 0.18, 1.3), bevel=0.07, segments=2,
                      taper=[(lambda co: co.z < 0, (0, -0.06, 0))]))

head = join([skull, brow, nose, lip, chin, *ears])

# --- Une seule pierre : remaillage voxel, creux, lissage, puis facettes --
bpy.context.view_layer.objects.active = head
head.select_set(True)
rem = head.modifiers.new('remesh', 'REMESH')
rem.mode = 'VOXEL'
rem.voxel_size = 0.03
bpy.ops.object.modifier_apply(modifier=rem.name)

# Les creux se creusent **après** la fusion : sur des blocs qui se chevauchent
# encore, la soustraction exacte prend l'intérieur pour l'extérieur et efface
# l'arcade et le nez au lieu de creuser sous eux.
# --- Les orbites : creusées sous l'arcade, une seule fente longue ---------
# Deux orbites, une de chaque côté : une fente d'un seul tenant coupait la
# racine du nez et le détachait du front.
for side in (-1, 1):
    # Fentes basses sous l'arcade : c'est l'ombre du sourcil qui fait le
    # regard. Hautes et noires, elles se lisaient comme des lunettes de soleil.
    socket = block('socket', (0.42, 0.56, 0.15), (side * 0.36, -0.6, 1.84), bevel=0.04, segments=2)
    cut(head, socket)
# La fente de la bouche entre les deux lèvres.
mouth = block('mouth', (0.58, 0.3, 0.05), (0, -0.8, 0.6), bevel=0.0)
cut(head, mouth)

sm = head.modifiers.new('smooth', 'SMOOTH')
sm.factor = 0.6
sm.iterations = 3
bpy.ops.object.modifier_apply(modifier=sm.name)
dec = head.modifiers.new('decimate', 'DECIMATE')
dec.decimate_type = 'COLLAPSE'
dec.ratio = 0.03
bpy.ops.object.modifier_apply(modifier=dec.name)
bpy.ops.object.shade_flat()

# Coupe nette sous la mâchoire : rien sous z = 0.
bm = bmesh.new()
bm.from_mesh(head.data)
bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
                       plane_co=(0, 0, 0.02), plane_no=(0, 0, 1), clear_inner=True)
edges = [e for e in bm.edges if e.is_boundary]
if edges:
    bmesh.ops.holes_fill(bm, edges=edges)
# La décimation laisse des triangles presque plats, en lame. Rendus en
# facettes, ils tiraient une fente noire sur l'arrière du crâne.
bmesh.ops.dissolve_degenerate(bm, dist=0.004, edges=bm.edges[:])
bmesh.ops.triangulate(bm, faces=bm.faces[:])
bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
thin = [f for f in bm.faces if f.calc_area() < 2e-4]
print('LAMES', len(thin))
bm.to_mesh(head.data)
bm.free()

# Recentrage : base de la tête à l'origine, milieu en x et y.
bb = [head.matrix_world @ Vector(c) for c in head.bound_box]
cx = (min(v.x for v in bb) + max(v.x for v in bb)) / 2
cy = (min(v.y for v in bb) + max(v.y for v in bb)) / 2
head.location -= Vector((cx, cy, min(v.z for v in bb)))
bpy.ops.object.transform_apply(location=True)

# Même nom de matériau que la pierre du jeu : `applyMoyaiPalette` le retrouve
# par là pour poser la matière des statuettes.
mat = bpy.data.materials.new('stone')
mat.use_nodes = True
bsdf = mat.node_tree.nodes['Principled BSDF']
bsdf.inputs['Base Color'].default_value = (0.4, 0.37, 0.32, 1)
bsdf.inputs['Roughness'].default_value = 0.92
# La fusion laisse un emplacement de matériau vide en tête de liste, qui
# décalait la pierre et les orbites d'un cran : on repart d'une liste vide.
head.data.materials.clear()
head.data.materials.append(mat)

# Le fond des orbites en pierre sombre, comme la bande des yeux du modèle
# d'origine : même nom (`cavity`), que `applyMoyaiPalette` reconnaît.
cavity = bpy.data.materials.new('cavity')
cavity.use_nodes = True
cb = cavity.node_tree.nodes['Principled BSDF']
cb.inputs['Base Color'].default_value = (0.13, 0.12, 0.105, 1)
cb.inputs['Roughness'].default_value = 1.0
cb.inputs['Specular IOR Level'].default_value = 0.0  # sans reflet, le noir virait au gris
head.data.materials.append(cavity)
front_y = min(v.co.y for v in head.data.vertices)
# Le visage (hors nez) affleure vers `face_y` ; tout ce qui est en retrait de
# lui dans la bande des yeux est le creux des orbites.
face_y = min(p.center.y for p in head.data.polygons
             if 1.0 < p.center.z < 1.5 and 0.4 < abs(p.center.x) < 0.6)
dark = 0
for poly in head.data.polygons:
    c = poly.center
    if 1.74 < c.z < 1.94 and 0.14 < abs(c.x) < 0.6 and c.y > face_y + 0.04:
        poly.material_index = 1
        dark += 1
print('CAVITY', dark, round(face_y, 3))
head.name = 'moyai'

print('TRIANGLES', sum(len(p.vertices) - 2 for p in head.data.polygons))

if TS:
    # Blender (x, y, z) → three (x, z, -y) : Z en haut et face vers -Y d'un
    # côté, Y en haut et face vers +Z de l'autre.
    me = head.data
    me.calc_loop_triangles()
    pos = []
    for v in me.vertices:
        pos += [round(v.co.x, 4), round(v.co.z, 4), round(-v.co.y, 4)]
    groups = {0: [], 1: []}
    for tri in me.loop_triangles:
        a, b, c = tri.vertices
        # Le changement de repère est une rotation, il garde l'enroulement.
        groups[tri.material_index] += [a, b, c]
    NL = chr(10)
    with open(TS, 'w', encoding='utf8', newline=NL) as out:
        out.write('// Généré par tools/blender/moyai.py — ne pas retoucher à la main.' + NL)
        out.write('// Repère three : Y vers le haut, la face regarde vers +Z.' + NL + NL)
        out.write('export const MOYAI_MESH = {' + NL)
        out.write('  positions: [' + ','.join(repr(p) for p in pos) + '],' + NL)
        out.write('  stone: [' + ','.join(map(str, groups[0])) + '],' + NL)
        out.write('  cavity: [' + ','.join(map(str, groups[1])) + ']' + NL)
        out.write('} as const;' + NL)
    print('TS', len(me.vertices), 'sommets', len(groups[0]) // 3, '+', len(groups[1]) // 3, 'triangles')

if GLB:
    bpy.ops.export_scene.gltf(filepath=GLB, export_format='GLB', use_selection=False,
                              export_apply=True)

if PNG:
    # Rendu de contrôle, éclairage calé sur `snapshot.ts` : clé chaude devant
    # à droite, contre-jour froid derrière, ambiance faible. Fond du thème.
    world = bpy.data.worlds.new('world')
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.017, 0.017, 0.014, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.0

    def sun(name, energy, rot, color):
        d = bpy.data.lights.new(name, 'SUN')
        d.energy = energy
        d.color = color
        d.angle = 0.05
        o = bpy.data.objects.new(name, d)
        o.rotation_euler = rot
        scene.collection.objects.link(o)

    sun('key', 1.1, (math.radians(52), math.radians(18), math.radians(-32)), (1, 0.96, 0.9))
    sun('rim', 0.5, (math.radians(-60), 0, math.radians(150)), (0.85, 0.9, 1))
    sun('fill', 0.25, (math.radians(70), 0, math.radians(60)), (1, 1, 1))

    cam_data = bpy.data.cameras.new('cam')
    cam_data.lens_unit = 'FOV'
    cam_data.angle = math.radians(35)
    cam = bpy.data.objects.new('cam', cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x = 900
    scene.render.resolution_y = 900
    scene.view_settings.view_transform = 'Standard'
    # Trois quarts, comme la vignette du jeu, puis profil : c'est le profil
    # qui dit si l'arcade surplombe et si le menton remonte.
    for suffix, deg in (('', -28), ('-profil', -90), ('-dos', 160)):
        turn = math.radians(deg)
        dist = 6.2
        cam.location = (math.sin(turn) * dist, -math.cos(turn) * dist, 1.4)
        cam.rotation_euler = (math.radians(90), 0, turn)
        scene.render.filepath = PNG.replace('.png', suffix + '.png')
        bpy.ops.render.render(write_still=True)
