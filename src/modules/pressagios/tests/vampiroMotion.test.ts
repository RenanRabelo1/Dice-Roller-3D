import { describe, expect, it } from 'vitest';
import { Vector3, Quaternion } from 'three';
import { TRAY } from '../../arremesso/index.ts';
import type { PresagioVampiro } from '../../regras/index.ts';
import type { Pose, Vec3 } from '../../../shared/math.ts';
import { indicesComPercurso, movimentoNoPresagio } from '../domain/percurso.ts';
import { fechamentoDaPegada, VAMPIRO, VAMPIRO_MS, vampiroAt } from '../domain/vampiroMotion.ts';

const de: Pose = { p: [1, 0.8, -1.5], q: [0, 0, 0, 1] };
const para: Pose = { p: [0.5, 8, 6], q: [0, Math.SQRT1_2, 0, Math.SQRT1_2] };
const camera: Vec3 = [0, 17, 17 * 10 / 14];
const casos: [PresagioVampiro, number, number, number[]][] = [
  [{ tipo: 'par-de-criticos', dados: [1, 2] }, 1500, 5600, Object.values(VAMPIRO.par)],
  [{ tipo: 'critico-bestial', dados: [1] }, 1500, 4600, Object.values(VAMPIRO.critico)],
  [{ tipo: 'falha-bestial', dados: [1] }, 3500, 5400, Object.values(VAMPIRO.falha)],
];

const distance = (a: Vec3, b: Vec3) => new Vector3(...a).distanceTo(new Vector3(...b));
const move = (v: PresagioVampiro, ms: number, i = 1) => movimentoNoPresagio(i, ms, de, para, [], [], v, camera)!;

describe('Vampire motion', () => {
  it.each(casos)('carries only its own dice, continuously, for %j', (v, sombra, fim, marks) => {
    expect(VAMPIRO_MS[v.tipo]).toBe(fim);
    expect(indicesComPercurso(null, ['d20', 'vtm', 'vtm'], v).vampiro).toBe(v);
    expect(move(v, 0, 0)).toBeNull();
    for (const i of v.dados) {
      expect(move(v, 0, i)).toEqual({ pose: de, revela: 0, sombra, fim });
      expect(move(v, fim, i)).toEqual({ pose: para, revela: 1, sombra, fim });
      for (const t of marks) {
        const a = move(v, t - 0.1, i).pose, b = move(v, t + 0.1, i).pose;
        expect(distance(a.p, b.p), `position at ${t} ms`).toBeLessThan(0.06);
        expect(new Quaternion(...a.q).angleTo(new Quaternion(...b.q)), `rotation at ${t} ms`).toBeLessThan(0.015);
      }
    }
  });

  it('throws both dice almost to the camera before they recede to the result', () => {
    const v: PresagioVampiro = { tipo: 'par-de-criticos', dados: [1, 2] };
    const a = move(v, 3750, 1).pose.p, b = move(v, 3750, 2).pose.p;
    expect(distance(a, camera)).toBeLessThan(3);
    expect(distance(b, camera)).toBeLessThan(3);
    expect(distance(a, b)).toBeGreaterThan(1);
    expect(move(v, 4300).pose).toBe(para);
    expect(vampiroAt(v.tipo, 1900, [de.p]).esquerda).toEqual(move(v, 1900).pose.p);
    expect(vampiroAt(v.tipo, 2700).direita).toEqual(move(v, 2700, 2).pose.p);
  });

  it('staggers contact, separates the pair on pickup and opens the left hand for the transfer', () => {
    const type = 'par-de-criticos', origins: Vec3[] = [[-4, 0.7, -2], [-3.05, 0.7, -2]];
    const [first, second] = fechamentoDaPegada(type, 1740);
    expect(first).toBeGreaterThan(second);
    for (const t of [1900, 2700]) {
      const { esquerda, direita } = vampiroAt(type, t, origins);
      expect(Math.hypot(esquerda[0] - direita[0], esquerda[2] - direita[2])).toBeGreaterThan(2.4);
      expect(fechamentoDaPegada(type, t)).toEqual([1, 1]);
    }
    expect(fechamentoDaPegada(type, 3000)).toEqual([0, 1]);
  });

  it('holds the Fome die still until the attack and opens the camera hands as it approaches', () => {
    const v: PresagioVampiro = { tipo: 'falha-bestial', dados: [1] };
    expect(move(v, 3499).pose).toBe(de);
    expect(move(v, 3700).pose.p).not.toEqual(de.p);
    expect(distance(move(v, 3800).pose.p, camera)).toBeLessThan(distance(para.p, camera) - 2);
    expect(move(v, 3900).pose).toBe(para);
    expect(move(v, 4100).revela).toBe(0.5);
    expect(vampiroAt(v.tipo, 0).cobertura).toBe(0);
    expect(vampiroAt(v.tipo, 1700)).toMatchObject({ fase: 'destapa', cobertura: 1, corpo: { visivel: true } });
    expect(vampiroAt(v.tipo, 2700)).toMatchObject({ fase: 'espera', cobertura: 0 });
    expect(vampiroAt(v.tipo, 5000).corpo.visivel).toBe(false);
  });

  it('keeps the pair beside the right wall and the waiting attacker behind the back wall', () => {
    const origins: Vec3[] = [[-6, 0.7, -3.5], [3, 0.7, 3.5]];
    for (const t of Object.values(VAMPIRO.par)) {
      expect(vampiroAt('par-de-criticos', t, origins).corpo.p[0]).toBeGreaterThan(TRAY.halfWidth + TRAY.wallThickness);
    }
    expect(vampiroAt('falha-bestial', 3200, origins).corpo.p[2]).toBeLessThan(-TRAY.halfDepth - TRAY.wallThickness);
  });
});
