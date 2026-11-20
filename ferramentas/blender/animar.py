# Anima o clipe "par" (5,6 s) do vampiro já com esqueleto (saída do esqueleto.py) e exporta o GLB.
# Também renderiza a prévia vista pela câmera do jogo, com uma réplica da mesa.
# Uso: blender --background <vampiro-rig.blend> --python animar.py -- <saida.glb> <pasta_quadros>
#
# Coreografia (pedida pelo João), presa aos marcos de PAR (vampiroMotion.ts):
#   0–320     as mãos surgem por trás da parede e se agarram na borda (primeiro só as mãos)
#   320–1000  ele faz força nelas e sobe: preparação (afunda um pouco), depois o empurrão pesado
#   1000–1300 escala: o peito passa do topo e se debruça por cima da parede (a barriga fica de pé atrás dela);
#             a cabeça se ergue e encara o jogador; fica encarando, respirando (a revoada passa)
#   2900–3600 a mão esquerda solta a borda e vai pegar o dado (o olhar vai junto)
#   3600–4250 desiste: recua a mão como quem se queimou, volta a encarar e se agarra de novo
#   4800–5350 afunda atrás da parede, com as mãos ainda na borda
#   5350–5600 só no fim as mãos soltam e somem
# Motion-design: preparação antes de cada esforço, follow-through (a mão chega depois do braço), curvas sem trecho
# linear, assimetria (a direita atrasa) e camada ambiente (respiração, balanço).
#
# A raiz do modelo fica numa âncora fixa atrás da parede (ANCORA); toda a subida e descida está no clipe.
import bpy, sys, os, math
from mathutils import Vector, Matrix, Quaternion

saida, quadros = sys.argv[sys.argv.index('--') + 1:][:2]
FPS, DUR = 25, 5600
V = Vector

# --- O site: âncora e escala do GLB (unidades do three), câmera e bandeja.
ESCALA, ANCORA = 7.5, V((0.0, -8.67, -6.037))
CAMERA, ALVO, FOV = V((0.0, 14.0, 10.0)), V((0.0, 0.0, 0.0)), 40.0
HW, HD, WH, WT = 7.0, 4.5, 1.5, 0.5

def m(p):  # ponto do three → espaço do modelo no Blender (Z para cima, frente -Y)
    q = (V(p) - ANCORA) / ESCALA
    return V((q.x, -q.z, q.y))

# --- Curvas
def e_inout(x): return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2
def e_out(x): return 1 - (1 - x) ** 3
def e_in(x): return x ** 3
def e_back(x, s=1.2): c = s + 1; return 1 + c * (x - 1) ** 3 + s * (x - 1) ** 2
def e_pesado(x): return x ** 2 * (3 - 2 * x) if x < 1 else 1  # começa lento (esforço) e assenta
def curva(t, chaves):
    """chaves: [(ms, valor, easing até esta chave)], valor float ou Vector."""
    if t <= chaves[0][0]: return chaves[0][1].copy() if isinstance(chaves[0][1], Vector) else chaves[0][1]
    for (t0, v0, _), (t1, v1, e) in zip(chaves, chaves[1:]):
        if t <= t1:
            return v0 + (v1 - v0) * (e or e_inout)((t - t0) / (t1 - t0))
    return chaves[-1][1].copy() if isinstance(chaves[-1][1], Vector) else chaves[-1][1]

# --- Alvos no mundo do three (lado esquerdo do vampiro = +x, à direita na tela)
def lado(p, sx): return V((sx * p[0], p[1], p[2]))
# Os alvos são a posição do PULSO. Pegada aberta: com as mãos perto dos ombros o cotovelo fechava em 55–65° e a
# manga embolava (alvo: 100–150°). Na borda, o pulso fica atrás e acima da parede (topo em y = 1,5, de z -5 a -4,5):
# a mão (1,35 de comprimento na escala do site) deita sobre o topo e as garras passam da quina interna.
ESCONDIDA, POR_CIMA, BORDA = V((4.0, -0.6, -7.0)), V((3.9, 2.8, -5.4)), V((3.9, 2.0, -5.3))  # nós dos dedos na quina
ATRAS = V((4.0, 2.3, -6.6))  # ao soltar, a mão recua para trás da parede antes de descer (não atravessa a madeira)
DADO = V((2.2, 0.5, 0.0))  # o dado (para onde ele olha); o pulso para no DADO_PULSO, atrás dele
DADO_PULSO = V((2.15, 1.12, -0.55))  # os nós dos dedos ficam sobre o topo do dado e os dedos descem pela frente  # ponytail: alvo fixo no meio da bandeja; para mirar o dado de verdade, o código passa a posição
SOLTA, QUEIMOU = BORDA + V((0.1, 0.5, -0.15)), V((3.8, 3.4, -3.4))
MAO_E = [(0, ESCONDIDA, None), (140, POR_CIMA, e_out), (260, BORDA, e_back), (2900, BORDA, None),
         (3050, SOLTA, e_inout), (3400, DADO_PULSO, e_out), (3600, DADO_PULSO + V((0, 0.3, 0.15)), e_inout),
         (3850, QUEIMOU, e_out), (4250, BORDA, e_inout), (5300, BORDA, None), (5420, ATRAS, e_inout),
         (5600, ESCONDIDA, e_in)]
# Enquanto a esquerda tenta pegar o dado, a direita passa por cima da parede e se apoia no feltro (o peso do corpo).
SOBRE_A_PAREDE, NO_FELTRO = V((3.9, 2.7, -4.9)), V((3.6, 0.8, -3.6))
MAO_D = [(0, ESCONDIDA, None), (70, ESCONDIDA, None), (210, POR_CIMA, e_out), (330, BORDA, e_back),
         (2900, BORDA, None), (3050, SOBRE_A_PAREDE, e_out), (3250, NO_FELTRO, e_back), (3550, NO_FELTRO, None),
         (3750, SOBRE_A_PAREDE, e_out), (3950, BORDA, e_back), (5340, BORDA, None), (5460, ATRAS, e_inout),
         (5600, ESCONDIDA, e_in)]  # sai do feltro antes do recuo do corpo
