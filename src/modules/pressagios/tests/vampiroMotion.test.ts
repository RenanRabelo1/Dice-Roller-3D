import { describe, expect, it } from 'vitest';
import { Vector3, Quaternion } from 'three';
import { TRAY } from '../../arremesso/index.ts';
import type { PresagioVampiro } from '../../regras/index.ts';
import type { Pose, Vec3 } from '../../../shared/math.ts';
import { indicesComPercurso, movimentoNoPresagio } from '../domain/percurso.ts';
import { fechamentoDaPegada, PAR, parAt, revoadaAt, VAMPIRO, VAMPIRO_MS, vampiroAt } from '../domain/vampiroMotion.ts';

const de: Pose = { p: [1, 0.8, -1.5], q: [0, 0, 0, 1] };
const para: Pose = { p: [0.5, 8, 6], q: [0, Math.SQRT1_2, 0, Math.SQRT1_2] };
const camera: Vec3 = [0, 17, 17 * 10 / 14];
const casos: [PresagioVampiro, number, number, number[]][] = [
  [{ tipo: 'par-de-criticos', dados: [1, 2] }, 3000, 5600, Object.values(PAR)],
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

  it('runs the pair from emergence through flight, blood and reveal on one ordered clock', () => {
    const marks = [0, ...Object.values(PAR)];
    expect(marks.every((mark, i) => i === 0 || mark > marks[i - 1])).toBe(true);
    expect(parAt(0)).toEqual({ aparece: 0, revoada: 0, sangue: 0, revela: 0, voo: 0 });
    expect(parAt(PAR.surge).aparece).toBe(1);
    expect(PAR.revoada).toBe(1000);
    expect(revoadaAt(PAR.revoada)).toEqual([]);
    expect(parAt(PAR.cobre).revoada).toBeGreaterThan(0);
    expect(parAt(PAR.descobre).revoada).toBeGreaterThan(parAt(PAR.cobre).revoada);
    expect(revoadaAt(PAR.sangue)).toEqual([]);
    expect(parAt(PAR.sangue).sangue).toBe(0);
    expect(parAt(PAR.revela).revela).toBe(0);
    expect(parAt(PAR.mostrado).revela).toBe(1);
    expect(parAt(PAR.sai)).toEqual({ aparece: 1, revoada: 1, sangue: 1, revela: 1, voo: 1 });
    expect(parAt(PAR.duration)).toEqual({ aparece: 0, revoada: 1, sangue: 0, revela: 1, voo: 1 });
    for (let t = 0; t <= PAR.duration; t += 10) {
      const before = parAt(t - 10).sangue, { sangue } = parAt(t);
      if (t <= PAR.sangue) expect(sangue).toBe(0);
      else if (t <= PAR.sai) expect(sangue).toBeGreaterThan(before);
      else expect(sangue).toBeLessThan(before);
    }
  });

  it('leaves both dice on the felt through the flock and lights the numbers as they reach the result', () => {
    const v: PresagioVampiro = { tipo: 'par-de-criticos', dados: [1, 2] };
    for (const i of v.dados) {
      for (let t = 0; t <= PAR.sangue; t += 10) expect(move(v, t, i).pose).toBe(de);
      expect(move(v, PAR.revela - 1, i).revela).toBe(0);
      expect(move(v, (PAR.revela + PAR.mostrado) / 2, i).revela).toBeCloseTo(0.5);
      for (const t of [PAR.mostrado, PAR.sai, PAR.duration]) {
        expect(move(v, t, i).pose).toBe(para);
        expect(move(v, t, i).revela).toBe(1);
      }
    }
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

  it('keeps the pair centered behind the back wall and the waiting attacker behind it', () => {
    const origins: Vec3[] = [[-6, 0.7, -3.5], [3, 0.7, 3.5]];
    const type = 'par-de-criticos';
    const back = -TRAY.halfDepth - TRAY.wallThickness;
    for (const t of Object.values(PAR)) {
      const { corpo, esquerda, direita } = vampiroAt(type, t, origins);
      expect(corpo.p[0]).toBe(0);
      expect(corpo.p[2]).toBeLessThan(back);
      expect(esquerda[2]).toBeLessThan(back);
      expect(direita[2]).toBeLessThan(back);
      expect(fechamentoDaPegada(type, t)).toEqual([0, 0]);
    }
    expect(vampiroAt(type, PAR.surge).corpo.p[1]).toBeGreaterThan(vampiroAt(type, 0).corpo.p[1]);
    expect(vampiroAt(type, PAR.duration).corpo.visivel).toBe(false);
    expect(vampiroAt('falha-bestial', 3200, origins).corpo.p[2]).toBeLessThan(-TRAY.halfDepth - TRAY.wallThickness);
  });
});
