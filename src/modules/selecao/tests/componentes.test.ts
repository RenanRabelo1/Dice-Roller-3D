// The components keep the DOM of the legacy header (OS-0026): text, aria-label, roles and classes are contract of the E2E
// and the CSS. `fixtures/cabecalho-antes.json` is the `<header>` that `src/ui/Controls.tsx` rendered before the move,
// captured with renderToStaticMarkup for the hands below; Controls rendered the same after the move.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { BotaoDeDado, BotoesDeDados, Chat, ResumoDaMao } from '../cena.ts';
import { definir } from '../index.ts';
import { store } from '../store.ts';
import { customKind, polyhedron, registerCustom, unregisterCustom, type CustomDie } from '../../dados/index.ts';
import type { DieKind } from '../../regras/index.ts';

const antes: Record<'d20' | 'd6d6' | 'max' | 'custom', string> =
  JSON.parse(readFileSync(new URL('./fixtures/cabecalho-antes.json', import.meta.url), 'utf-8'));
const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);
const TOPO = '<header class="controls panel"><h1>Rolador de dados</h1>';

// renderToStaticMarkup reads zustand's server snapshot (the initial state); point it at the live hand.
store.getInitialState = () => store.getState();

const caveira: CustomDie = {
  version: 1, id: 'cap', createdAt: 0, name: 'Caveira', slug: 'caveira', base: 'd6', omens: false,
  file: { format: 'stl', name: 'cap.stl', bytes: new ArrayBuffer(0) }, fit: { center: [0, 0, 0], scale: 1 },
  poly: polyhedron('d6'), printed: false, color: null,
};
beforeAll(() => registerCustom(caveira));
afterAll(() => { unregisterCustom(customKind('cap')); definir(['d20']); });

describe('componentes: o mesmo DOM do cabeçalho legado', () => {
  const maos: [keyof typeof antes, DieKind[]][] = [
    ['d20', ['d20']], ['d6d6', ['d6', 'd6']], ['max', Array(10).fill('d8')], ['custom', ['d20', customKind('cap')]],
  ];
  it.each(maos)('%s: <BotoesDeDados/> abre o cabeçalho; <ResumoDaMao/> e <Chat/> vêm em seguida', (cena, mao) => {
    definir(mao);
    expect(antes[cena].startsWith(TOPO + html(createElement(BotoesDeDados)))).toBe(true);
    expect(antes[cena]).toContain(html(createElement(ResumoDaMao)) + html(createElement(Chat)));
  });

  it('<BotaoDeDado kind/> é o par Adicionar/Remover, sem o div.pick, que "Meus dados" monta', () => {
    definir(['d20', customKind('cap')]);
    const par = html(createElement(BotaoDeDado, { kind: customKind('cap') }));
    expect(par).toBe('<button aria-label="Adicionar d6 Caveira" aria-pressed="true">1d6 Caveira</button>'
      + '<button class="remove" aria-label="Remover d6 Caveira">−</button>');
    expect(antes.custom).toContain(`<div class="selection" role="group" aria-label="Meus dados"><div class="pick">${par}<button class="remove" aria-label="Excluir d6 Caveira">`);
    definir(['d20']);
    expect(html(createElement(Fragment, null, createElement(BotaoDeDado, { kind: 'd6' }))))
      .toBe('<button aria-label="Adicionar d6" aria-pressed="false">d6</button>');
  });
});