# Para onde os dedos apontam (Blender): por cima da borda, para a frente e para baixo.
# Dedos quase deitados para a frente: a mão apoia no topo da parede (antes pendia na vertical, no ar).
AGARRA, ESTICA, ERGUIDA = V((0.08, -0.95, -0.25)), V((0.1, -0.9, -0.4)), V((0.15, -0.35, 0.92))
# A palma (para baixo em repouso) vira para a superfície; ao recuar "queimado", vira para o jogador.
BAIXO, AO_JOGADOR = V((0, 0, -1)), V((0, -0.6, 0.8))
PALMA_E = [(0, BAIXO, None), (3600, BAIXO, None), (3850, AO_JOGADOR, e_out), (4250, BAIXO, e_inout)]
PARA_CIMA = V((0.1, 0.25, 0.96))  # subindo ou descendo atrás da parede, os dedos apontam para cima (não a cortam)
DEDOS_E = [(0, PARA_CIMA, None), (90, PARA_CIMA, None), (170, AGARRA, e_out), (3050, AGARRA, None),
           (3400, ESTICA, e_out), (3600, ESTICA, None), (3850, ERGUIDA, e_out), (4250, AGARRA, e_inout),
           (5350, AGARRA, None), (5450, PARA_CIMA, e_inout)]
DEDOS_D = [(0, PARA_CIMA, None), (160, PARA_CIMA, None), (240, AGARRA, e_out), (5420, AGARRA, None),
           (5500, PARA_CIMA, e_inout)]
# Para onde o cotovelo dobra: para fora e para trás agarrado; para fora e para cima ao esticar (sem "asa de galinha").
POLO_AGARRA, POLO_ALCANCE = V((1.0, 0.45, 0.25)), V((1.0, 0.0, 0.75))
POLO_E = [(0, POLO_AGARRA, None), (2950, POLO_AGARRA, None), (3300, POLO_ALCANCE, e_inout), (3700, POLO_ALCANCE, None),
          (4250, POLO_AGARRA, e_inout)]
# O corpo: deslocamento do quadril (Blender: Z para cima, -Y para a frente) e inclinação do tronco.
# Escondido, o corpo fica recuado (+Y) para a cabeça não atravessar a parede. Sobe reto primeiro (Z) e só avança
# (Y) depois que a cabeça passou da borda; na saída, recua antes de afundar.
# O corpo nunca desce além do alcance dos braços enquanto as mãos estão na borda (senão elas afundam na madeira):
# a preparação é o encolher dos ombros (OMBRO), e ele só afunda de vez depois que as mãos soltam (~5.400 ms).
# Escalando a parede (pedido do usuário, 20/11/2026): antes o peito ficava na altura da parede, inclinado contra ela,
# e atravessava a madeira o clipe inteiro. Agora o corpo sobe até a junta do peito (a dobra, z = 1,188 em repouso)
# passar do topo (z = 1,356 no modelo); a barriga fica de pé atrás da parede e só o peito se debruça por cima.
# As mãos ficam na borda: o corpo sobe ~0,55 m em relação a elas (barra e depois apoio por cima do muro).
# A conferência do corpo (mais abaixo) recua o quadril o que faltar para nada entrar na madeira.
# Enquadramento (câmera do jogo): o topo da parede fica a ~16% da tela; acima dele há uma faixa de uma cabeça só.
# Para o rosto aparecer inteiro, a cabeça vai à frente da quina interna (~20 cm sobre a bandeja) e baixa, logo acima
# do topo: o peito debruça ~60° com a dobra (junta do peito) logo acima do topo e atrás da face de trás da parede.
SOBE = [(0, -0.33, None), (450, -0.36, None), (1000, 0.10, e_pesado), (1300, 0.23, e_out), (2900, 0.23, None),
        (3400, 0.23, e_out), (3900, 0.23, e_out), (4800, 0.23, e_inout), (5050, 0.06, e_inout), (5300, -0.33, e_in),
        (5470, -0.40, e_in), (5600, -1.1, e_in)]
AVANCA = [(0, 0.20, None), (750, 0.20, None), (1300, 0.0, e_out), (2900, 0.0, None), (3400, -0.02, e_out),
          (3900, 0.0, e_out), (4800, 0.0, None), (5150, 0.20, e_inout)]
# A dobra: quase toda no peito (por cima do topo); a coluna (a barriga, atrás da parede) fica quase reta.
INCL_PEITO = [(0, 2, None), (450, 3, e_inout), (1000, 12, e_pesado), (1300, 82, e_out), (2900, 82, None),
              (3050, 78, e_inout), (3400, 84, e_out), (3600, 83, None), (3850, 76, e_out), (4250, 82, e_inout),
              (4800, 82, None), (5300, 60, e_in), (5600, 10, e_in)]  # sai debruçado: endireitar encarando subia a cabeça para fora da tela
INCL_COLUNA = [(0, 2, None), (1000, 4, e_pesado), (1300, 9, e_out), (2900, 9, None), (3400, 10, e_out),
               (3850, 7, e_out), (4250, 9, e_inout), (4800, 9, None), (5400, 3, e_in)]
OMBRO = [(0, 12, None), (380, 14, e_inout), (800, 16, e_pesado), (1100, 3, e_out), (3850, 9, e_out), (4250, 2, e_inout)]
# Encara o jogador da escalada até sumir atrás da parede (antes o olhar soltava aos 4.800 ms e ele saía olhando para a frente).
OLHAR = [(0, 0, None), (1000, 0, None), (1300, 1, e_out), (5600, 1, None)]
NO_DADO = [(0, 0, None), (2950, 0, None), (3250, 0.85, e_inout), (3650, 0.85, None), (3800, 0, e_out)]
QUEIXO = [(0, 62, None), (450, 62, None), (1000, 30, e_inout), (1300, 0, e_out), (5600, 0, None)]  # cabeça baixa = escondida (só na chegada)
ROLO = [(0, 0, None), (1500, 0, None), (1900, 9, e_inout), (2600, 0, e_inout), (4250, 0, None), (4500, -7, e_inout), (4800, 0, e_inout)]

# --- Esqueleto e malha
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
corpo = next(o for o in bpy.data.objects if o.type == 'MESH' and o.parent == arm)
for a in list(bpy.data.actions): bpy.data.actions.remove(a)

