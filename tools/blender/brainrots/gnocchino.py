"""Gnocchino Martellone, deuxième boss : il remplace Tung Tung Tung Sahur,
retiré pour une question de propriété intellectuelle.

    D:/blender/blender.exe -b -P tools/blender/brainrots/gnocchino.py -- <gnocchino-mesh.ts> [<rendu.png>]

Un gnocchi de pomme de terre debout sur deux jambes courtes, qui brandit un
batticarne. Ce qui le fait reconnaître :
- le **coussin incurvé** : un gnocchi roulé sur la fourchette se courbe, le
  profil dessine un C ;
- les **rainures parallèles** sur sa face avant, la trace des dents ;
- le **batticarne** levé, manche en bois et tête cloutée d'un côté.
Les yeux ne sont pas ici : ils passent par `Gaze`, dans `brainrot.ts`.
"""
import os
import sys
import math
import bpy

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import brainrot_lib as lib  # noqa: E402

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
TS = argv[0] if argv else None
PNG = argv[1] if len(argv) > 1 else None

DOUGH = 0xe6d29c
WOOD = 0x8a5a33
STEEL = 0xb4b9bf

lib.reset()

# --- Le corps : un coussin, plus étroit en haut et en bas -----------------
body = lib.block('body', (1.5, 0.95, 1.8), (0, 0, 0), round_=0.42, segments=4,
                 corners=lambda x, y, z: (x * (0.9 if abs(z) > 0 else 1), y, z))

# --- Jambes courtes et pieds ronds, de la même pâte ------------------------
legs = []
for side in (-1, 1):
    legs.append(lib.capsule('leg', (side * 0.36, 0, -0.7), (side * 0.4, 0, -1.42), 0.17))
    legs.append(lib.block('foot', (0.36, 0.54, 0.2), (side * 0.41, -0.1, -1.52), round_=0.09))

# --- Bras : le droit lève le batticarne, le gauche pend --------------------
arms = [
    lib.capsule('arm', (0.68, 0, 0.2), (1.12, -0.06, 0.78), 0.13),
    lib.sphere('hand', (1.14, -0.06, 0.82), 0.17),
    lib.capsule('arm', (-0.68, 0, 0.2), (-0.98, -0.04, -0.4), 0.13),
    lib.sphere('hand', (-1.0, -0.04, -0.46), 0.17),
]

dough = lib.join([body, *legs, *arms], 'dough')
lib.fuse(dough, 0.028)

# --- Les rainures de la fourchette, sur la face avant ----------------------
# Creusées après la fusion, avant la courbure : elles suivent ainsi le C.
# Le haut reste lisse : c'est là que se posent les yeux et la bouche, et des
# rainures sur tout le corps le faisaient lire comme un radiateur.
for i in range(4):
    z = -0.66 + i * 0.22
    lib.carve(dough, lib.block('groove', (1.2, 0.2, 0.09), (0, -0.55, z), round_=0.04, segments=3))

# --- La bouche : une fente large, mauvaise ---------------------------------
lib.carve(dough, lib.block('mouth', (0.46, 0.3, 0.06), (0, -0.5, 0.3), round_=0.02, segments=2,
                           corners=lambda x, y, z: (x, y, z - 0.04 * abs(x) / 0.25)))

# --- La courbure du gnocchi roulé : le profil en C -------------------------
bend = dough.modifiers.new('bend', 'SIMPLE_DEFORM')
bend.deform_method = 'BEND'
bend.deform_axis = 'X'
bend.angle = math.radians(-55)
lib._apply(dough, bend)

lib.facet(dough, 0.05)
lib.paint(dough, DOUGH)

# --- Le batticarne : manche en bois, tête d'acier cloutée côté adversaire --
handle = lib.capsule('handle', (1.14, -0.06, 0.7), (1.24, -0.06, 1.62), 0.055, segments=6)
lib.paint(handle, WOOD)
head = lib.block('head', (0.56, 0.32, 0.3), (1.25, -0.06, 1.76), round_=0.04, segments=2)
studs = []
for dy in (-0.09, 0, 0.09):
    for dz in (-0.08, 0, 0.08):
        studs.append(lib.cone('stud', (1.56, -0.06 + dy, 1.76 + dz), 0.045, 0.09,
                              rot=(0, math.radians(90), 0)))
head = lib.join([head, *studs], 'head')
lib.paint(head, STEEL)

parts = [dough, handle, head]
# Repère pour placer les yeux dans `brainrot.ts` : l'avant du visage.
front = min(v.co.y for v in dough.data.vertices if 0.5 < v.co.z < 0.75 and abs(v.co.x) < 0.3)
print('FACE_FRONT', round(-front, 3))

if TS:
    lib.export_ts(parts, TS, 'GNOCCHINO_MESH', 'tools/blender/brainrots/gnocchino.py')
if PNG:
    lib.render(PNG, distance=8.5, height=0.1)
