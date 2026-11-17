// The DOM of the components is contract of the E2E and the CSS: text, aria-label, roles and classes.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BotaoDeDado, BotoesDeDados, Chat, ResumoDaMao, RodaDeDados } from '../cena.ts';
import { definir } from '../index.ts';
import { store } from '../store.ts';
import { customKind, polyhedron, registerCustom, unregisterCustom, type CustomDie } from '../../dados/index.ts';
import { KINDS } from '../../regras/index.ts';

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);

// renderToStaticMarkup reads zustand's server snapshot (the initial state); point it at the live hand.
store.getInitialState = () => store.getState();

const caveira: CustomDie = {
  version: 1, id: 'cap', createdAt: 0, name: 'Caveira', slug: 'caveira', base: 'd6', omens: false,
  file: { format: 'stl', name: 'cap.stl', bytes: new ArrayBuffer(0) }, fit: { center: [0, 0, 0], scale: 1 },
  poly: polyhedron('d6'), printed: false, color: null,
};
beforeAll(() => registerCustom(caveira));
afterAll(() => { unregisterCustom(customKind('cap')); definir(['d20']); });

describe('componentes: o DOM da roda e do chat', () => {
  it('<RodaDeDados/>: id, aria-* e o .pool com a mão, aberta por padrão', () => {
    definir(['d6', 'd6']);
    const roda = html(createElement(RodaDeDados));
    expect(roda).toContain('<div class="roda" data-open="true">');
    expect(roda).toContain('<div id="roda-de-dados" class="roda-anel">');
    expect(roda).toContain('<button class="roda-botao" aria-label="Escolher dados" aria-expanded="true" aria-controls="roda-de-dados" aria-keyshortcuts="D">'
      + '<span class="pool" aria-live="polite">2d6</span> <kbd>D</kbd></button>');
    expect(html(createElement(ResumoDaMao))).toBe('<span class="pool" aria-live="polite">2d6</span>');
  });

  it('<BotoesDeDados/>: o grupo "Dados" com --n e um div.pick com --i por tipo', () => {
    definir(['d20']);
    const grupo = html(createElement(BotoesDeDados));
    expect(grupo.startsWith(`<div class="selection" role="group" aria-label="Dados" style="--n:${KINDS.length}">`)).toBe(true);
    KINDS.forEach((_, i) => expect(grupo).toContain(`<div class="pick" style="--i:${i}">`));
    expect(grupo.match(/class="pick"/g)).toHaveLength(KINDS.length);
  });

  it('com 10 dados na mão, todos os "Adicionar" ficam desabilitados', () => {
    definir(Array(10).fill('d8'));
    const botoes = html(createElement(BotoesDeDados)).match(/<button aria-label="Adicionar[^>]*>/g)!;
    expect(botoes).toHaveLength(KINDS.length);
    botoes.forEach((b) => expect(b).toContain('disabled'));
  });

  it('<BotaoDeDado kind/> é o par Adicionar/Remover, sem o div.pick, que "Meus dados" monta', () => {
    definir(['d20', customKind('cap')]);
    const par = html(createElement(BotaoDeDado, { kind: customKind('cap') }));
    expect(par).toBe('<button aria-label="Adicionar d6 Caveira" aria-pressed="true">1d6 Caveira</button>'
      + '<button class="remove" aria-label="Remover d6 Caveira">−</button>');
    definir(['d20']);
    expect(html(createElement(Fragment, null, createElement(BotaoDeDado, { kind: 'd6' }))))
      .toBe('<button aria-label="Adicionar d6" aria-pressed="false">d6</button>');
  });

  it('<Chat/>: só o aside, sem botão da casca, com data-open e inert seguindo `aberto`', () => {
    const noop = () => {};
    const fechado = html(createElement(Chat, { aberto: false, onAlternar: noop, onFechar: noop }));
    const aberto = html(createElement(Chat, { aberto: true, onAlternar: noop, onFechar: noop }));
    expect(fechado.startsWith('<aside id="dice-chat" class="chat" data-open="false" inert="" aria-label="Chat de dados">')).toBe(true);
    expect(aberto.startsWith('<aside id="dice-chat" class="chat" data-open="true" aria-label="Chat de dados">')).toBe(true);
    expect(aberto).not.toContain('chat-toggle');
    expect(aberto).toContain('<button aria-label="Fechar chat">×</button>');
  });
});
