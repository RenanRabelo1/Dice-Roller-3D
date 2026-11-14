import { afterEach, describe, expect, it, vi } from 'vitest';
import { playerId } from '../repository.ts';

afterEach(() => vi.unstubAllGlobals());

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const storage = (m = new Map<string, string>()) => ({ getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m });

describe('the anonymous player', () => {
  it('the player is one stable anonymous id', () => {
    expect(playerId()).toMatch(UUID);
    expect(playerId()).toBe(playerId());
  });
  it('is kept in localStorage under diceroller.player, and read back from there', () => {
    const s = storage(); vi.stubGlobal('localStorage', s);
    const id = playerId();
    expect(id).toMatch(UUID);
    expect(s.m.get('diceroller.player')).toBe(id);
    s.m.set('diceroller.player', 'guardado');
    expect(playerId()).toBe('guardado');
  });
  it('with storage blocked, one id for the whole visit', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); }, setItem: () => {} });
    expect(playerId()).toMatch(UUID);
    expect(playerId()).toBe(playerId());
  });
});
