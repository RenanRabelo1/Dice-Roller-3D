# Monta um esqueleto humanoide num GLB em T-pose (malha única, de frente para -Y),
# testa a pose debruçada do par e exporta o GLB com esqueleto.
# Uso: blender --background --factory-startup --python esqueleto.py -- <entrada.glb> <saida.glb> <pasta_prev>
import bpy, sys, os, math
import numpy as np
from mathutils import Vector, Matrix

glb, saida, prev = sys.argv[sys.argv.index('--') + 1:][:3]
H = 1.8  # altura alvo em metros; a cena reescala depois

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb)
corpo = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
mundo = corpo.matrix_world.copy()  # tira o corpo dos nós vazios do glTF sem perder a transformação
corpo.parent = None
corpo.matrix_world = mundo
bpy.context.view_layer.update()

# Escala para H e pés no chão, centrado em x/y.
co = np.empty(len(corpo.data.vertices) * 3)
corpo.data.vertices.foreach_get('co', co)
co = co.reshape(-1, 3)
mw = np.array(corpo.matrix_world)
co = co @ mw[:3, :3].T + mw[:3, 3]
lo, hi = co.min(0), co.max(0)
s = H / (hi[2] - lo[2])
off = np.array([-(lo[0] + hi[0]) / 2, -(lo[1] + hi[1]) / 2, -lo[2]])
corpo.data.transform(Matrix(mw))
corpo.matrix_world = Matrix.Identity(4)
corpo.data.transform(Matrix.Translation(Vector(off)))
corpo.data.transform(Matrix.Scale(s, 4))
for o in [o for o in bpy.context.scene.objects if o.type == 'EMPTY']:
    bpy.data.objects.remove(o)
corpo.data.vertices.foreach_get('co', co.reshape(-1))
x, y, z = co[:, 0], co[:, 1], co[:, 2]

# Marcos medidos na malha.
braco = np.abs(x) > 0.30 * H
z_ombro = float(np.median(z[braco & (np.abs(x) < 0.40 * H)]))
x_ponta = float(np.abs(x).max())
x_pulso = x_ponta - 0.10 * H
x_ombro = 0.11 * H
pe = (z < 0.04 * H) & (x > 0)
x_perna = float(np.median(x[pe])) if pe.any() else 0.06 * H
y_pe = float(np.median(y[pe])) if pe.any() else 0.0
tronco = (np.abs(x) < 0.08 * H) & (z > 0.5 * H) & (z < z_ombro)
y_meio = float(np.median(y[tronco]))
print('MARCOS', dict(z_ombro=round(z_ombro, 3), x_ponta=round(x_ponta, 3), x_pulso=round(x_pulso, 3),
                     x_perna=round(x_perna, 3), y_meio=round(y_meio, 3)))

arm_data = bpy.data.armatures.new('Esqueleto')
arm = bpy.data.objects.new('Esqueleto', arm_data)
bpy.context.scene.collection.objects.link(arm)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
eb = arm_data.edit_bones

def osso(nome, a, b, pai=None, conectado=False):
    o = eb.new(nome)
    o.head, o.tail = Vector(a), Vector(b)
    if pai:
        o.parent = eb[pai]
        o.use_connect = conectado
    return o

Y = y_meio
z_quadril, z_joelho, z_tornozelo = 0.52 * H, 0.28 * H, 0.05 * H
z_pescoco, z_cabeca = z_ombro + 0.035 * H, z_ombro + 0.075 * H
osso('quadril', (0, Y, z_quadril), (0, Y, z_quadril + 0.06 * H))
osso('coluna', (0, Y, z_quadril + 0.06 * H), (0, Y, z_quadril + 0.14 * H), 'quadril', True)
osso('peito', (0, Y, z_quadril + 0.14 * H), (0, Y, z_pescoco), 'coluna', True)
osso('pescoco', (0, Y, z_pescoco), (0, Y, z_cabeca), 'peito', True)
osso('cabeca', (0, Y, z_cabeca), (0, Y, H), 'pescoco', True)
def eixo_do_braco(xc, sx):
    """Centro (y, z) da seção da manga em x = sx*xc: as juntas ficam no eixo real do braço, não no do tronco
    (fora do eixo, o pivô fica deslocado e o cotovelo dobra torto)."""
    sel = (np.abs(x - sx * xc) < 0.012) & (z > z_ombro - 0.12) & (np.abs(y - y_meio) < 0.15)
    return (float(np.mean(y[sel])), float(np.mean(z[sel]))) if sel.sum() > 20 else (Y, z_ombro)
x_cotovelo = (x_ombro + x_pulso) / 2

