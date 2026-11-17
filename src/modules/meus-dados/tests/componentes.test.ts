// The chapters' DOM is contract of the E2E and the CSS: text, aria-label, roles and classes (OS-0054).
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AssistenteDeImportacao, Importacao, MeusDados } from '../cena.ts';
import { store } from '../store.ts';
import { customKind, customList, polyhedron, registerCustom, unregisterCustom, type CustomDie } from '../../dados/index.ts';

// The sheet's window asks for the platform profile, which reads the browser: not in Node.
vi.mock('../../../shared/plataforma/index.ts', async (orig) => ({ ...(await orig<object>()), perfilLeve: () => false, movimentoReduzido: () => false }));

// renderToStaticMarkup reads zustand's server snapshot (the initial state); point it at the live store.
(store as { getInitialState: () => unknown }).getInitialState = () => store.getState();

const acoes = { onFechar: () => {}, onImportar: () => {} };
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
afterEach(() => so());

describe('<MeusDados/>: o capítulo "Meus dados"', () => {
  it('vazio e fechado: aside inerte, nota de vazio e o botão de forjar', () => {
    const h = renderToStaticMarkup(createElement(MeusDados, { aberto: false, ...acoes }));
    expect(h).toContain('<aside id="meus-dados" class="chat import" data-open="false" inert="" aria-label="Meus dados">');
    expect(h).toContain('<p class="import-note">Nenhum dado importado ainda.</p>');
    expect(h).toContain('<div class="selection"></div>');
    expect(h).toContain('<button class="primary">Forjar um dado novo</button>');
  });

  it('com dado e aberto: cartão com o dado e "Excluir"', () => {
    so(die('cap', 'Caveira', 'caveira', false));
    const h = renderToStaticMarkup(createElement(MeusDados, { aberto: true, ...acoes }));
    expect(h).toContain('data-open="true"');
    expect(h).not.toContain('inert');
    expect(h).not.toContain('Nenhum dado importado');
    expect(h).toContain('aria-label="Adicionar d6 Caveira"');
    expect(h).toContain('<button class="remove" aria-label="Excluir d6 Caveira">Excluir</button>');
    expect(h).not.toContain('role="group"');
  });

  it('todo dado ganha o botão Editar, marcado no escolhido, e o Forjar fica embaixo da lista', () => {
    so(die('run', 'Runa', 'runa', true));
    const h = renderToStaticMarkup(createElement(MeusDados, { aberto: true, ...acoes }));
    expect(h).toContain('<button aria-label="Editar d6 Runa" aria-pressed="true">Editar</button>');
    expect(h).not.toContain('Tinta de');
    expect(h.indexOf('Editar d6 Runa')).toBeLessThan(h.indexOf('Forjar um dado novo'));
    expect(h).toContain('<section class="ficha-do-dado" aria-label="Ficha de Runa">');
    expect(h).toContain('Tinta dos números'); // engraved: the ink field is on the sheet
  });

  it('sem dados: a página da direita convida a forjar', () => {
    expect(renderToStaticMarkup(createElement(MeusDados, { aberto: true, ...acoes }))).toContain('Forje um dado para vê-lo aqui.');
  });
});

describe('<Importacao/>: o capítulo "Importar dado"', () => {
  const props = { onFechar: () => {}, onSalvo: () => {} };
  const html = (aberto: boolean) => renderToStaticMarkup(createElement(Importacao, { aberto, ...props }));

  it('não monta antes da primeira abertura', () => {
    expect(html(false)).toBe('');
  });

  it('aberto: os quatro passos, o primeiro marcado; fechado depois, continua montado', async () => {
    expect(html(true)).toBe(''); // lazy: the first render suspends (fallback null) and starts the import
    await import('../ui/AssistenteDeImportacao.tsx');
    await new Promise((r) => setTimeout(r, 50));
    const h = html(true);
    expect(h).toContain('<aside id="import-die" class="chat import" data-open="true"');
    expect(h).toContain('<ol class="import-passos"><li aria-current="step">Arquivo</li><li>Forma</li><li>Números</li><li>Salvar</li></ol>');
    expect(h).toContain('class="sr-only"');
    expect(h).toContain('Escolher arquivo');
    // Closed after being open (Importacao keeps its `montado` state; here the wizard itself): still there, shut and inert.
    const f = renderToStaticMarkup(createElement(AssistenteDeImportacao, { open: false, onClose: () => {}, onSaved: () => {} }));
    expect(f).toContain('data-open="false"');
    expect(f).toContain('inert');
  });
});
