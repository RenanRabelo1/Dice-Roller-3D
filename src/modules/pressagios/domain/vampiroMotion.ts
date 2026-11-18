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
  falha: { surge: 1500, destapa: 1700, espera: 2700, ataque: 3500, contato: 3590, rasante: 3800, foge: 3900, revela: 4300, some: 5000 },
};

type Fase = 'entra' | 'pega' | 'junta' | 'prepara' | 'arremesso' | 'assenta' | 'sai'
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
const segundoDado = (palma: Vec3) => offset(palma, -1.08, 0.6, 0.22);
const fit = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));

// The hand travels down to the resting die, meets it, then rises to the carry point.
const contact = (start: number, stop: number) => start + (stop - start) * 0.25;
const pickupHand = (t: number, start: number, stop: number, idle: Vec3, die: Vec3, hold: Vec3, reachForward = 0.95): Vec3 => {
  const reach = contact(start, stop);
  return t < reach ? mix(idle, die, smooth(t, start, reach)) : pickupDie(t, start, stop, die, hold, reachForward);
};
const pickupDie = (t: number, start: number, stop: number, die: Vec3, hold: Vec3, reachForward = 0.95): Vec3 => {
  const u = smooth(t, contact(start, stop), stop), lift = Math.sin(Math.PI * u);
  return offset(mix(die, hold, u), 0, 0.25 * lift, reachForward * lift);
};
const ENTREGA_A_FRENTE = 2.95;

function parAt(t: number, [a, b]: readonly Vec3[]): Quadro {
  const m = VAMPIRO.par;
  const enter = smooth(t, 0, m.pega), exit = smooth(t, m.sai, VAMPIRO_MS['par-de-criticos']);
  const step = Math.sin(t / 98) * (Math.sin(Math.PI * enter) + Math.sin(Math.PI * exit));
  const stance: Vec3 = [borda + 1.85, -3.35, -2.25];
  const walking = t < m.sai ? mix([borda + 7.1, -3.35, -1.85], stance, enter)
    : mix(stance, [borda + 5.9, -3.35, -1.55], exit);
  const ready = smooth(t, m.prepara, m.arremesso), cast = smooth(t, m.arremesso, m.impacto);
  const reach = smooth(t, 1070, 1700) * (1 - 0.85 * smooth(t, 1770, m.junta));
  const corpo: Corpo = {
    p: offset(walking, 0, 0.20 * Math.abs(step), 0),
    yaw: -1.24 + 2.55 * smooth(t, m.sai, m.sai + 510) + 0.28 * ready * (1 - cast),
    lean: 0.29 + 0.52 * reach + 0.2 * cast * (1 - smooth(t, m.impacto, m.assenta)),
    crouch: reach * 0.18, step, visivel: t < VAMPIRO_MS['par-de-criticos'],
  };
  const leftStart: Vec3 = [6.5, 2.75, -2.2], rightStart: Vec3 = [7.1, 3.15, 1.1];
  const shift = walking[0] - stance[0];
  const leftIdle = offset(leftStart, shift, 0.27 * step, 0.5 * step);
  const rightIdle = offset(rightStart, shift, -0.27 * step, -0.52 * step);
  const leftHold: Vec3 = [4.0, 3.25, -0.8], rightHold: Vec3 = [5.9, 3.8, 0.8];
  const wind = mix(rightHold, [6.5, 5.1, -0.25], ready);
  const throwTo = mix(wind, [2.0, 5.35, 3.8], cast);
  const direita = t < m.pega ? rightIdle : t < m.junta
    ? pickupHand(t, m.pega, m.junta, rightStart, b ?? rightHold, rightHold)
    : mix(throwTo, rightIdle, smooth(t, m.impacto, m.assenta));
  const transfer = mix(leftHold, segundoDado(rightHold), smooth(t, m.junta, m.prepara));
  const esquerda = t < m.pega ? leftIdle : t < m.junta
    ? pickupHand(t, m.pega, m.junta, leftStart, a ?? leftHold, leftHold)
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
  const eye = new Vector3(...camera), axis = eye.clone().normalize();
  const relativeWidth = Math.min(1, Math.hypot(14, 10) / eye.length()), side = slot === 0 ? -1 : 1;
  const near = eye.addScaledVector(axis, -2.5);
  near.x += side * 0.67 * relativeWidth;
  near.addScaledVector(new Vector3(0, axis.z, -axis.y), side * (1 - relativeWidth) * 0.86);
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
