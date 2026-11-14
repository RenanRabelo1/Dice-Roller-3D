import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { arremesso, assinarArremesso, resultadoPublicado } from '../index.ts';
import type { ResultadoPublicado } from '../contracts.ts';
import { store } from '../store.ts';
import { definir, selecao } from '../../selecao/index.ts';
import type { Vec3 } from '../../../shared/math.ts';

const s = () => arremesso();
const P = { kind: 'pointer', id: 1 } as const;
// The hand lives in selecao; reset it first so the copy in the throw starts equal (OS-0024, decision 8).
beforeEach(() => { definir(['d20']); store.setState(store.getInitialState(), true); });

describe('estado do arremesso', () => {
  it('a selection change resets phase, results and launch and bumps throwId', () => {
    s().input({ type: 'press', source: P, at: 0, repeat: false });
    definir(['d6']);
    expect(s().gesture.phase).toBe('hand'); expect(s().throwId).toBe(1);
    expect(s().launch).toBeNull(); expect(s().results).toBeNull();
  });
  it('a release throws with one snapshot of seed, target, force and hand motion', () => {
    s().setAim([2, 0, -2]);
    s().input({ type: 'press', source: P, at: 0, repeat: false });
    const eff = s().input({ type: 'release', source: P, at: 700 }, { center: [0, 3, 3], omega: [1, 0, 0] });
    expect(eff).toEqual({ type: 'throw', force: 1 });
    expect(s().launch).toMatchObject({ throwId: 1, target: [2, 0, -2], force: 1, handCenter: [0, 3, 3], handOmega: [1, 0, 0] });
    expect(typeof s().launch!.seed).toBe('number'); expect(s().gesture.phase).toBe('rolling');
  });
  it('the chosen roll mode decides the force: static holds at the top, relative swings back', () => {
    expect(s().chargeMode).toBe('relative');
    s().input({ type: 'press', source: P, at: 0, repeat: false });
    expect(s().input({ type: 'release', source: P, at: 1400 })).toEqual({ type: 'throw', force: 0 });
    store.setState(store.getInitialState(), true);
    s().setChargeMode('static');
    s().input({ type: 'press', source: P, at: 0, repeat: false });
    expect(s().input({ type: 'release', source: P, at: 5000 })).toEqual({ type: 'throw', force: 1 });
    expect(s().launch!.force).toBe(1);
  });
  it('one definir changes the hand and resets the throw in a single update (selecaoAlterada, same tick)', () => {
    s().input({ type: 'press', source: P, at: 0, repeat: false });
    s().input({ type: 'release', source: P, at: 700 });
    s().publish(1, [5]);
    const states: ReturnType<typeof s>[] = [];
    const off = assinarArremesso((st) => states.push(st));
    definir(['d6', 'd8']);
    off();
    expect(states).toHaveLength(1);
    expect(states[0]).toMatchObject({ dice: ['d6', 'd8'], throwId: 2, gesture: { phase: 'hand' }, launch: null, results: null, force: 0 });
    expect(s().dice).toEqual(selecao());
  });
  it('reiniciar resets the throw with the same hand: phase, throwId, launch, results and force change, dice stays', () => {
    s().input({ type: 'press', source: P, at: 0, repeat: false });
    s().input({ type: 'release', source: P, at: 700 });
    s().publish(1, [5]);
    s().setForce(0.6);
    const dice = s().dice;
    s().reiniciar();
    expect(s()).toMatchObject({ throwId: 2, gesture: { phase: 'hand' }, launch: null, results: null, force: 0 });
    expect(s().dice).toBe(dice);
    expect(selecao()).toEqual(['d20']);
  });
  it('publish only lands for the current throw while rolling', () => {
    s().input({ type: 'press', source: P, at: 0, repeat: false });
    s().input({ type: 'release', source: P, at: 700 }, { center: [0, 3, 3], omega: [0, 0, 0] });
    s().publish(0, [5]); expect(s().results).toBeNull();
    s().publish(1, [5]); expect(s().results).toEqual([5]); expect(s().gesture.phase).toBe('settled');
    s().publish(1, [6]); expect(s().results).toEqual([5]);
  });
  it('copies the release inputs and keeps the launch stable as aim and force change', () => {
    const target: Vec3 = [2, 0, -2];
    const center: Vec3 = [0, 3, 3], omega: Vec3 = [1, 0, 0];
    s().setAim(target);
    s().setForce(0.2);
    s().input({ type: 'press', source: P, at: 0, repeat: false });
    s().input({ type: 'release', source: P, at: 700 }, { center, omega });
    const launch = s().launch!;
    target[0] = 99; center[1] = 99; omega[0] = 99;
    s().aim[0] = 88;
    s().setAim([3, 0, -1]); s().setForce(0.5);
    expect(s().launch).toBe(launch);
    expect(launch).toMatchObject({ target: [2, 0, -2], force: 1, handCenter: [0, 3, 3], handOmega: [1, 0, 0] });
    expect(Number.isInteger(launch.seed)).toBe(true);
    expect(launch.seed).toBeGreaterThanOrEqual(0);
    expect(launch.seed).toBeLessThanOrEqual(0xffffffff);
  });
  it('selection invalidates active throws and stale publications and clears force', () => {
    s().input({ type: 'press', source: P, at: 0, repeat: false });
    s().input({ type: 'release', source: P, at: 700 });
    s().setForce(0.8);
    definir(['d20', 'd20']);
    s().publish(1, [5]);
    expect(s()).toMatchObject({ throwId: 2, dice: ['d20', 'd20'], force: 0, gesture: { phase: 'hand' }, launch: null, results: null });
    s().input({ type: 'press', source: P, at: 0, repeat: false });
    s().input({ type: 'release', source: P, at: 700 });
    s().publish(1, [5]);
    expect(s().results).toBeNull();
    s().publish(3, [6]);
    definir(['d6']);
    expect(s()).toMatchObject({ throwId: 4, force: 0, results: null, gesture: { phase: 'hand' } });
  });
  it('retains copied results through return and clears them on the next throw', () => {
    s().input({ type: 'press', source: P, at: 0, repeat: false });
    s().input({ type: 'release', source: P, at: 700 });
    const results = [5];
    s().publish(1, results); results[0] = 9;
    expect(s().input({ type: 'press', source: P, at: 0, repeat: false })).toEqual({ type: 'return' });
    expect(s().results).toEqual([5]);
    s().input({ type: 'returned' });
    s().input({ type: 'press', source: P, at: 0, repeat: false });
    s().input({ type: 'release', source: P, at: 350 });
    expect(s()).toMatchObject({ throwId: 2, results: null, force: 0.5 });
    expect(s().launch).toMatchObject({ handCenter: [0, 3, 3], handOmega: [0, 0, 0] });
  });
});