# Pesos do braço rígidos por osso, com uma faixa curta de transição (FAIXA) só nas juntas: o cotovelo dobra em
# ângulo. Pesos por distância espalhavam a transição pela grossura da manga e o braço curvava como espaguete.
FAIXA = 0.03  # ~5 cm na figura de 1,8
def proj(p, a, b):  # (distância ao segmento, posição ao longo dele em unidades)
    ab = b - a; k = max(0.0, min(1.0, (p - a).dot(ab) / ab.length_squared))
    return (p - (a + ab * k)).length, k * ab.length
DEDOS = [f'dedo{i}' for i in range(1, 5)]
# Dedos fundidos na malha (Tripo H2.5) não aguentam articulação: a pele entre eles estica e embola. Com dedos
# separados (Tripo H3.1 + Retopo), cada falange leva a sua parte. Desligado, a mão é rígida e mantém a curva de
# garra da própria malha; os ossos dos dedos continuam no esqueleto, sem pesos.
DEDOS_ARTICULADOS = True
for s in ('L', 'R'):
    # Cadeia do braço e da mão: (osso, pai, filho único ou None). As falanges têm faixa menor (juntas curtas).
    cadeia = [(f'clavicula.{s}', None, f'braco.{s}'), (f'braco.{s}', f'clavicula.{s}', f'antebraco.{s}'),
              (f'antebraco.{s}', f'braco.{s}', f'mao.{s}'), (f'mao.{s}', f'antebraco.{s}', None)]
    ossos_dos_dedos = [f'{d}.{k}.{s}' for d in DEDOS for k in (1, 2, 3)] + [f'polegar.{k}.{s}' for k in (1, 2)]
    ossos_dos_dedos = [n for n in ossos_dos_dedos if n in arm.data.bones]
    if DEDOS_ARTICULADOS:
        for d in DEDOS:
            for k in (1, 2, 3):
                if f'{d}.{k}.{s}' in arm.data.bones:
                    cadeia.append((f'{d}.{k}.{s}', f'mao.{s}' if k == 1 else f'{d}.{k - 1}.{s}', f'{d}.{k + 1}.{s}' if k < 3 else None))
        if f'polegar.1.{s}' in arm.data.bones:
            cadeia += [(f'polegar.1.{s}', f'mao.{s}', f'polegar.2.{s}'), (f'polegar.2.{s}', f'polegar.1.{s}', None)]
    nomes = [c[0] for c in cadeia]
    pos = {n: i for i, n in enumerate(nomes)}
    grupos = [corpo.vertex_groups.get(n) or corpo.vertex_groups.new(name=n) for n in nomes]
    # sem articulação, o peso que estava nos dedos vai para a mão (e sai dos grupos dos dedos)
    sobras = [] if DEDOS_ARTICULADOS else [corpo.vertex_groups[n] for n in ossos_dos_dedos if n in corpo.vertex_groups]
    idx = {g.index for g in grupos} | {g.index for g in sobras}
    segs = [(arm.data.bones[n].head_local, arm.data.bones[n].tail_local) for n in nomes]
    comp = [(b - a).length for a, b in segs]
    faixa = [FAIXA if n.split('.')[0] in ('clavicula', 'braco', 'antebraco', 'mao') else 0.008 for n in nomes]
    for v in corpo.data.vertices:
        total = sum(g.weight for g in v.groups if g.group in idx)
        if total < 1e-4: continue
        medidas = [proj(v.co, a, b) for a, b in segs]
        i = min(range(len(nomes)), key=lambda j: medidas[j][0])
        ws = [0.0] * len(nomes); ws[i] = 1.0
        ao_longo, (_, pai, filho) = medidas[i][1], cadeia[i]
        if pai and ao_longo < faixa[i]:  # perto da junta com o osso de cima
            f = 0.5 * (1 - ao_longo / faixa[i]); ws[pos[pai]], ws[i] = f, 1 - f
        elif filho and comp[i] - ao_longo < faixa[i]:  # perto da junta com o osso de baixo
            f = 0.5 * (1 - (comp[i] - ao_longo) / faixa[i]); ws[pos[filho]], ws[i] = f, 1 - f
        for g, w in zip(grupos, ws): g.add([v.index], total * w, 'REPLACE')
        for g in sobras: g.remove([v.index])

# A gola alta é ponderada no esqueleto.py (segue peito e pescoço; o pivô da cabeça fica no centro do crânio).

bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='POSE')
pb = arm.pose.bones

def atualizar(): bpy.context.view_layer.update()
def aplicar_q(nome, q, pivo=None):
    b = pb[nome]; c = (pivo or b.head).copy()
    b.matrix = Matrix.Translation(c) @ q.to_matrix().to_4x4() @ Matrix.Translation(-c) @ b.matrix
    atualizar()
def girar(nome, eixo, graus):
    eixo = {'X': V((1, 0, 0)), 'Y': V((0, 1, 0)), 'Z': V((0, 0, 1))}[eixo]
    aplicar_q(nome, Quaternion(eixo, math.radians(graus)))
def apontar(nome, direcao):
    b = pb[nome]
    aplicar_q(nome, (b.tail - b.head).normalized().rotation_difference(direcao.normalized()))
# Os olhos da textura são pesados e olham um pouco para baixo: com o rosto apontado exatamente para a câmera, ele
# parecia olhar para a frente. O "olhar" é a frente do rosto inclinada isto para baixo, e é ele que mira o alvo.
OLHOS_ABAIXO = 18.0
def rosto():  # para onde o olhar aponta (-Y em repouso, inclinado OLHOS_ABAIXO para baixo)
    b = pb['cabeca']
    a = math.radians(OLHOS_ABAIXO)
    return (b.matrix.to_3x3() @ b.bone.matrix_local.to_3x3().inverted() @ V((0, -math.cos(a), -math.sin(a)))).normalized()
