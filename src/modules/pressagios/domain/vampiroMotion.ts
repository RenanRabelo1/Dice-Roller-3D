import { Quaternion, Vector3 } from 'three';
import { TRAY } from '../../arremesso/index.ts';
import type { TipoVampiro } from '../../regras/index.ts';
import { easeOut, span, type Pose, type Vec3 } from '../../../shared/math.ts';
import type { MovimentoNoPresagio } from '../contracts.ts';

export const VAMPIRO_MS: Record<TipoVampiro, number> = {
  'par-de-criticos': 5600,
  'critico-bestial': 4600,
  'falha-bestial': 5400,
};

export const VAMPIRO = {
  par: { pega: 1500, junta: 2300, prepara: 3000, arremesso: 3400, impacto: 3750, sai: 3800, assenta: 4300 },
  critico: { sobe: 1000, pega: 1500, entrega: 2200, revela: 2800, sai: 3200 },
  falha: { surge: 1500, destapa: 1700, espera: 2700, ataque: 3500, contato: 3590, foge: 3900, revela: 4300, some: 5000 },
};

type Fase = 'entra' | 'pega' | 'junta' | 'prepara' | 'arremesso' | 'assenta' | 'sai'
  | 'surge' | 'sobe' | 'entrega' | 'tampa' | 'destapa' | 'espera' | 'ataque' | 'foge';

