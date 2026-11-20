import { MathUtils, Quaternion, Vector3 } from 'three';
import { TRAY } from '../../arremesso/index.ts';
import type { TipoVampiro } from '../../regras/index.ts';
import { span, type Pose, type Vec3 } from '../../../shared/math.ts';
import type { MovimentoNoPresagio } from '../contracts.ts';

export const PAR = {
  surge: 700, revoada: 1000, cobre: 1760, descobre: 2140, sangue: 2900,
  revela: 3280, mostrado: 3800, sai: 4800, duration: 5600,
};
const VOO_DO_PAR = 3000;

export const VAMPIRO_MS: Record<TipoVampiro, number> = {
  'par-de-criticos': PAR.duration,
  'critico-bestial': 4600,
  'falha-bestial': 5400,
};

export const VAMPIRO = {
  critico: { sobe: 1000, pega: 1500, entrega: 2200, revela: 2800, sai: 3200 },
  falha: { surge: 1500, destapa: 1700, espera: 2700, ataque: 3500, contato: 3590, rasante: 3800, foge: 3900, revela: 4300, some: 5000 },
};

type Fase = 'presenca' | 'pega' | 'sai'
  | 'surge' | 'sobe' | 'entrega' | 'tampa' | 'destapa' | 'espera' | 'ataque' | 'foge';

interface Corpo {
  p: Vec3;
  yaw: number;
  lean: number;
  crouch: number;
  step: number; // signed swing of a step
  visivel: boolean;
}

interface Quadro {
  fase: Fase;
  corpo: Corpo;
  esquerda: Vec3;
  direita: Vec3;
  cobertura: number;
}

const smooth = (t: number, a: number, b: number) => {
  const u = span(t, a, b);
  return u * u * (3 - 2 * u);
};
const mix = (a: Vec3, b: Vec3, u: number): Vec3 => [
  a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u,
];
const offset = (p: Vec3, x: number, y: number, z: number): Vec3 => [p[0] + x, p[1] + y, p[2] + z];
const borda = TRAY.halfWidth + TRAY.wallThickness, fundo = -TRAY.halfDepth - TRAY.wallThickness;
const CAMERA_PADRAO: Vec3 = [0, 14, 10];
const olhar = new Vector3(...CAMERA_PADRAO).normalize();
const fit = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));

// The hand travels down to the resting die, meets it, then rises to the carry point.
const contact = (start: number, stop: number) => start + (stop - start) * 0.25;
const pickupHand = (t: number, start: number, stop: number, idle: Vec3, die: Vec3, hold: Vec3, arc: Vec3): Vec3 => {
  const reach = contact(start, stop);
  return t < reach ? mix(idle, die, smooth(t, start, reach)) : pickupDie(t, start, stop, die, hold, arc);
};
const pickupDie = (t: number, start: number, stop: number, die: Vec3, hold: Vec3, [x, y, z]: Vec3): Vec3 => {
  const u = smooth(t, contact(start, stop), stop), lift = Math.sin(Math.PI * u);
  return offset(mix(die, hold, u), x * lift, y * lift, z * lift);
};
const ENTREGA_A_FRENTE: Vec3 = [0, 0.25, 2.95];
export function parAt(t: number) {
  const sai = 1 - MathUtils.smootherstep(t, PAR.sai, PAR.duration);
  const escorre = 1 - (1 - span(t, PAR.sangue, PAR.sai)) ** 2.25;
  return {
    aparece: MathUtils.smootherstep(t, 0, PAR.surge) * sai,
    revoada: span(t, PAR.revoada, PAR.sangue),
    sangue: escorre * sai,
    revela: MathUtils.smootherstep(t, PAR.revela, PAR.mostrado),
    voo: MathUtils.smootherstep(t, VOO_DO_PAR, PAR.mostrado),
  };
}