def dedos_da_mao(lado, sx):
    """4 dedos de 3 falanges + polegar de 2, medidos na malha. Os dedos vêm fundidos do Tripo: a largura medida
    da mão é dividida em 4 faixas, e cada falange segue a linha central (curva real) da sua faixa."""
    xs = sx * x
    mao_sel = (xs > 0.62) & (np.abs(y) < 0.13) & (z > 1.25)
    no = 0.765  # os nós dos dedos (x medido no histograma das fatias)
    faixa = mao_sel & (xs > 0.78) & (xs < 0.80) & (y > -0.075)
    y0, y1 = float(y[faixa].min()), float(y[faixa].max())
    larg = (y1 - y0) / 4
    for i in range(4):  # 1 = indicador (frente, -y) ... 4 = mínimo (trás, +y)
        yc = y0 + (i + 0.5) * larg
        caminho = []
        for xc in np.arange(no, 0.86, 0.008):
            sel = mao_sel & (np.abs(xs - xc) < 0.006) & (np.abs(y - yc) < larg / 2)
            if sel.sum() > 4: caminho.append(Vector((sx * xc, float(np.mean(y[sel])), float(np.mean(z[sel])))))
        if len(caminho) < 4: continue
        comp = [0.0]
        for a, b in zip(caminho, caminho[1:]): comp.append(comp[-1] + (b - a).length)
        def ponto(f):
            alvo = f * comp[-1]
            for k in range(1, len(comp)):
                if comp[k] >= alvo:
                    u = (alvo - comp[k - 1]) / max(1e-9, comp[k] - comp[k - 1])
                    return caminho[k - 1].lerp(caminho[k], u)
            return caminho[-1]
        juntas = [ponto(f) for f in (0.0, 0.42, 0.74, 1.0)]
        for k in range(3):
            osso(f'dedo{i + 1}.{k + 1}.{lado}', juntas[k], juntas[k + 1],
                 f'mao.{lado}' if k == 0 else f'dedo{i + 1}.{k}.{lado}', k > 0)
        print('DEDO', lado, i + 1, 'pontos', len(caminho), 'comprimento', round(comp[-1], 3))
    pol = mao_sel & (xs > 0.67) & (xs < 0.77) & (y < -0.06)
    if pol.sum() > 20:
        ys = y[pol]
        base_sel, ponta_sel = pol & (y > np.percentile(ys, 75)), pol & (y < np.percentile(ys, 15))
        base = Vector((float(np.mean(x[base_sel])), float(np.mean(y[base_sel])), float(np.mean(z[base_sel]))))
        ponta = Vector((float(np.mean(x[ponta_sel])), float(np.mean(y[ponta_sel])), float(np.mean(z[ponta_sel]))))
        meio = base.lerp(ponta, 0.5)
        osso(f'polegar.1.{lado}', base, meio, f'mao.{lado}')
        osso(f'polegar.2.{lado}', meio, ponta, f'polegar.1.{lado}', True)
        print('POLEGAR', lado, [round(v, 3) for v in base], [round(v, 3) for v in ponta])

for lado, sx in (('L', 1), ('R', -1)):
    yo, zo = eixo_do_braco(x_ombro + 0.05, sx)
    yc, zc = eixo_do_braco(x_cotovelo, sx)
    yp, zp = eixo_do_braco(x_pulso, sx)
    print('EIXO', lado, [round(v, 3) for v in (yo, zo, yc, zc, yp, zp)])
    osso(f'clavicula.{lado}', (sx * 0.02 * H, Y, zo), (sx * x_ombro, yo, zo), 'peito')
    osso(f'braco.{lado}', (sx * x_ombro, yo, zo), (sx * x_cotovelo, yc, zc), f'clavicula.{lado}', True)
    osso(f'antebraco.{lado}', (sx * x_cotovelo, yc, zc), (sx * x_pulso, yp, zp), f'braco.{lado}', True)
    osso(f'mao.{lado}', (sx * x_pulso, yp, zp), (sx * x_ponta, yp, zp), f'antebraco.{lado}', True)
    dedos_da_mao(lado, sx)
    xp = sx * x_perna
    osso(f'coxa.{lado}', (xp, Y, z_quadril), (xp, Y, z_joelho), 'quadril')
    osso(f'canela.{lado}', (xp, Y, z_joelho), (xp, Y, z_tornozelo), f'coxa.{lado}', True)
    osso(f'pe.{lado}', (xp, Y, z_tornozelo), (xp, y_pe - 0.08 * H, 0.01 * H), f'canela.{lado}', True)
bpy.ops.object.mode_set(mode='OBJECT')

# Solda os vértices duplicados nas costuras de UV (o UV fica nos cantos das faces, não se perde).
bpy.context.view_layer.objects.active = corpo
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.remove_doubles(threshold=0.0005 * H)
bpy.ops.object.mode_set(mode='OBJECT')
print('VERTICES_SOLDADOS', len(corpo.data.vertices))

def pesos_automaticos(alvo):
    bpy.ops.object.select_all(action='DESELECT')
    alvo.select_set(True)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    return sum(1 for v in alvo.data.vertices if v.groups)