def torcer(nome, eixo_repouso, desejado):
    """Gira o osso no próprio eixo até `eixo_repouso` (no repouso) apontar para `desejado` (controle de torção)."""
    b = pb[nome]
    a = (b.tail - b.head).normalized()
    atual = b.matrix.to_3x3() @ b.bone.matrix_local.to_3x3().inverted() @ eixo_repouso
    atual, desejado = atual - a * atual.dot(a), desejado - a * desejado.dot(a)
    if atual.length < 1e-4 or desejado.length < 1e-4: return
    atual.normalize(); desejado.normalize()
    angulo = math.atan2(a.dot(atual.cross(desejado)), atual.dot(desejado))
    aplicar_q(nome, Quaternion(a, angulo))
def ik(s, sx, pulso, polo):
    """IK de dois ossos: o pulso vai a `pulso`, o cotovelo dobra para o lado de `polo`, no eixo anatômico.
    Em T-pose com a palma para baixo, a dobra do cotovelo leva o antebraço para a frente (-Y): a dobradiça em
    repouso é -Z no braço esquerdo e +Z no direito. A torção alinha essa dobradiça à do IK."""
    S = pb[f'braco.{s}'].head.copy()
    l1, l2 = pb[f'braco.{s}'].bone.length, pb[f'antebraco.{s}'].bone.length
    d = pulso - S
    dist = min(d.length, (l1 + l2) * 0.999)
    eixo = d.normalized()
    cos_a = max(-1.0, min(1.0, (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist)))
    lateral = (polo - eixo * polo.dot(eixo)).normalized()
    cotovelo = S + eixo * (cos_a * l1) + lateral * (math.sqrt(1 - cos_a * cos_a) * l1)
    punho = S + eixo * dist
    dobradica = (cotovelo - S).cross(punho - cotovelo)
    repouso = V((0, 0, -sx))
    apontar(f'braco.{s}', cotovelo - S)
    if dobradica.length > 1e-5: torcer(f'braco.{s}', repouso, dobradica.normalized())
    apontar(f'antebraco.{s}', punho - pb[f'antebraco.{s}'].head)
    if dobradica.length > 1e-5: torcer(f'antebraco.{s}', repouso, dobradica.normalized())
    cotovelos[s + '_falta'] = round(max(0.0, d.length - (l1 + l2)) * ESCALA, 2)  # quanto o pulso não alcança (mundo)
    cotovelos[s] = math.degrees(math.acos(max(-1, min(1, (l1 * l1 + l2 * l2 - dist * dist) / (2 * l1 * l2)))))
cotovelos = {}

# --- Dedos: (base, meio, ponta, abertura) em graus. 0 = a forma da malha (que já vem um pouco curvada).
# Na borda, a base fica reta sobre o topo e só as falanges da ponta dobram sobre a quina (com a base dobrada os
# dedos afundavam na madeira e pareciam tocos).
# Com o contato, os ângulos de pegada são o máximo que o dedo tenta dobrar: ele para ao encostar.
ABERTA, AGARRADA, RELAXADA = V((-15, -5, 0, 10)), V((55, 75, 60, 2)), V((5, 10, 8, 3))
GARRA, APERTO = V((-10, 25, 35, 12)), V((55, 80, 65, 4))      # o bote e o aperto em volta do dado
ESPASMO, ESPALMADA = V((-30, -15, -5, 18)), V((-12, 5, 5, 14))  # "queimou" e a mão no feltro
DEDOS_MAO_E = [(0, ABERTA, None), (200, ABERTA, None), (300, AGARRADA, e_back), (2950, AGARRADA, None),
               (3100, ABERTA, e_out), (3400, GARRA, e_out), (3550, APERTO, e_in), (3650, APERTO, None),
               (3750, ESPASMO, e_out), (3950, RELAXADA, e_inout), (4150, ABERTA, e_inout), (4300, AGARRADA, e_back),
               (5300, AGARRADA, None), (5450, ABERTA, e_out)]
DEDOS_MAO_D = [(0, ABERTA, None), (270, ABERTA, None), (370, AGARRADA, e_back), (2950, AGARRADA, None),
               (3100, ABERTA, e_out), (3250, ESPALMADA, e_back), (3550, ESPALMADA, None), (3700, ABERTA, e_out),
               (3950, AGARRADA, e_back), (5380, AGARRADA, None), (5520, ABERTA, e_out)]
TAMBORILA = [(0, 0, None), (1300, 0, None), (1500, 1, e_inout), (2700, 1, None), (2900, 0, e_inout)]

def delta(b):  # rotação atual do osso em relação ao repouso (espaço da armadura)
    return b.matrix.to_3x3() @ b.bone.matrix_local.to_3x3().inverted()

# --- Contato: as falanges dobram até encostar e param (com a espessura do dedo de folga); a seguinte continua
# dobrando a partir dali. Assim os dedos contornam a quina e o dado em vez de atravessar.
def mundo(p):  # espaço do modelo (Blender) → mundo do three
    return V((p.x * ESCALA, p.z * ESCALA + ANCORA.y, -p.y * ESCALA + ANCORA.z))
def sdf_caixa(p, c, h):
    q = V((abs(p.x - c.x) - h.x, abs(p.y - c.y) - h.y, abs(p.z - c.z) - h.z))
    fora = V((max(q.x, 0), max(q.y, 0), max(q.z, 0))).length
    return fora + min(max(q.x, q.y, q.z), 0.0)
SOLIDOS = [(V((0, WH / 2, -HD - WT / 2)), V((HW + WT, WH / 2, WT / 2))),  # parede de trás
           (V((0, -0.5, 0)), V((HW, 0.5, HD))),                             # feltro (e a mesa por baixo)
           (V((2.2, 0.15, 0.0)), V((0.35, 0.35, 0.35)))]                     # o dado do clipe
RAIO_DO_DEDO = 0.07  # no mundo do three (a figura tem 13,5 de altura)
def folga(a, b):  # menor distância de um segmento (no modelo) às superfícies, descontado o raio do dedo
    menor = 1e9
    for k in range(5):
        p = mundo(a.lerp(b, k / 4))
        for c, h in SOLIDOS: menor = min(menor, sdf_caixa(p, c, h))
    return menor - RAIO_DO_DEDO