describe('resultadoPublicado', () => {
  const roll = () => { s().input({ type: 'press', source: P, at: 0, repeat: false }); s().input({ type: 'release', source: P, at: 700 }); };
  let seen: ResultadoPublicado[] = [];
  let off = () => {};
  beforeEach(() => { seen = []; off = resultadoPublicado.subscribe((e) => seen.push(e)); });
  afterEach(() => off());

  it('is exposed only to subscribe (the module publishes)', () => {
    expect(Object.keys(resultadoPublicado)).toEqual(['subscribe']);
  });
  it('is emitted once per publication, after the result is in the state, with throwId, dice, results, raw and force', () => {
    const during: unknown[] = [];
    const offDuring = resultadoPublicado.subscribe(() => during.push({ phase: s().gesture.phase, results: s().results }));
    roll();
    s().publish(1, [17], [17]);
    offDuring();
    expect(seen).toEqual([{ throwId: 1, dice: ['d20'], results: [17], raw: [17], force: 1 }]);
    expect(during).toEqual([{ phase: 'settled', results: [17] }]);
    expect(seen[0].results).toBe(s().results);
  });
  it('carries raw as null when the publication has none', () => {
    roll();
    s().publish(1, [5]);
    expect(seen).toEqual([{ throwId: 1, dice: ['d20'], results: [5], raw: null, force: 1 }]);
  });
  it('is not emitted when the throwId or the phase do not match', () => {
    s().publish(0, [5]); // phase hand
    roll();
    s().publish(0, [5]); s().publish(2, [5]); // another throwId
    expect(seen).toEqual([]);
    s().publish(1, [5]);
    s().publish(1, [6]); // already settled
    expect(seen).toHaveLength(1);
    expect(seen[0].results).toEqual([5]);
  });
});
