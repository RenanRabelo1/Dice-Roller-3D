// The components keep the DOM of the legacy footer (OS-0034): text, aria-label, roles and classes are contract of the E2E
// and the CSS. `fixtures/rodape-antes.json` is the `<footer>` that `src/ui/Controls.tsx` rendered before the move, captured
// with renderToStaticMarkup for the cases below; Controls rendered the same after the move.
import { describe, it, expect, vi, afterAll } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';

// The failure store is private to shared/plataforma and SSR reads its initial snapshot: the case 'physics' is set here.
const h = vi.hoisted(() => ({ falha: null as null | 'physics' }));
vi.mock('../../../shared/plataforma/falha.ts', async (orig) => ({ ...(await orig<object>()), useFalha: () => h.falha }));

import { BarraDeForca, DicaDaFase, ModoDeRolagem } from '../cena.ts';
import { store } from '../store.ts';
import type { Phase } from '../contracts.ts';

const antes: Record<'hand' | 'charging' | 'settled' | 'physics', string> =
  JSON.parse(readFileSync(new URL('./fixtures/rodape-antes.json', import.meta.url), 'utf-8'));
const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);
const TOPO = '<footer class="status panel">';

// renderToStaticMarkup reads zustand's server snapshot (the initial state); point it at the live store.
store.getInitialState = () => store.getState();
const inicial = store.getState();
afterAll(() => { store.setState(inicial); h.falha = null; });

const em = (phase: Phase, force: number) => store.setState({ gesture: { ...inicial.gesture, phase }, force });

describe('componentes: o mesmo DOM do rodapé legado', () => {
  const casos: [keyof typeof antes, Phase, 'physics' | null][] = [
    ['hand', 'hand', null], ['charging', 'charging', null], ['settled', 'settled', null], ['physics', 'hand', 'physics'],
  ];
  it.each(casos)('%s: <ModoDeRolagem/> abre o rodapé e <DicaDaFase/> o fecha', (cena, phase, falha) => {
    em(phase, 0.42);
    h.falha = falha;
    expect(antes[cena].startsWith(TOPO + html(createElement(ModoDeRolagem)) + '<div class="feedback">')).toBe(true);
    expect(antes[cena].endsWith('</div>' + html(createElement(DicaDaFase)) + '</footer>')).toBe(true);
    h.falha = null;
  });

  it('charging: <BarraDeForca/> é o progress logo depois do resultado', () => {
    em('charging', 0.42);
    const barra = html(createElement(BarraDeForca));
    expect(barra).toBe('<progress aria-label="Força" max="1" value="0.42"></progress>');
    expect(antes.charging).toContain('</output>' + barra + '</div>');
    for (const cena of ['hand', 'settled', 'physics'] as const) expect(antes[cena]).not.toContain('<progress');
  });

  it('a dica muda com a fase, e a falha de física tem precedência', () => {
    const dica = (phase: Phase) => { em(phase, 0); return html(createElement(DicaDaFase)); };
    expect(dica('rolling')).toBe('<p>Os dados estão rolando…</p>');
    expect(dica('returning')).toBe('<p>Recolhendo os dados…</p>');
    h.falha = 'physics';
    expect(dica('settled')).toBe('<p>A física não respondeu; os dados voltaram para a mão. Tente jogar de novo.</p>');
    h.falha = null;
  });
});