def dobrar_com_contato(nomes, eixo_repouso, desejados, minimo=-25.0):
    """Para cada falange (da base à ponta), varre o ângulo de `minimo` até o desejado e para no primeiro contato.
    Faz a conta sem atualizar a cena: as falanges seguintes giram junto, como um corpo rígido. Se uma falange
    ainda começa dentro da superfície, a anterior dobra 10° a menos e refaz (o dedo recua em vez de atravessar)."""
    cabecas = [pb[n].head.copy() for n in nomes]
    caudas = [pb[n].tail.copy() for n in nomes]
    eixos = [(delta(pb[n]) @ eixo_repouso).normalized() for n in nomes]
    def resolver(tetos):
        T, angulos, pior = Matrix.Identity(4), [], (0.0, -1)
        for k, alvo in enumerate(tetos):
            h, c, a = T @ cabecas[k], T @ caudas[k], (T.to_3x3() @ eixos[k]).normalized()
            giro = lambda g: Matrix.Translation(h) @ Matrix.Rotation(math.radians(g), 4, a) @ Matrix.Translation(-h)
            livre = lambda g: folga(h, giro(g) @ c)
            escolha = alvo
            if alvo > minimo:
                passos = [minimo + (alvo - minimo) * j / 16 for j in range(17)]
                if livre(passos[0]) < 0:  # já começa encostado: o ângulo com mais folga
                    escolha = max(passos, key=livre)
                else:
                    for anterior, g in zip(passos, passos[1:]):
                        if livre(g) < 0: escolha = anterior; break
            if livre(escolha) < pior[0]: pior = (livre(escolha), k)
            angulos.append(escolha)
            T = giro(escolha) @ T
        return angulos, pior
    tetos = list(desejados)
    angulos, pior = resolver(tetos)
    for _ in range(8):
        if pior[0] >= -0.01 or pior[1] <= 0: break
        tetos[pior[1] - 1] = min(tetos[pior[1] - 1], angulos[pior[1] - 1]) - 10
        angulos, pior = resolver(tetos)
    for n, g in zip(nomes, angulos):  # aplica de verdade, da base à ponta
        aplicar_q(n, Quaternion((delta(pb[n]) @ eixo_repouso).normalized(), math.radians(g)))
    return angulos

def posar_dedos(s, sx, t):
    chaves = DEDOS_MAO_E if s == 'L' else DEDOS_MAO_D
    palma = (delta(pb[f'mao.{s}']) @ V((0, 0, -1))).normalized()
    tambor = curva(t, TAMBORILA)
    for i, d in enumerate(DEDOS):
        if f'{d}.1.{s}' not in pb: continue
        st = curva(t - 25 * (3 - i if s == 'L' else i), chaves)  # fecham em cascata, do mínimo ao indicador
        # tamborilar: cada garra levanta e bate na madeira, em sequência (a direita fora de fase)
        fase = 2 * math.pi * (t - 1300 - 110 * i - (0 if s == 'L' else 300)) / 650
        toque = tambor * 38 * max(0.0, math.sin(fase)) ** 3
        aplicar_q(f'{d}.1.{s}', Quaternion(palma, math.radians(-sx * st[3] * (i - 1.5) / 1.5)))
        dobrar_com_contato([f'{d}.{k}.{s}' for k in (1, 2, 3)], V((0, sx, 0)),
                           (st[0] - toque, st[1] + 0.4 * toque, st[2]))
    if f'polegar.1.{s}' in pb:
        st = curva(t, chaves)
        dobrar_com_contato([f'polegar.1.{s}', f'polegar.2.{s}'], V((sx, 0, 0)), (0.5 * st[0], 0.5 * st[1]), minimo=-15)

def penetracao(lado=None):  # a pior entrada de um osso da mão numa superfície (no mundo)
    pior, quem = 0.0, ''
    for b in pb:
        if lado and not b.name.endswith('.' + lado): continue
        if b.name.split('.')[0] in DEDOS + ['polegar', 'mao']:
            f = folga(b.head, b.tail) + RAIO_DO_DEDO * 0.5
            if f < pior: pior, quem = f, b.name
    return (round(pior, 3), quem)

def entrada_da_palma(s):
    """Com os dedos articulados, o pulso só desvia da palma (do pulso até os nós dos dedos): os dedos se resolvem
    depois, falange por falange, no contato. Testar os dedos em repouso erguia a mão inteira pelas garras curvas
    da malha, e ela pairava sobre a borda."""
    if not DEDOS_ARTICULADOS or f'dedo2.1.{s}' not in pb: return penetracao(s)[0]
    b = pb[f'mao.{s}']
    return round(min(0.0, folga(b.head, pb[f'dedo2.1.{s}'].head)), 3)

# Parte do olhar feita pelo peito: com tudo no pescoço e na cabeça, a cabeça dobrava para trás e a gola alta
# (que segue o peito) cortava o rosto.
PEITO_NO_OLHAR = 0.1  # debruçado: se o peito seguisse o olhar (câmera alta), ele se endireitava e o rosto saía do quadro
# Limite de cada giro de olhar (pescoço e depois cabeça). Com 65°, o rosto parava ~10° abaixo da câmera e ele parecia
# olhar para a frente, não para o jogador; com o pivô no centro do crânio e a gola dobrando, 90° fecha o olhar.
OLHAR_MAX = 90.0
def para_o_alvo(alvo, peso):  # rotação (fração `peso`) que leva o rosto ao alvo, limitada a OLHAR_MAX no total
    q = rosto().rotation_difference(alvo)
    return Quaternion().slerp(q, peso * min(1.0, math.radians(OLHAR_MAX) / max(q.angle, 1e-6)))

