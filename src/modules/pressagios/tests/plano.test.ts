import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { omenKind, type DieKind, type Omen } from '../../regras/index.ts';
import { customKind, polyhedron, registerCustom, unregisterCustom } from '../../dados/index.ts';
import { OMEN_MS, planoDoPresagio } from '../index.ts';

// An imported d20 the player asked to count as one (and one that does not), registered for these tests only.
const IMPORTADO = customKind('plano-d20'), SEM_PRESAGIO = customKind('plano-d20-sem');
beforeAll(() => {
  for (const [id, omens] of [['plano-d20', true], ['plano-d20-sem', false]] as const) {
    registerCustom({
      version: 1, id, createdAt: 0, name: id, slug: id, base: 'd20', omens,
      file: { format: 'stl', name: `${id}.stl`, bytes: new ArrayBuffer(0) }, fit: { center: [0, 0, 0], scale: 1 },
      poly: polyhedron('d20'), printed: false, color: null,
    });
  }
});
afterAll(() => { unregisterCustom(IMPORTADO); unregisterCustom(SEM_PRESAGIO); });

describe('planoDoPresagio: which effect plays on which die', () => {
  it('no omen, no effect', () => {
    expect(planoDoPresagio(null, ['d20', 'd100'])).toEqual({ kind: null, raios: [], kraken: [], tempestade: [], fogo: [], ms: 0 });
  });

  it('a crit: lightning on each d20 (imported ones counted as d20 too), the kraken on a d100', () => {
    expect(planoDoPresagio({ crits: [0, 2], fumbles: [] }, ['d20', 'd6', IMPORTADO])).toEqual(
      { kind: 'crit', raios: [0, 2], kraken: [], tempestade: [], fogo: [], ms: OMEN_MS.lightning });
    expect(planoDoPresagio({ crits: [0], fumbles: [] }, [SEM_PRESAGIO]).raios).toEqual([]);
    expect(planoDoPresagio({ crits: [1], fumbles: [] }, ['d20', 'd100'])).toEqual(
      { kind: 'crit', raios: [], kraken: [1], tempestade: [], fogo: [], ms: OMEN_MS.kraken });
    expect(planoDoPresagio({ crits: [0, 1], fumbles: [] }, ['d20', 'd100'])).toEqual(
      { kind: 'crit', raios: [0], kraken: [1], tempestade: [], fogo: [], ms: OMEN_MS.kraken });
  });

  it('a fumble: fire on each d20, the storm on a d100, lasting the longer of the two', () => {
    expect(planoDoPresagio({ crits: [], fumbles: [0] }, [IMPORTADO])).toEqual(
      { kind: 'fumble', raios: [], kraken: [], tempestade: [], fogo: [0], ms: OMEN_MS.fire });
    expect(planoDoPresagio({ crits: [], fumbles: [1] }, ['d20', 'd100'])).toEqual(
      { kind: 'fumble', raios: [], kraken: [], tempestade: [1], fogo: [], ms: OMEN_MS.storm });
    expect(planoDoPresagio({ crits: [], fumbles: [0, 1] }, ['d20', 'd100'])).toEqual(
      { kind: 'fumble', raios: [], kraken: [], tempestade: [1], fogo: [0], ms: Math.max(OMEN_MS.fire, OMEN_MS.storm) });
  });

  it('a duality: only the fish, none of the per-die effects', () => {
    expect(planoDoPresagio({ crits: [0], fumbles: [1] }, ['d20', 'd100'])).toEqual(
      { kind: 'duality', raios: [], kraken: [], tempestade: [], fogo: [], ms: OMEN_MS.duality });
    expect(planoDoPresagio({ crits: [1], fumbles: [0] }, ['d20', 'd100']).kraken).toEqual([]);
  });
});

// The HTML layer's own calculation today (src/ui/OmenOverlay.tsx), copied as it is.
const daCamadaHtml = (live: Omen, dice: DieKind[]) => {
  const kind = omenKind(live);
  const has = (list: number[] | undefined, is: (die: DieKind) => boolean) => !!list?.some((i) => is(dice[i]));
  const d100 = (die: DieKind) => die === 'd100';
  return { kraken: kind === 'crit' && has(live.crits, d100), storm: kind === 'fumble' && has(live.fumbles, d100) };
};

// Every omen a hand can have: each die is a crit, a fumble or neither (the rules never make one die both).
const todosOsPresagios = (n: number): Omen[] => {
  const omens: Omen[] = [];
  for (let code = 0; code < 3 ** n; code++) {
    const crits: number[] = [], fumbles: number[] = [];
    for (let i = 0, c = code; i < n; i++, c = Math.floor(c / 3)) {
      if (c % 3 === 1) crits.push(i);
      if (c % 3 === 2) fumbles.push(i);
    }
    if (crits.length || fumbles.length) omens.push({ crits, fumbles });
  }
  return omens;
};

describe('the HTML layer can read kraken and storm from the plan (decision 2 of OS-0039)', () => {
  const maos: DieKind[][] = [
    ['d20'], ['d100'], [IMPORTADO], [SEM_PRESAGIO], ['d6'],
    ['d20', 'd100'], ['d100', 'd100'], ['d20', 'd20'], [IMPORTADO, 'd100'], ['d6', 'd100'],
    ['d20', IMPORTADO, 'd100'], ['d100', 'd20', 'd100'], [SEM_PRESAGIO, 'd20', 'd100'], ['d10', 'd100', 'd20', IMPORTADO],
  ];
  it('kraken and storm are the same for every crit, fumble and duality of these hands', () => {
    let casos = 0;
    for (const dice of maos) {
      for (const omen of todosOsPresagios(dice.length)) {
        const plano = planoDoPresagio(omen, dice), html = daCamadaHtml(omen, dice);
        expect({ kraken: plano.kraken.length > 0, storm: plano.tempestade.length > 0 }, `${JSON.stringify(omen)} ${dice.join(',')}`).toEqual(html);
        casos++;
      }
    }
    expect(casos).toBe(208);
  });
});
