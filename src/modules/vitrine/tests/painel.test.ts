// <PainelDoResultado/> keeps the DOM of the legacy panel (OS-0041): data-testid, aria-live and the text are contract of
// the E2E. `fixtures/painel-antes.json` is the `<output>` that `src/ui/Controls.tsx` rendered before the move, captured
// with renderToStaticMarkup for the cases below (the omen case: a natural 20 whose crit was still playing).
import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import type { DieKind } from '../../regras/index.ts';

// The panel reads the throw and the omen through their scene doors; here they answer from a fake state (the stores of
// `arremesso` and `pressagios` are private to them, rule 1).
const h = vi.hoisted(() => ({ dice: [] as DieKind[], results: null as number[] | null, tocando: false, throwId: 1, omen: null as null | { throwId: number; crits: number[]; fumbles: number[] } }));
vi.mock('../../arremesso/cena.ts', () => ({ useArremesso: <T,>(sel: (s: typeof h) => T) => sel(h) }));
vi.mock('../../pressagios/cena.ts', () => ({ usePresagioTocando: () => h.tocando, usePresagio: <T,>(sel: (s: typeof h) => T) => sel(h) }));

import { PainelDoResultado } from '../cena.ts';

type Caso = 'semResultado' | 'umD20' | 'variosDados' | 'soMoedas' | 'presagioTocando';
const antes: Record<Caso, string> = JSON.parse(readFileSync(new URL('./fixtures/painel-antes.json', import.meta.url), 'utf-8'));

const em = (dice: DieKind[], results: number[] | null, tocando = false) => Object.assign(h, { dice, results, tocando, omen: null });

describe('<PainelDoResultado/>: o mesmo DOM do painel legado', () => {
  const casos: [Caso, () => void][] = [
    ['semResultado', () => em([], null)],
    ['umD20', () => em(['d20'], [17])],
    ['variosDados', () => em(['d6', 'd6', 'd20', 'd100'], [3, 5, 12, 40])],
    ['soMoedas', () => em(['coin', 'coin', 'coin'], [1, 1, 2])],
    ['presagioTocando', () => em(['d20'], [20], true)],
  ];
  it.each(casos)('%s', (caso, montar) => {
    montar();
    expect(renderToStaticMarkup(createElement(PainelDoResultado))).toBe(antes[caso]);
  });

  it('presságio tocando deixa o painel vazio', () => {
    expect(antes.presagioTocando).toBe(antes.semResultado);
  });

  it('data-presagio só com o presságio do mesmo arremesso', () => {
    const html = () => renderToStaticMarkup(createElement(PainelDoResultado));
    em(['d20'], [20]);
    h.omen = { throwId: 1, crits: [0], fumbles: [] };
    expect(html()).toContain('data-presagio="crit"');
    h.omen = { throwId: 0, crits: [0], fumbles: [] };
    expect(html()).not.toContain('data-presagio');
    em([], null);
    h.omen = { throwId: 1, crits: [0], fumbles: [] };
    expect(html()).not.toContain('data-presagio');
  });
});