GOLA_EXT_DEITADA = 50.0  # com a cabeça estendida isso sobre o peito, a gola já deita de vez nas costas (90°)
GOLA_ENCOLHE = 0.5
def dobrar_gola(encarando):
    """Deita a gola nas costas enquanto ele encara a câmera com a cabeça estendida (presa ao peito, ela cortava o rosto).
    Olhando o dado (bote), a cabeça baixa e a gola fica no lugar: deitada, aparecia como um leque por cima da cabeça."""
    p, c = pb['peito'], pb['cabeca']
    d = p.matrix.to_3x3().inverted() @ (c.tail - c.head).normalized()  # eixo da cabeça no espaço do peito (Z local = frente)
    ext = math.degrees(math.atan2(-d.z, d.y))  # > 0: a cabeça está estendida para trás
    # só debruçado: com o peito em pé (na saída), a gola deitada apontava para cima atrás da cabeça
    debruce = math.degrees((p.tail - p.head).normalized().angle(V((0, 0, 1))))
    u = min(1.0, max(0.0, ext / GOLA_EXT_DEITADA)) * encarando * min(1.0, max(0.0, (debruce - 35) / 30))
    if u > 0:
        k = u * u * (3 - 2 * u)
        girar('gola', 'X', -90.0 * k)
        # deitada, a gola encurta (dobrada rente à de baixo): inteira, sobrava uma faixa larga nas costas
        pb['gola'].scale = (1.0, 1.0 - GOLA_ENCOLHE * k, 1.0); atualizar()
def posar(t, recuo=0.0, ergue=0.0):
    """recuo (+Y, para longe da bandeja) e ergue (+Z) somam-se ao quadril: é a correção que tira o corpo da madeira."""
    for b in pb: b.matrix_basis = Matrix.Identity(4)
    atualizar()
    resp = math.sin(2 * math.pi * t / 1400)
    balanco = math.sin(2 * math.pi * t / 2600 + 0.7)
    q = pb['quadril']
    q.matrix = Matrix.Translation(V((0, curva(t, AVANCA) + recuo, curva(t, SOBE) + ergue + 0.004 * resp))) @ q.matrix
    atualizar()
    girar('coluna', 'X', curva(t, INCL_COLUNA))
    girar('coluna', 'Z', 2.0 * balanco)
    girar('peito', 'X', curva(t, INCL_PEITO) + 1.5 * resp)
    w = curva(t, OLHAR)
    alvo_olhar = m(CAMERA).lerp(m(DADO), curva(t, NO_DADO))
    olho = lambda: pb['cabeca'].head + (pb['cabeca'].tail - pb['cabeca'].head) * 0.45
    if w > 0:  # o peito entra no olhar (antes dos braços, para o IK já partir dos ombros certos): a gola sobe junto
        fracao = PEITO_NO_OLHAR * w * (1 - curva(t, NO_DADO))  # no bote o peito não segue o olhar (perdia o alcance)
        aplicar_q('peito', Quaternion().slerp(rosto().rotation_difference((alvo_olhar - olho()).normalized()), fracao))
    ombro = curva(t, OMBRO) + 1.2 * resp
    for s, sx, chaves in (('L', 1, MAO_E), ('R', -1, MAO_D)):
        girar(f'clavicula.{s}', 'Y', -sx * ombro)
        pulso_mundo = lado(curva(t, chaves), sx)
        dedos = curva(t - 80, DEDOS_E) if s == 'L' else curva(t - 80, DEDOS_D)  # follow-through: a mão chega depois
        dedos = V((sx * dedos.x, dedos.y, dedos.z))
        polo = curva(t, POLO_E) if s == 'L' else POLO_AGARRA.copy()
        palma = curva(t - 80, PALMA_E) if s == 'L' else BAIXO.copy()
        alvo = pulso_mundo.copy()
        for _ in range(4):  # mão rígida: se alguma parte entra numa superfície, o pulso sobe o necessário (pousa, não atravessa)
            ik(s, sx, m(alvo), V((sx * polo.x, polo.y, polo.z)))
            apontar(f'mao.{s}', dedos)
            torcer(f'mao.{s}', V((0, 0, -1)), palma)
            entra = entrada_da_palma(s)
            if entra >= -0.005: break
            alvo.y += -entra + 0.02
        desviar_cotovelo(s, dedos, palma)
        if DEDOS_ARTICULADOS: posar_dedos(s, sx, t)
    queixo = curva(t, QUEIXO)
    girar('pescoco', 'X', queixo * 0.4)
    girar('cabeca', 'X', queixo * 0.6)
    if w > 0:  # encara o jogador; na tentativa, olha para o dado. 60% no pescoço (a gola segue), o resto na cabeça
        aplicar_q('pescoco', para_o_alvo((alvo_olhar - olho()).normalized(), 0.6 * w))  # o pescoço leva a gola junto
        aplicar_q('cabeca', para_o_alvo((alvo_olhar - olho()).normalized(), w))
    rolo = curva(t, ROLO)
    if rolo: aplicar_q('cabeca', Quaternion(rosto(), math.radians(rolo)))
    dobrar_gola(w * (1 - curva(t, NO_DADO)))

# --- Grava o clipe (tempo do clipe = quadro / FPS = relógio do presságio)
scene = bpy.context.scene
scene.render.fps = FPS
fim = round(DUR / 1000 * FPS)
scene.frame_start, scene.frame_end = 0, fim
arm.animation_data_create()
arm.animation_data.action = bpy.data.actions.new('par')
# --- O corpo não atravessa a bandeja. A coreografia põe o peito na altura da parede, inclinado sobre ela; sem
# conferência, o tronco entrava na madeira o clipe inteiro (o H2.5 com ~6.000 vértices, o H3.1 com ~1.300).
# A cada quadro, a malha deformada do corpo (sem as mãos, que têm contato próprio) é medida contra a parede de trás e
# o feltro; se entra, o quadril recua (+Y) ou sobe (+Z), o que for mais curto, e a pose é refeita (os braços refazem
# o IK até a borda). Depois as correções são suavizadas no tempo: máximo numa janela e média, nunca abaixo do preciso.
import numpy as np
BANDEJA = {'fundo': ((0, WH / 2, -HD - WT / 2), (HW + WT, WH / 2, WT / 2)), 'frente': ((0, WH / 2, HD + WT / 2), (HW + WT, WH / 2, WT / 2)),
           'esq': ((-HW - WT / 2, WH / 2, 0), (WT / 2, WH / 2, HD)), 'dir': ((HW + WT / 2, WH / 2, 0), (WT / 2, WH / 2, HD)),
           'feltro': ((0, -0.5, 0), (HW, 0.5, HD))}
