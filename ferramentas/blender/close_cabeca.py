# Closes da cabeça e da gola em quadros escolhidos: de lado, de 3/4 por trás e pela direção da câmera do jogo.
# Uso: blender --background <vampiro-anim-anim.blend> --python close_cabeca.py -- <pasta> <quadro> [<quadro> ...]
import bpy, sys, os
from mathutils import Vector
args = sys.argv[sys.argv.index('--') + 1:]
pasta, quadros = args[0], [int(q) for q in args[1:]]
scene = bpy.context.scene
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
cam = bpy.data.objects['lado']
cam.data.angle = 0.6
scene.camera = cam
scene.render.resolution_x, scene.render.resolution_y = 640, 640
jogo = bpy.data.objects['cam']
for q in quadros:
    scene.frame_set(q)
    cabeca = arm.matrix_world @ arm.pose.bones['cabeca'].head
    alvo = cabeca + Vector((0, 0, 0.05))
    direcao_jogo = (jogo.matrix_world.translation - alvo).normalized()
    for nome, desloc in (('lado', Vector((0.55, 0.0, 0.05))), ('tras', Vector((0.35, 0.4, 0.25))),
                         ('jogo', direcao_jogo * 0.6)):
        cam.location = alvo + desloc
        cam.rotation_euler = (alvo - cam.location).to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = os.path.join(pasta, f'cabeca-{q:03d}-{nome}.png')
        bpy.ops.render.render(write_still=True)
print('OK')