const HORIZONTAL = new Vector3(1, 0, 0);
const VERTICAL = new Vector3(0, 10, -14).normalize();
const NORMAL = new Vector3(...CAMERA_PADRAO).normalize();
const DORSO = new Vector3(0, 1, 0), EIXO_LONGITUDINAL = new Vector3(0, 0, 1);
// A few bats crossing the screen, not a wall: a loose group in three depths, each at its own height and drift.
const CAMADAS = [
  { quantidade: 3, profundidade: 0.375, escala: 0.91, varEscala: 0.055 },
  { quantidade: 6, profundidade: 0.53, escala: 0.79, varEscala: 0.075 },
  { quantidade: 5, profundidade: 0.842, escala: 0.755, varEscala: 0.024 },
];
export const NUMERO_DE_MORCEGOS = CAMADAS.reduce((n, { quantidade }) => n + quantidade, 0);
export const ENVERGADURA = 1.46;
export const AMPLITUDE_DA_ASA = MathUtils.degToRad(53);
const MEIA_ALTURA = Math.tan(MathUtils.degToRad(20)), MEIA_LARGURA = MEIA_ALTURA * 1.6;
const variacao = (seed: number) => {
  const value = Math.sin(seed * 17.117 + 21.14) * 43758.5453;
  return value - Math.floor(value);
};

const bandos = CAMADAS.flatMap((layer, camada) =>
  Array.from({ length: layer.quantidade }, (_, slot) => {
    const seed = 283 * camada + slot * 2.399963;
    return {
      camada, seed,
      // the spread staggers the arrivals; within [-1.2, 1.1] even the slowest bat enters and leaves the screen
      x: -1.2 + 2.3 * variacao(seed),
      y: -0.7 + 1.45 * variacao(seed + 19),
      deriva: 0.5 * (variacao(seed + 31) - 0.5),
      velocidade: 0.75 + 0.50 * variacao(seed + 11),
      profundidade: layer.profundidade + (variacao(seed + 8) - 0.5) * 0.018,
      escala: layer.escala + layer.varEscala * variacao(seed + 7),
    };
  }));

export function revoadaAt(t: number, camera: Vec3 = CAMERA_PADRAO) {
  const { revoada: u } = parAt(t);
  if (u === 0 || u === 1) return [];
  const sweep = 6.5 * (u - 0.5) - 0.98 * Math.sin((u - 0.5) * 2 * Math.PI);
  const eye = new Vector3(...camera);
  const distance = eye.length();
  return bandos.map((bat) => {
    const { camada, x, y, seed, escala, velocidade, deriva } = bat;
    const profundidade = bat.profundidade * distance + 0.075 * Math.sin(t * 0.005 + seed);
    const frequencia = 7.3 + Math.cos(seed) * 0.85;
    const fase = t / 1000 * frequencia * 2 * Math.PI + seed;
    const passage = x + sweep * velocidade + 0.034 * Math.sin(t * 0.003 + seed);
    const altura = y + deriva * (u - 0.5) + 0.055 * Math.sin(t * 0.0057 + seed);
    const p = eye.clone().addScaledVector(NORMAL, -profundidade)
      .addScaledVector(HORIZONTAL, passage * profundidade * MEIA_LARGURA)
      .addScaledVector(VERTICAL, altura * profundidade * MEIA_ALTURA);
    const rumo = -0.19 + MathUtils.degToRad(20) * Math.sin(t * 0.003 + seed);
    const dorsal = eye.clone().sub(p).normalize();
    const orientacao = new Quaternion().setFromUnitVectors(DORSO, dorsal)
      .multiply(new Quaternion().setFromAxisAngle(DORSO, rumo))
      .multiply(new Quaternion().setFromAxisAngle(EIXO_LONGITUDINAL, 0.20 * Math.cos(t * 0.008 + seed)));
    return { p, rumo, fase, escala, orientacao, frequencia, velocidade, camada, batida: AMPLITUDE_DA_ASA * Math.sin(fase) ** 3 };
  });
}

export function fechamentoDaPegada(tipo: TipoVampiro, t: number): readonly [number, number] {
  if (tipo === 'critico-bestial') {
    const { pega, entrega, sai } = VAMPIRO.critico, reach = contact(pega, entrega);
    return [0, smooth(t, reach - 40, reach + 110) * (1 - smooth(t, sai - 120, sai))];
  }
  return [0, 0];
}