# Só o tronco e a cabeça movem o quadril. Os braços ficam de fora: recuar o corpo estica o braço que passa por cima
# da parede, ele cruza mais a madeira e a correção dispara (chegou a 0,6 m e as mãos não alcançavam mais a borda).
MAOS = ('mao', 'dedo1', 'dedo2', 'dedo3', 'dedo4', 'polegar', 'braco', 'antebraco')
_nomes = {g.index: g.name for g in corpo.vertex_groups}
DO_CORPO = np.array([not (v.groups and _nomes[max(v.groups, key=lambda g: g.weight).group].split('.')[0] in MAOS)
                     for v in corpo.data.vertices])
def malha_no_three(mascara=None):
    atualizar()
    ev = corpo.evaluated_get(bpy.context.evaluated_depsgraph_get()); me = ev.to_mesh()
    pc = np.empty(len(me.vertices) * 3); me.vertices.foreach_get('co', pc); ev.to_mesh_clear()
    pc = pc.reshape(-1, 3) if mascara is None else pc.reshape(-1, 3)[mascara]
    mw = np.array(corpo.matrix_world); pc = pc @ mw[:3, :3].T + mw[:3, 3]
    return np.stack([pc[:, 0] * ESCALA, pc[:, 2] * ESCALA + ANCORA.y, -pc[:, 1] * ESCALA + ANCORA.z], 1)
BRACO_DE = {s: np.array([bool(v.groups) and _nomes[max(v.groups, key=lambda g: g.weight).group] in (f'braco.{s}', f'antebraco.{s}')
                         for v in corpo.data.vertices]) for s in ('L', 'R')}
def entrada_do_braco(s):  # o quanto o braço (sem a mão) está dentro da parede de trás, em unidades do three
    p = malha_no_three(BRACO_DE[s])
    c, h = np.array(BANDEJA['fundo'][0]), np.array(BANDEJA['fundo'][1])
    q = np.abs(p - c) - h
    d = np.all(q < -0.002, 1)
    return float((-q[d].max(1)).max()) if d.any() else 0.0
def desviar_cotovelo(s, dedos, palma):
    """Braço que passa da parede para o feltro ou para o dado: com o cotovelo atrás e abaixo do topo, o antebraço
    atravessava a madeira. Gira o braço em volta do eixo ombro–pulso (a mão fica no alvo e o cotovelo sobe por cima
    da parede), no menor ângulo que tira o braço da madeira. Se nenhum tira, fica o de menor entrada."""
    if entrada_do_braco(s) < 0.005: return
    nomes = (f'braco.{s}', f'antebraco.{s}', f'mao.{s}')
    salvo = [pb[n].matrix.copy() for n in nomes]
    ombro, pulso = pb[nomes[0]].head.copy(), pb[nomes[1]].tail.copy()
    eixo = (pulso - ombro).normalized()
    def tentar(g):
        for n, mt in zip(nomes, salvo): pb[n].matrix = mt; atualizar()
        if g: aplicar_q(nomes[0], Quaternion(eixo, math.radians(g)), pivo=ombro)
        apontar(nomes[2], dedos)
        torcer(nomes[2], V((0, 0, -1)), palma)
        return entrada_do_braco(s)
    melhor = (1e9, 0)
    for g in (15, -15, 30, -30, 45, -45, 60, -60, 75, -75, 90, -90, 110, -110):
        e = tentar(g)
        if e < melhor[0]: melhor = (e, g)
        if e < 0.005: return
    tentar(melhor[1])

def necessidade_do_corpo():
    """(recuo, ergue) em unidades do modelo que tiram da madeira todo vértice do corpo que entrou."""
    p = malha_no_three(DO_CORPO)
    recua = sobe = 0.0
    for nome in ('fundo', 'feltro'):
        c, h = np.array(BANDEJA[nome][0]), np.array(BANDEJA[nome][1])
        d = np.all(np.abs(p - c) - h < -0.002, 1)
        if d.any():
            sobe = max(sobe, float(((c[1] + h[1]) - p[d, 1]).max()))     # até sair pelo topo
            recua = max(recua, float((p[d, 2] - (c[2] - h[2])).max()))  # até sair pela face de trás
    return recua / ESCALA, sobe / ESCALA

TOPO_CURTO = 0.04  # o peito debruçado que mal toca o topo sobe um pouco (até 4 cm); o resto recua
SAIDA_PELO_TOPO = False  # por cima não serve: com o tronco inclinado sempre sobra sobretudo na altura da parede (subiu 1,1 m)
_f = (ALVO - CAMERA).normalized(); _r = _f.cross(V((0, 1, 0))).normalized(); _u = _r.cross(_f)
def na_tela(p_modelo):  # % da altura da tela, a partir do topo (negativo = fora do quadro)
    d = mundo(p_modelo) - CAMERA
    return round(50 * (1 - (d.dot(_u) / d.dot(_f)) / math.tan(math.radians(FOV / 2))), 1)
correcao = []
for f in range(0, fim + 1):
    r = e = 0.0
    for _ in range(10):
        posar(f * 1000 / FPS, r, e)
        nr, ne = necessidade_do_corpo()
        if max(nr, ne) < 0.001:
            # o braço que o cotovelo não conseguiu tirar (a manga junto do ombro quase não se move no giro): sobe o corpo
            nb = max(entrada_do_braco('L'), entrada_do_braco('R')) / ESCALA
            if nb < 0.0007: break
            e += nb + 0.002
            continue
        # sempre por cima: recuar tira o rosto do quadro (quem está mais atrás sobe na tela) e o alcance do bote
        if SAIDA_PELO_TOPO or ne < min(nr, TOPO_CURTO): e += ne + 0.002
        else: r += nr + 0.002
    correcao.append((r, e))
def suave(vals, janela=4, media=3):
    mx = [max(vals[max(0, i - janela):i + janela + 1]) for i in range(len(vals))]
    return [sum(mx[max(0, i - media):i + media + 1]) / len(mx[max(0, i - media):i + media + 1]) for i in range(len(mx))]
recuos, ergues = suave([c[0] for c in correcao]), suave([c[1] for c in correcao])
print('CORRECAO_MAX recuo', round(max(recuos), 3), 'ergue', round(max(ergues), 3), '(m na figura de 1,8)')

