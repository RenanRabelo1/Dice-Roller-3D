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

# Solda os vértices duplicados nas costuras de UV (o UV fica nos cantos das faces, não se perde). Vem antes das
# medidas: os dedos são achados pela conectividade da malha, e uma costura aberta partiria um dedo em dois.
bpy.context.view_layer.objects.active = corpo
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.remove_doubles(threshold=0.0005 * H)
bpy.ops.object.mode_set(mode='OBJECT')
print('VERTICES_SOLDADOS', len(corpo.data.vertices))
co = np.empty((len(corpo.data.vertices), 3))
corpo.data.vertices.foreach_get('co', co.reshape(-1))
x, y, z = co[:, 0], co[:, 1], co[:, 2]
arestas = np.empty(len(corpo.data.edges) * 2, dtype=np.int64)
corpo.data.edges.foreach_get('vertices', arestas)
arestas = arestas.reshape(-1, 2)

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
# A coreografia do animar.py foi medida com o tronco em y = Y_TRONCO. Centrar pela caixa envolvente põe o tronco onde a
# roupa mandar (a aba do sobretudo do H3.1 o levou 9,6 cm para a frente, e o peito atravessava a parede da bandeja).
Y_TRONCO = -0.08
corpo.data.transform(Matrix.Translation(Vector((0, Y_TRONCO - y_meio, 0))))
corpo.data.vertices.foreach_get('co', co.reshape(-1))
print('TRONCO_MOVIDO', round(Y_TRONCO - y_meio, 3))
y_pe += Y_TRONCO - y_meio
y_meio = Y_TRONCO
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
# Pescoço e cabeça no centro do crânio, não no eixo do tronco: no H3.1 o eixo do tronco passa na ponta do nariz, e a
# cabeça girava em torno do rosto (a nuca varria 20 cm e entrava na gola alta).
_fatia = (np.abs(x) < 0.015) & (np.abs(z - (H - 0.08)) < 0.01)
Y_CAB = float((y[_fatia].min() + y[_fatia].max()) / 2) if _fatia.sum() > 3 else Y
print('Y_CABECA', round(Y_CAB, 3))
osso('pescoco', (0, Y_CAB, z_pescoco), (0, Y_CAB, z_cabeca), 'peito', False)
osso('cabeca', (0, Y_CAB, z_cabeca), (0, Y_CAB, H), 'pescoco', True)
# A gola alta tem osso próprio, com pivô na base: o animar.py a dobra para trás da cabeça quando ele se debruça
# (presa ao peito, ela apontava para a câmera e as abas ficavam na frente do rosto).
Z_GOLA = z_pescoco - 0.03
osso('gola', (0, Y_CAB, Z_GOLA), (0, Y_CAB, H - 0.1), 'peito')
def eixo_do_braco(xc, sx):
    """Centro (y, z) da seção da manga em x = sx*xc: as juntas ficam no eixo real do braço, não no do tronco
    (fora do eixo, o pivô fica deslocado e o cotovelo dobra torto)."""
    sel = (np.abs(x - sx * xc) < 0.012) & (z > z_ombro - 0.12) & (np.abs(y - y_meio) < 0.15)
    return (float(np.mean(y[sel])), float(np.mean(z[sel]))) if sel.sum() > 20 else (Y, z_ombro)
x_cotovelo = (x_ombro + x_pulso) / 2

def componentes(mascara):
    """Pedaços conexos da malha entre os vértices da máscara (índices), do maior para o menor."""
    viz = {int(i): [] for i in np.where(mascara)[0]}
    for a, b in arestas[mascara[arestas[:, 0]] & mascara[arestas[:, 1]]]:
        viz[int(a)].append(int(b)); viz[int(b)].append(int(a))
    vistos, saida = set(), []
    for i in viz:
        if i in vistos: continue
        pilha, comp = [i], []
        vistos.add(i)
        while pilha:
            k = pilha.pop(); comp.append(k)
            for j in viz[k]:
                if j not in vistos: vistos.add(j); pilha.append(j)
        saida.append(np.array(comp))
    return sorted(saida, key=len, reverse=True)

def linha_central(idx, base):
    """Linha central de um dedo: distância pela superfície (Dijkstra nas arestas) a partir dos vértices da base,
    em fatias de mesma distância. Segue a curva real, inclusive a garra que desce."""
    import heapq
    dentro = set(int(i) for i in idx)
    viz = {i: [] for i in dentro}
    for a, b in arestas:
        a, b = int(a), int(b)
        if a in dentro and b in dentro:
            d = float(np.linalg.norm(co[a] - co[b])); viz[a].append((b, d)); viz[b].append((a, d))
    dist = {int(i): 0.0 for i in base}
    fila = [(0.0, int(i)) for i in base]
    while fila:
        d, k = heapq.heappop(fila)
        if d > dist.get(k, 1e9): continue
        for j, w in viz[k]:
            if d + w < dist.get(j, 1e9): dist[j] = d + w; heapq.heappush(fila, (d + w, j))
    ks = np.array(list(dist)); ds = np.array([dist[k] for k in ks])
    fatias = np.linspace(0, ds.max(), 11)
    caminho = [Vector(co[ks[(ds >= a) & (ds <= b)]].mean(0)) for a, b in zip(fatias, fatias[1:]) if ((ds >= a) & (ds <= b)).any()]
    caminho.append(Vector(co[ks[np.argmax(ds)]]))  # a ponta da garra
    return caminho

