// The components keep the DOM of the legacy header (OS-0029): text, aria-label, roles and classes are contract of the E2E
// and the CSS. `fixtures/lista-antes.json` is the `<header>` that `src/ui/Controls.tsx` rendered before the move, captured
// with renderToStaticMarkup for the cases below; Controls rendered the same after the move.
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { Importacao, MeusDados } from '../cena.ts';
import { alternarImportacao, fecharImportacao } from '../index.ts';
import { assistente, store } from '../store.ts';
import { customKind, customList, polyhedron, registerCustom, unregisterCustom, type CustomDie } from '../../dados/index.ts';

const antes: Record<'vazio' | 'semGravacao' | 'comGravacao' | 'montado', string> =
  JSON.parse(readFileSync(new URL('./fixtures/lista-antes.json', import.meta.url), 'utf-8'));
// useId names (the ink radios) depend on the place in the tree: the header and a lone component differ only there.
const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el).replace(/_R_[0-9a-z]+_/g, '_R_');
const fixture = (cena: keyof typeof antes) => antes[cena].replace(/_R_[0-9a-z]+_/g, '_R_');

// renderToStaticMarkup reads zustand's server snapshot (the initial state); point it at the live stores. The hand (selecao)
// stays at its initial ['d20'], as in the capture.
for (const s of [store, assistente]) (s as { getInitialState: () => unknown }).getInitialState = () => s.getState();

const die = (id: string, name: string, slug: string, printed: boolean): CustomDie => ({
  version: 1, id, createdAt: 0, name, slug, base: 'd6', omens: false,
  file: { format: 'stl', name: `${id}.stl`, bytes: new ArrayBuffer(0) }, fit: { center: [0, 0, 0], scale: 1 },
  poly: polyhedron('d6'), printed, color: null,
});
const so = (d?: CustomDie) => {
  for (const c of customList()) unregisterCustom(customKind(c.id));
  if (d) registerCustom(d);
  store.setState({ customs: customList() });
};
beforeAll(() => assistente.setState({ importando: false, montado: false }));
afterEach(() => so());
afterAll(() => assistente.setState({ importando: false, montado: false }));

describe('componentes: o mesmo DOM do cabeçalho legado', () => {
  const casos: [keyof typeof antes, CustomDie | undefined][] = [
    ['vazio', undefined], ['semGravacao', die('cap', 'Caveira', 'caveira', false)], ['comGravacao', die('run', 'Runa', 'runa', true)],
  ];
  it.each(casos)('%s: <MeusDados/> é o grupo "Meus dados" do cabeçalho, logo antes do resumo da mão', (cena, d) => {
    so(d);
    const grupo = html(createElement(MeusDados));
    expect(grupo.startsWith('<div class="selection" role="group" aria-label="Meus dados">')).toBe(true);
    expect(fixture(cena)).toContain(grupo + '<p class="pool"');
    expect(html(createElement(Importacao))).toBe(''); // never opened: not mounted
  });

  it('montado e fechado: <Importacao/> é o assistente no fim do cabeçalho, e o botão volta a aria-expanded="false"', async () => {
    alternarImportacao();
    expect(assistente.getState()).toEqual({ importando: true, montado: true });
    expect(html(createElement(MeusDados))).toContain('<button aria-expanded="true" aria-controls="import-die">Importar dado</button>');
    fecharImportacao();
    expect(assistente.getState()).toEqual({ importando: false, montado: true });
    // The wizard is lazy: the first render suspends (fallback null) and starts the import; once loaded it renders at once.
    expect(html(createElement(Importacao))).toBe('');
    await import('../ui/AssistenteDeImportacao.tsx');
    await new Promise((r) => setTimeout(r, 50));
    const aside = html(createElement(Importacao));
    expect(aside.startsWith('<aside id="import-die"')).toBe(true);
    expect(fixture('montado').endsWith(aside + '</header>')).toBe(true);
    expect(fixture('montado')).toContain(html(createElement(MeusDados)) + '<p class="pool"');
  });
});