for f in range(0, fim + 1):
    posar(f * 1000 / FPS, recuos[f], ergues[f])
    if f % 5 == 0: print('QUADRO', f * 40, {k: round(v, 2) for k, v in cotovelos.items()}, 'penetra', penetracao(),
                         'recuo', round(recuos[f], 3), 'ergue', round(ergues[f], 3),
                         'cabeca_topo%', na_tela(pb['cabeca'].tail), 'queixo%', na_tela(pb['cabeca'].head))
    for b in pb:
        b.keyframe_insert('rotation_quaternion', frame=f)
        b.keyframe_insert('location', frame=f)
        if b.name == 'gola': b.keyframe_insert('scale', frame=f)
bpy.ops.object.mode_set(mode='OBJECT')

# --- Conferência do corpo inteiro (com as mãos): a malha deformada contra as paredes e o feltro, quadro a quadro.
pior_corpo = (0.0, 0, '')
for f in range(0, fim + 1, 2):
    scene.frame_set(f)
    ev = corpo.evaluated_get(bpy.context.evaluated_depsgraph_get()); me = ev.to_mesh()
    pc = np.empty(len(me.vertices) * 3); me.vertices.foreach_get('co', pc); ev.to_mesh_clear()
    mw = np.array(corpo.matrix_world); pc = pc.reshape(-1, 3) @ mw[:3, :3].T + mw[:3, 3]
    pc = np.stack([pc[:, 0] * ESCALA, pc[:, 2] * ESCALA + ANCORA.y, -pc[:, 1] * ESCALA + ANCORA.z], 1)
    for nome, (c, h) in BANDEJA.items():
        q = np.abs(pc - np.array(c)) - np.array(h)
        dentro = np.all(q < 0, 1)
        if dentro.any():
            fundo = float((-q[dentro].max(1)).max())
            if fundo > pior_corpo[0]: pior_corpo = (fundo, f * 1000 // FPS, nome)
            if fundo > 0.02: print('CORPO_ENTRA', f * 1000 // FPS, 'ms', nome, int(dentro.sum()), 'vértices, fundo', round(fundo, 3))
print('CORPO_PIOR', round(pior_corpo[0], 3), 'em', pior_corpo[1], 'ms', pior_corpo[2])

bpy.ops.object.select_all(action='DESELECT')
arm.select_set(True); corpo.select_set(True)
bpy.ops.export_scene.gltf(filepath=saida, export_format='GLB', use_selection=True, export_skins=True,
                          export_animations=True, export_animation_mode='ACTIONS', export_image_format='WEBP')
print('EXPORTADO', saida, os.path.getsize(saida))

# --- Prévia: réplica da bandeja e da câmera do jogo
import bmesh
def material(nome, cor):
    mt = bpy.data.materials.new(nome); mt.diffuse_color = cor; return mt
madeira, feltro = material('madeira', (0.16, 0.08, 0.05, 1)), material('feltro', (0.30, 0.04, 0.06, 1))
def caixa(nome, c, meio, mt):  # centro e meias-medidas em unidades do three
    me = bpy.data.meshes.new(nome); bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(nome, me); o.data.materials.append(mt)
    o.location, o.scale = m(c), (2 * meio[0] / ESCALA, 2 * meio[2] / ESCALA, 2 * meio[1] / ESCALA)
    scene.collection.objects.link(o)
caixa('feltro', (0, -0.05, 0), (HW, 0.05, HD), feltro)
caixa('fundo', (0, WH / 2, -HD - WT / 2), (HW + WT, WH / 2, WT / 2), madeira)
caixa('frente', (0, WH / 2, HD + WT / 2), (HW + WT, WH / 2, WT / 2), madeira)
caixa('esq', (-HW - WT / 2, WH / 2, 0), (WT / 2, WH / 2, HD), madeira)
caixa('dir', (HW + WT / 2, WH / 2, 0), (WT / 2, WH / 2, HD), madeira)
caixa('dado', DADO - V((0, 0.35, 0)), (0.35, 0.35, 0.35), material('osso', (0.85, 0.82, 0.75, 1)))
caixa('piso', (0, -0.6, -2), (40, 0.5, 30), material('chao', (0.05, 0.06, 0.04, 1)))  # o chão sob a mesa esconde o corpo
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); scene.collection.objects.link(cam)
cam.data.sensor_fit, cam.data.angle_y = 'VERTICAL', math.radians(FOV)
cam.location = m(CAMERA)
cam.rotation_euler = (m(ALVO) - m(CAMERA)).to_track_quat('-Z', 'Y').to_euler()
scene.camera = cam
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light, scene.display.shading.color_type = 'STUDIO', 'TEXTURE'
scene.world = bpy.data.worlds.new('w'); scene.world.color = (0.03, 0.04, 0.03)
scene.render.resolution_x, scene.render.resolution_y = 960, 600
scene.frame_step = 2
scene.render.filepath = os.path.join(quadros, 'q_')
bpy.ops.render.render(animation=True)
# Closes de conferência: a mão esquerda na borda, vista de lado e de frente, aos 2.000 ms.
scene.frame_step = 1
lado_cam = bpy.data.objects.new('lado', bpy.data.cameras.new('lado')); scene.collection.objects.link(lado_cam)
lado_cam.data.angle = math.radians(35)
foco = m(BORDA + V((0, -0.3, 0.6)))
for nome, desloc, quadro, alvo in (('close-lado', V((0.9, 0.15, 0.25)), 50, foco), ('close-frente', V((0.25, -0.9, 0.45)), 50, foco),
                                   ('close-tambor', V((0.25, -0.9, 0.45)), 47, foco),
                                   ('close-bote', V((0.3, -0.8, 0.6)), 88, m(DADO_PULSO + V((0, -0.4, 0.8))))):
    lado_cam.location = alvo + desloc
    lado_cam.rotation_euler = (alvo - lado_cam.location).to_track_quat('-Z', 'Y').to_euler()
    scene.camera = lado_cam
    scene.frame_set(quadro)
    scene.render.filepath = os.path.join(os.path.dirname(quadros.rstrip('\\/')), nome + '.png')
    bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.splitext(saida)[0] + '-anim.blend')
print('PREVIA_OK')
