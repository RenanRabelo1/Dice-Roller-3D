# Renderiza a mão esquerda de perto, de 0 a 4.400 ms (agarrar, tamborilar, bote, recuo, voltar a agarrar).
# Uso: blender --background <vampiro-anim-anim.blend> --python close_mao.py -- <pasta>
import bpy, sys, os
from mathutils import Vector
pasta = sys.argv[sys.argv.index('--') + 1]
scene = bpy.context.scene
cam = bpy.data.objects['lado']
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
foco = Vector((0.52, -0.08, 1.30))  # entre a borda e o caminho do bote, no espaço do modelo
cam.location = foco + Vector((0.55, -1.35, 0.75))
cam.rotation_euler = (foco - cam.location).to_track_quat('-Z', 'Y').to_euler()
cam.data.angle = 0.75
scene.camera = cam
scene.frame_start, scene.frame_end, scene.frame_step = 0, 110, 2
scene.render.resolution_x, scene.render.resolution_y = 720, 450
scene.render.filepath = os.path.join(pasta, 'm_')
bpy.ops.render.render(animation=True)
print('OK')