interface Corpo {
  p: Vec3;
  yaw: number;
  lean: number;
  crouch: number;
  step: number; // signed swing of a step
  cabeca: boolean;
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
const local = ({ p, yaw, crouch }: Corpo, x: number, y: number, z: number) =>
  offset(p, x * Math.cos(yaw) + z * Math.sin(yaw), y - crouch, z * Math.cos(yaw) - x * Math.sin(yaw));
const borda = TRAY.halfWidth + TRAY.wallThickness;
const CAMERA_PADRAO: Vec3 = [0, 14, 10];
const segundoDado = (palma: Vec3) => offset(palma, -0.78, 0.74, 0.14);

// The hand travels down to the resting die, meets it, then rises to the carry point.
const pickupHand = (t: number, start: number, stop: number, idle: Vec3, die: Vec3, hold: Vec3): Vec3 => {
  const reach = start + (stop - start) * 0.34;
  return t < reach ? mix(idle, die, smooth(t, start, reach)) : mix(die, hold, smooth(t, reach, stop));
};
const pickupDie = (t: number, start: number, stop: number, die: Vec3, hold: Vec3): Vec3 =>
  mix(die, hold, smooth(t, start + (stop - start) * 0.34, stop));

function parAt(t: number, [a, b]: readonly Vec3[]): Quadro {
  const m = VAMPIRO.par;
  const enter = smooth(t, 0, m.pega), exit = smooth(t, m.sai, VAMPIRO_MS['par-de-criticos']);
  const step = Math.sin(t / 76) * (Math.sin(Math.PI * enter) + Math.sin(Math.PI * exit));
  const stance: Vec3 = [2.1, -0.75, 0.2];
  const walking = t < m.sai ? mix([borda + 3.5, -0.75, 1.6], stance, enter)
    : mix(stance, [borda + 4, -0.75, 1.9], exit);
  const ready = smooth(t, m.prepara, m.arremesso), cast = smooth(t, m.arremesso, m.impacto);
  const reach = Math.sin(Math.PI * span(t, m.pega, m.junta));
  const corpo: Corpo = {
    p: offset(walking, 0, 0.14 * Math.abs(step), 0),
    yaw: -1.15 * (1 - enter) + 1.5 * smooth(t, m.sai, m.sai + 450) - 0.38 * ready * (1 - cast),
    lean: 0.34 * reach + 0.32 * cast * (1 - smooth(t, m.impacto, m.assenta)),
    crouch: reach * 0.65, step, cabeca: false, visivel: t < VAMPIRO_MS['par-de-criticos'],
  };
  const leftIdle = local(corpo, -0.9, 2.25, 0.58 + 0.45 * step);
  const rightIdle = local(corpo, 0.9, 2.25, 0.58 - 0.45 * step);
  const leftHold: Vec3 = [1.03, 2.78, 1.2], rightHold: Vec3 = [2.85, 2.72, 1.2];
  const wind = mix(rightHold, [3.2, 3.5, -0.44], ready);
  const throwTo = mix(wind, [1.0, 3.65, 3.2], cast);
  const direita = t < m.pega ? rightIdle : t < m.junta
    ? pickupHand(t, m.pega, m.junta, [3, 1.5, 0.78], b ?? rightHold, rightHold)
    : mix(throwTo, rightIdle, smooth(t, m.impacto, m.assenta));
  const transfer = mix(leftHold, segundoDado(rightHold), smooth(t, m.junta, m.prepara));
  const esquerda = t < m.pega ? leftIdle : t < m.junta
    ? pickupHand(t, m.pega, m.junta, [1.2, 1.5, 0.78], a ?? leftHold, leftHold)
    : mix(transfer, leftIdle, smooth(t, m.prepara, m.arremesso));
  const fase = t < m.pega ? 'entra' : t < m.junta ? 'pega' : t < m.prepara ? 'junta'
    : t < m.arremesso ? 'prepara' : t < m.impacto ? 'arremesso' : t < m.sai ? 'assenta' : 'sai';
  return { fase, corpo, esquerda, direita, cobertura: 0 };
}

function criticoAt(t: number, die: Vec3 | undefined, carried: Vec3 | undefined): Quadro {
  const m = VAMPIRO.critico, duration = VAMPIRO_MS['critico-bestial'];
  const emerge = smooth(t, 0, m.sobe), climb = smooth(t, m.sobe, m.pega);
  const deliver = smooth(t, m.entrega, m.sai);
  const leap = smooth(t, m.sai, 3900), sink = smooth(t, 3900, duration);
  const edge: Vec3 = [borda + 0.45, -4.6 + 1.5 * emerge, -2.55];
  const inside: Vec3 = [3.8, -0.1, -0.8];
  const leave = mix([1.6, 1.05, 0.85], [borda + 1, -1.1, -2.45], leap);
  const position = t < m.sai ? mix(mix(edge, inside, climb), [1.6, 1.05, 0.85], deliver)
    : offset(leave, 0, 1.25 * Math.sin(Math.PI * leap) - 4.8 * sink, 0);
  const corpo: Corpo = {
    p: position, yaw: -0.62 * (1 - deliver) + 1.45 * leap,
    lean: 0.32 * Math.sin(Math.PI * span(t, m.pega, m.entrega)) + 0.2 * deliver * (1 - leap),
    crouch: 0.71 * Math.sin(Math.PI * climb) + 0.65 * Math.sin(Math.PI * span(t, m.pega, m.entrega)),
    step: 0.65 * Math.sin(t / 77) * Math.sin(Math.PI * deliver), cabeca: true, visivel: t < duration,
  };
  const idle = local(corpo, 0.78, 2.25, 0.7), hold: Vec3 = [2.55, 2.38, 1.35];
  const reachFrom = local({ ...corpo, p: inside, yaw: -0.62, crouch: 0 }, 0.78, 2.25, 0.7);
  const direita = t < m.pega ? idle : t < m.entrega
    ? pickupHand(t, m.pega, m.entrega, reachFrom, die ?? hold, hold)
    : mix(carried ?? hold, idle, smooth(t, m.sai, m.sai + 380));
  const fase = t < m.sobe ? 'surge' : t < m.pega ? 'sobe' : t < m.entrega ? 'pega' : t < m.sai ? 'entrega' : 'sai';
  return { fase, corpo, esquerda: local(corpo, -0.94, 2.45, 0.55), direita, cobertura: 0 };
}

function falhaAt(t: number, die: Vec3 | undefined, carried: Vec3 | undefined): Quadro {
  const m = VAMPIRO.falha;
  const wait = smooth(t, m.espera, m.ataque), lunge = smooth(t, m.ataque, m.foge), flee = smooth(t, m.foge, m.some);
  const forward = mix([-0.2, -0.1, -3.45], [0, 3.1, 1.85], lunge);
  const exit = mix([0, 3.1, 1.85], [borda + 4.2, -1.3, -1], flee);
  const corpo: Corpo = {
    p: t < m.foge ? forward : offset(exit, 0, 1.15 * Math.sin(Math.PI * flee), 0),
    yaw: 1.45 * flee, lean: 0.15 + 0.48 * wait * (1 - lunge) + 0.35 * lunge * (1 - flee),
    crouch: 0.65 * wait * (1 - lunge),
    step: Math.sin(t / 55) * Math.sin(Math.PI * flee), cabeca: true, visivel: t >= m.surge && t < m.some,
  };
  const idle = local(corpo, 1.15, 2.95 + 0.4 * wait, 0.75);
  const direita = t < m.contato ? mix(idle, die ?? idle, smooth(t, m.ataque, m.contato))
    : mix(carried ?? die ?? idle, idle, smooth(t, m.foge, m.foge + 360));
  const fase = t < m.destapa ? 'tampa' : t < m.espera ? 'destapa' : t < m.ataque ? 'espera' : t < m.foge ? 'ataque' : 'foge';
  return {
    fase, corpo, direita, esquerda: local(corpo, -1.15 - 0.4 * wait, 2.6, 0.7),
    cobertura: smooth(t, 0, m.destapa) * (1 - smooth(t, m.destapa, m.espera)),
  };
}

// World-space grips. The renderer reads the live carried die only in the delivery and lunge.
export function vampiroAt(tipo: TipoVampiro, t: number, origins: readonly Vec3[] = [], carried?: Vec3): Quadro {
  switch (tipo) {
    case 'par-de-criticos': return parAt(t, origins);
    case 'critico-bestial': return criticoAt(t, origins[0], carried);
    case 'falha-bestial': return falhaAt(t, origins[0], carried);
  }
}

function poseAt(de: Pose, para: Pose, p: Vec3, u: number): Pose {
  return { p, q: new Quaternion(...de.q).slerp(new Quaternion(...para.q), u).toArray() };
}

function parDieAt(t: number, slot: number, de: Pose, para: Pose, camera: Vec3): Pose {
  const m = VAMPIRO.par;
  if (t < m.pega) return de;
  if (t >= m.assenta) return para;
  const grip = (ms: number) => {
    const { esquerda, direita } = vampiroAt('par-de-criticos', ms);
    // The two dice occupy separate positions once they share the right palm.
    return slot === 0 ? (ms < m.prepara ? esquerda : segundoDado(direita)) : direita;
  };
  const hold = grip(m.junta);
  const near = new Vector3(...camera).normalize().multiplyScalar(-2.5).add(new Vector3(...camera));
  near.x += slot === 0 ? -0.67 : 0.67;
  const impact = near.toArray();
  let p: Vec3;
  if (t < m.junta) p = pickupDie(t, m.pega, m.junta, de.p, hold);
  else if (t < m.arremesso) p = grip(t);
  else if (t < m.impacto) p = mix(grip(m.arremesso), impact, easeOut(span(t, m.arremesso, m.impacto)));
  else p = mix(impact, para.p, smooth(t, m.impacto, m.assenta));
  return poseAt(de, para, p, smooth(t, m.pega + 280, m.impacto));
}

function bestialDieAt(tipo: 'critico-bestial' | 'falha-bestial', t: number, de: Pose, para: Pose): Pose {
  if (tipo === 'critico-bestial') {
    const m = VAMPIRO.critico;
    if (t <= m.pega) return de;
    if (t >= m.sai) return para;
    const hold = criticoAt(m.entrega, undefined, undefined).direita;
    const p = t < m.entrega ? pickupDie(t, m.pega, m.entrega, de.p, hold)
      : mix(hold, para.p, smooth(t, m.entrega, m.sai));
    return poseAt(de, para, p, smooth(t, m.entrega, m.sai));
  }
  const m = VAMPIRO.falha;
  if (t <= m.contato) return de;
  if (t >= m.foge) return para;
  const u = smooth(t, m.contato, m.foge);
  return poseAt(de, para, mix(de.p, para.p, u), u);
}

export function vampiroDieAt(tipo: TipoVampiro, slot: number, t: number, de: Pose, para: Pose, camera = CAMERA_PADRAO): MovimentoNoPresagio {
  const { par, critico, falha } = VAMPIRO;
  const fim = VAMPIRO_MS[tipo];
  switch (tipo) {
    case 'par-de-criticos':
      return { pose: parDieAt(t, slot, de, para, camera), revela: span(t, par.impacto, par.assenta), sombra: par.pega, fim };
    case 'critico-bestial':
      return { pose: bestialDieAt(tipo, t, de, para), revela: span(t, critico.revela, critico.sai), sombra: critico.pega, fim };
    case 'falha-bestial':
      return { pose: bestialDieAt(tipo, t, de, para), revela: span(t, falha.foge, falha.revela), sombra: falha.ataque, fim };
  }
}
