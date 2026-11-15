// Reader proof (ADR 0009): the four kinds of edge the rules rely on, against the real code,
// plus the two fixture cases (broken import fails, non-code URL is ignored).
import { describe, expect, it } from 'vitest';
import { lerGrafo } from './leitor.ts';
import { RAIZES } from './config.ts';

const grafo = lerGrafo(RAIZES);
const aresta = (de: string, para: string) => grafo.arestas.find((a) => a.de === de && a.para === para);

describe('leitor de imports (swc)', () => {
  it.each([
    ['import estático', 'src/app/Cena.tsx', 'src/modules/arremesso/index.ts', 'import', false],
    ['import type', 'src/modules/dados/domain/leitura.ts', 'src/shared/math.ts', 'import', true],
    ['import() dinâmico', 'src/modules/meus-dados/cena.ts', 'src/modules/meus-dados/ui/AssistenteDeImportacao.tsx', 'dinamico', false],
    ['worker com new URL(..., import.meta.url)', 'src/modules/arremesso/index.ts', 'src/modules/arremesso/domain/presim.worker.ts', 'url', false],
  ] as const)('enxerga %s: %s → %s', (_kind, de, para, tipo, soTipo) => {
    const a = aresta(de, para);
    expect(a, `o leitor não viu a aresta ${de} → ${para} (ADR 0009)`).toBeDefined();
    expect(a).toMatchObject({ tipo, soTipo });
  });

  const pasta = 'tests/arquitetura/fixtures/leitor';
  const erroDe = (caso: string) => { try { lerGrafo([`${pasta}/${caso}`]); } catch (e) { return (e as Error).message; } return ''; };

  it('falha num import relativo que não resolve', () => {
    expect(erroDe('quebrado')).toContain(`${pasta}/quebrado/a.ts → './nao-existe': não resolve`);
  });

  it('falha em import() sem string literal (variável ou template com expressão)', () => {
    const erro = erroDe('dinamico');
    expect(erro).toContain(`${pasta}/dinamico/a.ts → '<Identifier>': import() sem string literal`);
    expect(erro).toContain(`${pasta}/dinamico/a.ts → '<TemplateLiteral>': import() sem string literal`);
  });

  it('falha em caminho absoluto do Vite (/src/...)', () => {
    expect(erroDe('absoluto')).toContain(`${pasta}/absoluto/a.ts → '/src/a': caminho absoluto`);
  });

  it('falha quando a grafia do import difere da do disco (./Foo para foo.ts)', () => {
    // Windows finds the file and the case check refuses it; on Linux it does not resolve at all.
    expect(erroDe('grafia')).toMatch(new RegExp(`${pasta}/grafia/a\\.ts → '\\./Foo': (grafia diferente da do disco|não resolve)`));
  });

  it('ignora new URL para arquivo que não é .ts, e segue o que é', () => {
    const { arestas } = lerGrafo(['tests/arquitetura/fixtures/leitor/url']);
    expect(arestas.map((a) => `${a.para} ${a.tipo}`)).toEqual(['tests/arquitetura/fixtures/leitor/url/b.ts url']);
  });
});
