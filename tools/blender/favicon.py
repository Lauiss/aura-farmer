"""Favicon du jeu, rendu depuis la tête de moyai de `moyai.py`.

    D:/blender/blender.exe -b -P tools/blender/favicon.py -- <dossier src/assets>

Écrit `favicon.png` (64 px) et `favicon-192.png`, fond transparent, cadrés de
trois quarts comme la vignette `ModelIcons.moyai()`. À relancer quand le
modèle change.
"""
import os
import sys
import math
import bpy

out_dir = sys.argv[sys.argv.index('--') + 1]
here = os.path.dirname(os.path.abspath(__file__))
# Construit la tête sans rien exporter ni rendre.
sys.argv = [sys.argv[0], '--']
exec(open(os.path.join(here, 'moyai.py'), encoding='utf8').read())

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.film_transparent = True
scene.view_settings.view_transform = 'Standard'
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'

world = bpy.data.worlds.new('world')
scene.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.6

for name, energy, rot in (('key', 1.6, (52, 18, -32)), ('rim', 0.7, (-60, 0, 150)), ('fill', 0.4, (70, 0, 60))):
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
turn = math.radians(-28)
cam.location = (math.sin(turn) * 4.9, -math.cos(turn) * 4.9, 1.36)
cam.rotation_euler = (math.radians(90), 0, turn)

for size, name in ((64, 'favicon.png'), (192, 'favicon-192.png')):
    scene.render.resolution_x = size
    scene.render.resolution_y = size
    scene.render.filepath = os.path.join(out_dir, name)
    bpy.ops.render.render(write_still=True)