function presencaAt(t: number): Quadro {
  const { aparece } = parAt(t);
  // The torso leans over the lip while the hands rise to either side of it.
  const avanco = MathUtils.smoothstep(aparece, 0.70, 1);
  const ergue = MathUtils.smoothstep(aparece, 0.1, 1);
  const altura = -10.25 + ergue * (8.38 + 0.014 * Math.sin(t / 450));
  const p: Vec3 = [0, altura, fundo - 5.00 + 3.463 * avanco];
  const mao = (side: number): Vec3 => [side * (1.45 + 0.39 * avanco),
    altura + 5.94 + 0.020 * Math.sin(t / 530 + side * 0.4), p[2] + 2.50 + 1.83 * avanco];
  return {
    fase: 'presenca', cobertura: 0,
    corpo: { p, yaw: 0, lean: 1.105 + 0.006 * Math.sin(t / 550), crouch: 0, step: 0, visivel: aparece > 0 },
    esquerda: mao(-1), direita: mao(1),
  };
}

function criticoAt(t: number, die: Vec3 | undefined, carried: Vec3 | undefined): Quadro {
  const m = VAMPIRO.critico, duration = VAMPIRO_MS['critico-bestial'];
  const emerge = smooth(t, 0, m.sobe), climb = smooth(t, m.sobe, m.pega);
  const deliver = smooth(t, m.entrega, m.sai);
  const leap = smooth(t, m.sai, 3900), sink = smooth(t, 3900, duration);
  const edge: Vec3 = [borda + 1.25, -13.8 + 5.18 * emerge, -1.5];
  const inside: Vec3 = die ? [fit(die[0] * 0.59 + 4.0, 5.9), -3.9, fit(die[2] - 1.95, 4.4)] : [4.5, -3.9, -2];
  const afterPickup: Vec3 = [3.2, -4, -2.0], forward: Vec3 = [2.2, -2.65, -1.0];
  const hop = offset(mix(edge, inside, climb), 0, 0.6 * Math.sin(Math.PI * climb), 0);
  const approach = mix(hop, afterPickup, smooth(t, m.pega + 360, m.entrega));
  const leave = mix(forward, [borda + 1.48, -7.35, -1.6], leap);
  const position = t < m.sai ? mix(approach, forward, deliver)
    : offset(leave, 0, 1.18 * Math.sin(Math.PI * leap) - 7.2 * sink, 0);
  const corpo: Corpo = {
    p: position, yaw: -0.38 - 0.44 * climb * (1 - deliver) + 1.58 * leap,
    lean: 0.20 + 0.55 * climb * (1 - leap) + 0.12 * Math.sin(Math.PI * span(t, m.pega, m.entrega)),
    crouch: 0.68 * climb + 0.37 * Math.sin(Math.PI * span(t, m.pega, m.entrega)),
    step: 0.5 * Math.sin(t / 92) * Math.sin(Math.PI * deliver), visivel: t < duration,
  };
  const reachFrom = offset(inside, 0.6, 6.18, 1.7);
  const idle = t < m.pega ? mix(offset(edge, -0.6, 8.0, 0.35), reachFrom, climb)
    : offset(position, 1.65, 6.2, 1.8);
  const hold: Vec3 = [3.75, 3.25, 1.95];
  const direita = t < m.pega ? idle : t < m.entrega
    ? pickupHand(t, m.pega, m.entrega, reachFrom, die ?? hold, hold, ENTREGA_A_FRENTE)
    : mix(carried ?? hold, idle, smooth(t, m.sai, m.sai + 380));
  const fase = t < m.sobe ? 'surge' : t < m.pega ? 'sobe' : t < m.entrega ? 'pega' : t < m.sai ? 'entrega' : 'sai';
  return { fase, corpo, esquerda: offset(position, -2.7, 6.5, 1.2 + 1.9 * climb), direita, cobertura: 0 };
}