def dedos_da_mao(lado, sx, yp, zp):
    """4 dedos de 3 falanges + polegar de 2, achados pela separação real da malha (Tripo H3.1, dedos separados).
    Varre x a partir do pulso: o primeiro pedaço que se solta pela frente (-y) é o polegar; o primeiro corte em que
    sobram 4 pedaços compridos são os 4 dedos (1 = indicador, -y ... 4 = mínimo, +y)."""
    xs = sx * x
    mao = (xs > x_pulso) & (np.abs(y - yp) < 0.12) & (np.abs(z - zp) < 0.12)
    polegar, dedos, t_dedos = None, None, None
    for t in np.arange(x_pulso, x_ponta, 0.0025):
        pedacos = [c for c in componentes(mao & (xs > t)) if len(c) >= 8]
        if polegar is None and len(pedacos) >= 2:
            soltos = sorted(pedacos[1:], key=lambda c: y[c].mean())
            if y[soltos[0]].mean() < y[pedacos[0]].mean() - 0.03: polegar = soltos[0]
        compridos = [c for c in pedacos if xs[c].max() > t + 0.02]
        if len(compridos) == 4:
            dedos, t_dedos = sorted(compridos, key=lambda c: y[c].mean()), t
            break
    if dedos is None:
        print('DEDOS_NAO_ACHADOS', lado); return
    ycs = [float(y[c].mean()) for c in dedos]
    meia = min(b - a for a, b in zip(ycs, ycs[1:])) / 2
    no = t_dedos - 0.035  # os nós dos dedos: a raiz fica ~3,5 cm antes da membrana entre eles
    for i, (c, yc) in enumerate(zip(dedos, ycs)):
        palma = np.where(mao & (xs > no) & (xs <= t_dedos) & (np.abs(y - yc) < meia))[0]
        idx = np.concatenate([c, palma])
        base = idx[sx * x[idx] < no + 0.004]
        if len(base) < 3: base = idx[np.argsort(sx * x[idx])[:5]]
        caminho = linha_central(idx, base)
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
        print('DEDO', lado, i + 1, 'y', round(yc, 3), 'comprimento', round(comp[-1], 3))
    if polegar is not None:
        # raiz do polegar: a borda da frente da palma logo depois do pulso; ponta: o vértice do pedaço mais longe dela
        perto = mao & (xs > x_pulso + 0.005) & (xs < x_pulso + 0.035)
        raiz = perto & (y < y[perto].min() + 0.02)
        base = Vector(co[raiz].mean(0))
        ponta = Vector(co[polegar[np.argmax(np.linalg.norm(co[polegar] - np.array(base), axis=1))]])
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
    dedos_da_mao(lado, sx, yp, zp)
    xp = sx * x_perna
    osso(f'coxa.{lado}', (xp, Y, z_quadril), (xp, Y, z_joelho), 'quadril')
    osso(f'canela.{lado}', (xp, Y, z_joelho), (xp, Y, z_tornozelo), f'coxa.{lado}', True)
    osso(f'pe.{lado}', (xp, Y, z_tornozelo), (xp, y_pe - 0.08 * H, 0.01 * H), f'canela.{lado}', True)
bpy.ops.object.mode_set(mode='OBJECT')

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

# Gola alta: o calor do bone heat a dava à cabeça, e ela girava junto com o crânio (rasgando na base e cortando o rosto).
# O que fica fora do crânio (elipse horizontal em volta do centro da cabeça) passa a seguir o peito e o pescoço.
_gk, _gc, _gp = (corpo.vertex_groups[n] for n in ('cabeca', 'pescoco', 'peito'))
_gola = 0
for v in corpo.data.vertices:
    if v.co.z < z_pescoco - 0.06:
        continue
    e = math.hypot(v.co.x / 0.10, (v.co.y - Y_CAB) / 0.125)
    if e <= 1.0:
        continue
    wk = next((g.weight for g in v.groups if g.group == _gk.index), 0.0)
    if wk <= 0:
        continue
    f = min(1.0, (e - 1.0) / 0.2)
    f = f * f * (3 - 2 * f)
    _gk.add([v.index], wk * (1 - f), 'REPLACE')
    _gc.add([v.index], next((g.weight for g in v.groups if g.group == _gc.index), 0.0) + wk * f * 0.4, 'REPLACE')
    _gp.add([v.index], next((g.weight for g in v.groups if g.group == _gp.index), 0.0) + wk * f * 0.6, 'REPLACE')
    _gola += 1
print('GOLA_REPONDERADA', _gola)
# Osso da gola: cresce da base (0) ao alto (1) e de junto do crânio (0) para fora (1); o resto divide o que sobra.
def _suave(u):
    u = min(1.0, max(0.0, u))
    return u * u * (3 - 2 * u)
_gg = corpo.vertex_groups.new(name='gola')
_n = 0
for v in corpo.data.vertices:
    if v.co.z < Z_GOLA or abs(v.co.x) > 0.25:
        continue
    e = math.hypot(v.co.x / 0.10, (v.co.y - Y_CAB) / 0.125)
    w = _suave((v.co.z - Z_GOLA) / 0.08) * _suave((e - 1.05) / 0.15)
    if w <= 0:
        continue
    for g in v.groups:
        g.weight *= 1 - w
    _gg.add([v.index], w, 'REPLACE')
    _n += 1
print('GOLA_NO_OSSO', _n)

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

for img in bpy.data.images:  # o site usa no máximo 1024 px no vampiro (o leitor recusa acima de 2048)
    if img.size[0] > 1024:
        img.scale(1024, 1024)
        img.pack()  # sem reempacotar, a exportação reaproveita os bytes originais embutidos (a textura de 4K ia inteira)
bpy.ops.wm.save_as_mainfile(filepath=os.path.splitext(saida)[0] + '.blend')
bpy.ops.export_scene.gltf(filepath=saida, export_format='GLB', export_skins=True, export_animations=True,
                          export_animation_mode='ACTIONS', export_image_format='WEBP')
print('EXPORTADO', saida, os.path.getsize(saida))