if pesos_automaticos(corpo) < 0.9 * len(corpo.data.vertices):
    # ponytail: bone heat falha em malha de IA cheia de pedaços soltos; calcula numa cópia remalhada
    # (voxel, fechada e conexa) e transfere os pesos pelo vizinho mais próximo.
    print('PESOS_VIA_PROXY')
    corpo.vertex_groups.clear()
    proxy = corpo.copy()
    proxy.data = corpo.data.copy()
    bpy.context.scene.collection.objects.link(proxy)
    proxy.modifiers.clear()
    proxy.parent = None
    proxy.matrix_world = Matrix.Identity(4)
    rem = proxy.modifiers.new('voxel', 'REMESH')
    rem.mode, rem.voxel_size = 'VOXEL', 0.008 * H
    bpy.context.view_layer.objects.active = proxy
    bpy.ops.object.modifier_apply(modifier='voxel')
    print('PROXY_VERTICES', len(proxy.data.vertices), 'COM_PESO', pesos_automaticos(proxy))
    for g in proxy.vertex_groups:
        corpo.vertex_groups.new(name=g.name)
    dt = corpo.modifiers.new('pesos', 'DATA_TRANSFER')
    dt.object, dt.use_vert_data = proxy, True
    dt.data_types_verts = {'VGROUP_WEIGHTS'}
    dt.vert_mapping = 'POLYINTERP_NEAREST'
    dt.layers_vgroup_select_src, dt.layers_vgroup_select_dst = 'ALL', 'NAME'
    bpy.context.view_layer.objects.active = corpo
    bpy.ops.object.modifier_move_to_index(modifier='pesos', index=0)
    bpy.ops.object.modifier_apply(modifier='pesos')
    bpy.data.objects.remove(proxy)

pesos = {g.name: 0 for g in corpo.vertex_groups}
sem = 0
for v in corpo.data.vertices:
    if not v.groups:
        sem += 1
    for g in v.groups:
        if g.weight > 0.01:
            pesos[corpo.vertex_groups[g.group].name] += 1
print('PESOS', pesos)
print('SEM_PESO', sem, 'de', len(corpo.data.vertices))

# Pose do par: tronco debruçado ~30 graus para a câmera (-Y), palmas abertas ao lado do rosto.
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='POSE')
pb = arm.pose.bones

def girar(nome, eixo, graus):
    b = pb[nome]
    cabeca = b.head.copy()
    r = Matrix.Translation(cabeca) @ Matrix.Rotation(math.radians(graus), 4, eixo) @ Matrix.Translation(-cabeca)
    b.matrix = r @ b.matrix
    bpy.context.view_layer.update()

def apontar(nome, direcao):
    b = pb[nome]
    atual = (b.tail - b.head).normalized()
    q = atual.rotation_difference(Vector(direcao).normalized())
    cabeca = b.head.copy()
    b.matrix = Matrix.Translation(cabeca) @ q.to_matrix().to_4x4() @ Matrix.Translation(-cabeca) @ b.matrix
    bpy.context.view_layer.update()

# ~60 graus: o tronco precisa passar por cima da parede de trás (OS-0101, T5); a cabeça volta para encarar a câmera.
for nome, graus in (('quadril', 8), ('coluna', 22), ('peito', 28), ('pescoco', 4), ('cabeca', -34)):
    girar(nome, 'X', graus)
for lado, sx in (('L', 1), ('R', -1)):
    apontar(f'braco.{lado}', (sx * 0.75, -0.65, 0.1))
    apontar(f'antebraco.{lado}', (sx * 0.25, -0.85, 0.45))
    apontar(f'mao.{lado}', (sx * 0.1, -0.6, 0.8))
bpy.ops.object.mode_set(mode='OBJECT')

# Prévias da pose.
scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'TEXTURE'
scene.render.resolution_x, scene.render.resolution_y = 900, 1100
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
scene.collection.objects.link(cam)
scene.camera = cam
alvo = Vector((0, 0, H * 0.55))

def foto(nome, angulo, dist=H * 2.0, altura=0.0):
    a = math.radians(angulo)
    cam.location = alvo + Vector((math.sin(a) * dist, -math.cos(a) * dist, altura))
    cam.rotation_euler = (alvo - cam.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = os.path.join(prev, nome)
    bpy.ops.render.render(write_still=True)

foto('pose-frente.png', 0)
foto('pose-lado.png', 90)
foto('pose-camera-do-jogo.png', 0, H * 2.0, H * 0.9)  # de cima, como a câmera [0,14,10]

# Guarda a pose como o clipe "par", da duração do presságio (5,6 s): o tempo do clipe é o relógio do presságio.
# Por enquanto a pose é parada (mesma chave no início e no fim); a animação de verdade substitui o clipe.
scene.render.fps = 25
fim = 1 + round(5.6 * scene.render.fps)
arm.animation_data_create()
arm.animation_data.action = bpy.data.actions.new('par')
for quadro in (1, fim):
    for b in pb:
        b.keyframe_insert('rotation_quaternion', frame=quadro)
        b.keyframe_insert('location', frame=quadro)
scene.frame_start, scene.frame_end = 1, fim

for img in bpy.data.images:  # o site usa no máximo 1024 px no vampiro
    if img.size[0] > 1024:
        img.scale(1024, 1024)
bpy.ops.wm.save_as_mainfile(filepath=os.path.splitext(saida)[0] + '.blend')
bpy.ops.export_scene.gltf(filepath=saida, export_format='GLB', export_skins=True, export_animations=True,
                          export_animation_mode='ACTIONS', export_image_format='WEBP')
print('EXPORTADO', saida, os.path.getsize(saida))