function falhaAt(t: number, die: Vec3 | undefined, carried: Vec3 | undefined): Quadro {
  const m = VAMPIRO.falha;
  const wait = smooth(t, m.espera, m.ataque), lunge = smooth(t, m.ataque, m.foge), flee = smooth(t, m.foge, m.some);
  const reach = Math.sin(Math.PI * span(t, m.ataque, m.foge));
  const back: Vec3 = [-0.28, -5.55, fundo - 1.35], ahead: Vec3 = [0.2, -1.9, 0.05];
  const stride = mix(back, ahead, lunge);
  const forward = die ? offset(stride, fit(die[0] * 0.34, 2.2) * reach, 0, fit(die[2] * 0.24, 1.0) * reach) : stride;
  const exit = mix(ahead, [borda + 4.9, -6.2, -2.85], flee);
  const corpo: Corpo = {
    p: t < m.foge ? forward : offset(exit, 0, 1.15 * Math.sin(Math.PI * flee), 0),
    yaw: 1.42 * flee, lean: 0.66 + 0.14 * wait * (1 - lunge) + 0.10 * lunge - 0.44 * flee,
    crouch: 0.54 + 0.23 * wait * (1 - lunge),
    step: Math.sin(t / 61) * Math.sin(Math.PI * flee), visivel: t >= m.surge && t < m.some,
  };
  const recoil = smooth(t, m.foge, m.foge + 370);
  const idle = mix(offset(corpo.p, 2.4 + 0.36 * wait, 7.45 - 0.25 * wait, 5.1 + 0.36 * wait - 3.1 * lunge),
    offset(corpo.p, 2.1, 4.6, 3.85), recoil);
  const esquerda = mix(offset(corpo.p, -2.4 - 0.35 * wait, 7.35, 4.99 + 0.33 * wait - 2.9 * lunge),
    offset(corpo.p, -2.75, 4.30, 3.8), recoil);
  const direita = t < m.contato ? mix(idle, die ?? idle, smooth(t, m.ataque, m.contato))
    : mix(carried ?? die ?? idle, idle, smooth(t, m.foge, m.foge + 360));
  const fase = t < m.destapa ? 'tampa' : t < m.espera ? 'destapa' : t < m.ataque ? 'espera' : t < m.foge ? 'ataque' : 'foge';
  return {
    fase, corpo, direita, esquerda,
    cobertura: smooth(t, 0, m.destapa) * (1 - smooth(t, m.destapa, m.espera)),
  };
}

// World-space grips. The renderer reads the live carried die only in the delivery and lunge.
export function vampiroAt(tipo: TipoVampiro, t: number, origins: readonly Vec3[] = [], carried?: Vec3): Quadro {
  switch (tipo) {
    case 'par-de-criticos': return presencaAt(t);
    case 'critico-bestial': return criticoAt(t, origins[0], carried);
    case 'falha-bestial': return falhaAt(t, origins[0], carried);
  }
}

function poseAt(de: Pose, para: Pose, p: Vec3, u: number): Pose {
  return { p, q: new Quaternion(...de.q).slerp(new Quaternion(...para.q), u).toArray() };
}

function bestialDieAt(tipo: 'critico-bestial' | 'falha-bestial', t: number, de: Pose, para: Pose): Pose {
  if (tipo === 'critico-bestial') {
    const m = VAMPIRO.critico;
    if (t <= m.pega) return de;
    if (t >= m.sai) return para;
    const hold = criticoAt(m.entrega, undefined, undefined).direita;
    const p = t < m.entrega ? pickupDie(t, m.pega, m.entrega, de.p, hold, ENTREGA_A_FRENTE)
      : mix(hold, para.p, smooth(t, m.entrega, m.sai));
    return poseAt(de, para, p, smooth(t, contact(m.pega, m.entrega), m.sai));
  }
  const m = VAMPIRO.falha;
  if (t <= m.contato) return de;
  if (t >= m.foge) return para;
  const close = offset(para.p, -0.55 * para.p[0], 2.65 * olhar.y, 2.65 * olhar.z);
  const p = t < m.rasante ? mix(de.p, close, smooth(t, m.contato, m.rasante))
    : mix(close, para.p, smooth(t, m.rasante, m.foge));
  return poseAt(de, para, p, smooth(t, m.contato, m.rasante));
}

export function vampiroDieAt(tipo: TipoVampiro, t: number, de: Pose, para: Pose): MovimentoNoPresagio {
  const { critico, falha } = VAMPIRO;
  const fim = VAMPIRO_MS[tipo];
  switch (tipo) {
    case 'par-de-criticos': {
      const { revela, voo } = parAt(t);
      const pose = voo === 0 ? de : voo === 1 ? para : poseAt(de, para, mix(de.p, para.p, voo), voo);
      return { pose, revela, sombra: VOO_DO_PAR, fim };
    }
    case 'critico-bestial':
      return { pose: bestialDieAt(tipo, t, de, para), revela: span(t, critico.revela, critico.sai), sombra: critico.pega, fim };
    case 'falha-bestial':
      return { pose: bestialDieAt(tipo, t, de, para), revela: span(t, falha.foge, falha.revela), sombra: falha.ataque, fim };
  }
}
