# Inspeciona um GLB e renderiza frente e 3/4 (Workbench, com textura).
# Uso: blender --background --factory-startup --python inspecionar.py -- <entrada.glb> <pasta_saida>
import bpy, sys, os, math
from mathutils import Vector

glb, out = sys.argv[sys.argv.index('--') + 1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb)

meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
arms = [o for o in bpy.context.scene.objects if o.type == 'ARMATURE']
print('MESHES', [(o.name, len(o.data.vertices), len(o.data.polygons)) for o in meshes])
print('ARMATURES', [(a.name, len(a.data.bones)) for a in arms])
print('MATERIAIS', [m.name for m in bpy.data.materials])
print('IMAGENS', [(i.name, tuple(i.size)) for i in bpy.data.images])
quads = sum(1 for o in meshes for p in o.data.polygons if len(p.vertices) == 4)
print('QUADS', quads, 'de', sum(len(o.data.polygons) for o in meshes))

pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
print('DIMENSOES', tuple(round(v, 3) for v in hi - lo))
centro, altura = (lo + hi) / 2, (hi - lo).z

scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'TEXTURE'
scene.render.resolution_x, scene.render.resolution_y = 900, 1100
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
scene.collection.objects.link(cam)
scene.camera = cam

def foto(nome, angulo, alvo, dist):
    a = math.radians(angulo)
    cam.location = alvo + Vector((math.sin(a) * dist, -math.cos(a) * dist, 0))
    cam.rotation_euler = (alvo - cam.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = os.path.join(out, nome)
    bpy.ops.render.render(write_still=True)

foto('corpo-frente.png', 0, centro, altura * 1.9)
foto('corpo-34.png', 35, centro, altura * 1.9)
cabeca = Vector((centro.x, centro.y, hi.z - altura * 0.07))
foto('rosto-frente.png', 0, cabeca, altura * 0.35)
print('OK')
