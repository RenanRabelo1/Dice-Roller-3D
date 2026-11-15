// <PainelDaMesa/> keeps the DOM of the legacy TablePanel (OS-0037): text, aria-label, roles and classes are contract of the
// E2E and the CSS. `fixtures/painel-antes.json` is what `src/ui/TablePanel.tsx` rendered before the move, captured with
// renderToStaticMarkup for the cases below (closed and open, with the default table and with a saved one).
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PainelDaMesa } from '../cena.ts';
import { store } from '../store.ts';
import { DEFAULT_THEME, type TableTheme } from '../domain/tableTheme.ts';

// The server render has no click: the panel's `open` (its only useState(false)) is forced to true for the open cases.
let aberto = false;
vi.mock('react', async (original) => {
  const r = await original<typeof import('react')>();
  return { ...r, useState: (i: unknown) => { const s = r.useState(i); return aberto && i === false ? [true, s[1]] : s; } };
});

const antes: Record<string, string> = JSON.parse(readFileSync(new URL('./fixtures/painel-antes.json', import.meta.url), 'utf-8'));
// renderToStaticMarkup reads zustand's server snapshot (the initial state); point it at the live store.
(store as { getInitialState: () => unknown }).getInitialState = () => store.getState();
const salva: TableTheme = { ...DEFAULT_THEME, id: 'm-1', name: 'Taverna', createdAt: 1, background: { kind: 'preset', preset: 'taverna' }, felt: { color: '#112233', texture: 'couro' } };

describe('PainelDaMesa: o mesmo DOM do TablePanel legado', () => {
  const casos = [['padrao', { theme: DEFAULT_THEME, tables: [] }], ['salva', { theme: salva, tables: [salva] }]] as const;
  for (const [nome, estado] of casos)
    for (const a of [false, true])
      it(`${nome}, ${a ? 'aberto' : 'fechado'}`, () => {
        store.setState({ theme: estado.theme, tables: [...estado.tables] });
        aberto = a;
        const html = renderToStaticMarkup(createElement(PainelDaMesa));
        expect(html).toBe(antes[`${nome}-${a ? 'aberto' : 'fechado'}`]);
        // inert is rendered by the server too: closed, the sheet is out of the tab order.
        expect(html.includes('inert=""')).toBe(!a);
      });
});
