// <OverlayDoPresagio/> keeps the DOM of the legacy OmenOverlay (OS-0040): its classes, the `--ms`, the seeded rain, the
// `role="status"` line and the `data-omen`/`data-kraken`/`data-storm` it writes on `.game-area` are contract of the E2E and
// the CSS. `fixtures/overlay-antes.json` is what `src/ui/OmenOverlay.tsx` rendered before the move, captured with
// renderToStaticMarkup for the cases below (the effect run at once on a stand-in `.game-area`).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { DieKind } from '../../regras/index.ts';
import { input, publish, reiniciar, arremesso } from '../../arremesso/index.ts';
import { definir } from '../../selecao/index.ts';
import { definirMovimentoReduzido } from '../../../shared/plataforma/index.ts';
import { setOmenDone } from '../index.ts';
import { store } from '../store.ts';
import { OverlayDoPresagio } from '../cena.ts';

// The server render runs no effect: the overlay's only one (the attributes on `.game-area`) runs at once instead.
vi.mock('react', async (original) => {
  const r = await original<typeof import('react')>();
  return { ...r, useEffect: (efeito: () => void) => { efeito(); } };
});
// renderToStaticMarkup reads zustand's server snapshot (the initial state); read the live stores instead.
vi.mock('zustand', async (original) => {
  const z = await original<typeof import('zustand')>();
  return { ...z, useStore: (api: { getState: () => unknown }, sel: (s: unknown) => unknown) => sel(api.getState()) };
});

const antes: Record<string, { html: string; atributos: Record<string, string> }> =
  JSON.parse(readFileSync(new URL('./fixtures/overlay-antes.json', import.meta.url), 'utf-8'));

// A stand-in for `.game-area`: only the three attribute calls the overlay makes.
const areaDeJogo = () => {
  const atributos: Record<string, string> = {};
  const el = {
    setAttribute: (n: string, v: string) => { atributos[n] = String(v); },
    removeAttribute: (n: string) => { delete atributos[n]; },
    toggleAttribute: (n: string, ligado?: boolean) => { if (ligado) atributos[n] = ''; else delete atributos[n]; return !!ligado; },
    style: { setProperty: () => {}, removeProperty: () => {} },
  };
  return { atributos, ref: { current: el as unknown as HTMLDivElement } };
};

const P = { kind: 'pointer', id: 1 } as const;
const arremessar = (dice: DieKind[], results: number[]) => {
  definir(dice);
  reiniciar();
  input({ type: 'press', source: P, at: 0, repeat: false });
  input({ type: 'release', source: P, at: 700 });
  const throwId = arremesso().throwId;
  publish(throwId, results);
  return throwId;
};

beforeEach(() => { store.setState(store.getInitialState(), true); definirMovimentoReduzido(false); });

describe('OverlayDoPresagio: o mesmo DOM do OmenOverlay legado', () => {
  const casos: [string, DieKind[], number[], boolean?][] = [
    ['critico-d20', ['d20'], [20]],
    ['kraken', ['d100'], [1]],
    ['falha-d20', ['d20'], [1]],
    ['tempestade', ['d100'], [100]],
    ['dualidade', ['d20', 'd100'], [20, 100]],
    ['critico-d20-d100', ['d20', 'd100'], [20, 1]],
    ['falha-d20-d100', ['d20', 'd100'], [1, 100]],
    ['sem-presagio', ['d20'], [10]],
    ['encerrado', ['d20'], [20], true],
    ['par-de-criticos', ['vtm', 'vtm'], [10, 10]],
    ['critico-bestial', ['hunger'], [10]],
    ['falha-bestial', ['hunger'], [1]],
  ];
  for (const [nome, dice, results, encerrado] of casos)
    it(nome, () => {
      const throwId = arremessar(dice, results);
      if (encerrado) setOmenDone(throwId);
      const { atributos, ref } = areaDeJogo();
      const html = renderToStaticMarkup(createElement(OverlayDoPresagio, { gameArea: ref }));
      expect({ html, atributos }).toEqual(antes[nome]);
    });
});
