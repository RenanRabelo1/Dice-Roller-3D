import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { RapierRigidBody } from '@react-three/rapier';
import { arremesso, moverDado, registroDeCorpos } from '../index.ts';
import { store } from '../store.ts';
import { definir } from '../../selecao/index.ts';

const P = { kind: 'pointer', id: 1 } as const;
type Chamada = [string, ...unknown[]];

// A body that only records what it is told, in order.
function corpoFalso(chamadas: Chamada[]) {
  const grava = (nome: string) => (...args: unknown[]) => { chamadas.push([nome, ...args]); };
  return {
    isValid: () => true,
    setTranslation: grava('setTranslation'), setRotation: grava('setRotation'),
    setNextKinematicTranslation: grava('setNextKinematicTranslation'), setNextKinematicRotation: grava('setNextKinematicRotation'),
  } as unknown as RapierRigidBody;
}

const ate = (fase: 'hand' | 'charging' | 'rolling' | 'settled' | 'returning') => {
  if (fase === 'hand') return;
  arremesso().input({ type: 'press', source: P, at: 0, repeat: false });
  if (fase === 'charging') return;
  arremesso().input({ type: 'release', source: P, at: 700 });
  if (fase === 'rolling') return;
  arremesso().publish(arremesso().throwId, [5]);
  if (fase === 'settled') return;
  arremesso().input({ type: 'press', source: P, at: 2000, repeat: false }); // press in settled picks the dice up
};

const p = [1, 2, 3] as [number, number, number], q = [0, 0.6, 0, 0.8] as [number, number, number, number];
const t = { x: 1, y: 2, z: 3 }, r = { x: 0, y: 0.6, z: 0, w: 0.8 };

describe('moverDado', () => {
  let chamadas: Chamada[];
  beforeEach(() => {
    definir(['d20']); store.setState(store.getInitialState(), true);
    chamadas = [];
    registroDeCorpos.current = [corpoFalso(chamadas)];
  });
  afterEach(() => { registroDeCorpos.current = []; });

  it('in settled, pins the pose as the showcase did: translation and rotation without waking, then the next kinematic pose', () => {
    ate('settled');
    expect(arremesso().gesture.phase).toBe('settled');
    moverDado(0, { p, q });
    expect(chamadas).toEqual([
      ['setTranslation', t, false], ['setRotation', r, false],
      ['setNextKinematicTranslation', t], ['setNextKinematicRotation', r],
    ]);
  });

  it('without pinning (a die still in flight), only the next kinematic pose', () => {
    ate('settled');
    moverDado(0, { p, q }, false);
    expect(chamadas).toEqual([['setNextKinematicTranslation', t], ['setNextKinematicRotation', r]]);
  });

  it('does nothing outside settled', () => {
    for (const fase of ['hand', 'charging', 'rolling', 'returning'] as const) {
      store.setState(store.getInitialState(), true);
      ate(fase);
      expect(arremesso().gesture.phase).toBe(fase);
      moverDado(0, { p, q });
    }
    expect(chamadas).toEqual([]);
  });

  it('does nothing for an empty slot', () => {
    ate('settled');
    expect(() => moverDado(3, { p, q })).not.toThrow();
    expect(chamadas).toEqual([]);
  });
});
