// Import and cycle rules (rules 1 and 4 of the guide, ADR 0006 part A, ADR 0009) on the real
// code, and the proof that each rule fires on the fixture tree in `fixtures/modulos/`.
import { describe, expect, it } from 'vitest';
import { lerGrafo } from './leitor';
import { CICLOS_CONHECIDOS, RAIZES } from './config';
import { ciclos, conferirCiclos, formatar, REGRAS } from './regras';

const grafo = lerGrafo(RAIZES);
const atuais = [...ciclos(grafo, 'arquivo'), ...ciclos(grafo, 'pasta')];

describe('arquitetura: ciclos (regra 4)', () => {
  it('nenhum ciclo fora de CICLOS_CONHECIDOS', () => {
    const { novos } = conferirCiclos(atuais, CICLOS_CONHECIDOS);
    expect(novos, novos.join('\n')).toEqual([]);
  });
  it('todo ciclo de CICLOS_CONHECIDOS ainda existe', () => {
    const { sumidos } = conferirCiclos(atuais, CICLOS_CONHECIDOS);
    expect(sumidos, sumidos.join('\n')).toEqual([]);
  });
});

describe('arquitetura: imports (regra 1 e ADRs)', () => {
  it.each(Object.entries(REGRAS))('%s', (_nome, regra) => {
    const erros = regra(grafo).map(formatar);
    expect(erros, erros.join('\n')).toEqual([]);
  });
});

describe('as regras disparam (fixtures/modulos)', () => {
  const base = 'tests/arquitetura/fixtures/modulos';
  const fixture = lerGrafo(['src', 'server'], base);
  const pares = (nome: keyof typeof REGRAS) => REGRAS[nome](fixture).map((v) => `${v.de} → ${v.para}`).sort();

  it('import interno de outro módulo e contracts.ts sem import type', () => {
    expect(pares('portaUnica')).toEqual([
      'src/modules/a/contratoComValor.ts → src/modules/b/contracts.ts',
      'src/modules/a/index.ts → src/modules/b/interno.ts',
    ]);
  });
  it('ciclo entre módulos, mesmo só por index.ts', () => {
    // The server cycle of the fixture is the next test's.
    expect(ciclos(fixture, 'pasta').map((c) => c.membros).filter((m) => m[0].startsWith('src/'))).toEqual([['src/modules/a', 'src/modules/b']]);
  });
  it('ciclo dentro do servidor, nos níveis de arquivo e de pasta', () => {
    const doServidor = (nivel: 'arquivo' | 'pasta') => ciclos(fixture, nivel).map((c) => c.membros).filter((m) => m.some((f) => f.startsWith('server/')));
    expect(doServidor('arquivo')).toEqual([['server/src/modules/z/ida.ts', 'server/src/shared/volta.ts']]);
    expect(doServidor('pasta')).toEqual([['server/src/modules/z', 'server/src/shared']]);
  });
  it('shared importando o legado', () => {
    expect(pares('sharedIsolado')).toEqual(['src/shared/usaLegado.ts → src/dice/outro.ts']);
  });
  it('módulo importando a casca', () => {
    expect(pares('semCasca')).toEqual(['src/modules/a/casca.ts → src/App.tsx']);
  });
  it('regras importando three e algo fora do próprio módulo', () => {
    expect(REGRAS.regrasPuras(fixture).map((v) => `${v.regra}: ${v.de} → ${v.para}`).sort()).toEqual([
      'regras importa algo fora do próprio módulo: src/modules/regras/fora.ts → src/dice/kinds.ts',
      'regras importa biblioteca de cena, física ou estado: src/modules/regras/index.ts → three',
    ]);
  });
  it('servidor importando de src/ fora da exceção, e src importando contrato do servidor como valor', () => {
    // src/usaServidorTipo.ts (import type of the same contracts.ts) is allowed, so it is absent.
    expect(pares('fronteiraDoServidor')).toEqual([
      'server/src/app.ts → src/dice/outro.ts',
      'src/usaServidorValor.ts → server/src/modules/x/contracts.ts',
    ]);
    expect(fixture.arestas).toContainEqual(expect.objectContaining({ de: 'src/usaServidorTipo.ts', para: 'server/src/modules/x/contracts.ts', soTipo: true }));
  });
  it('routes.ts do servidor importando outro módulo e arquivo próprio fora de service/contracts/repository', () => {
    // Its own service.ts, contracts.ts (import type), repository.ts and server/src/shared/db.ts are allowed, so they are absent.
    expect(pares('rotasDoServidor')).toEqual([
      'server/src/modules/x/routes.ts → server/src/modules/x/interno.ts',
      'server/src/modules/x/routes.ts → server/src/modules/y/service.ts',
    ]);
  });
  it('mongodb importado fora de repository.ts e de server/src/shared/db.ts', () => {
    // repository.ts, shared/db.ts and the module's tests/ import it too and are allowed, so they are absent.
    expect(pares('mongodbSoNoRepositorio')).toEqual(['server/src/modules/x/service.ts → mongodb']);
  });
  it('ciclo conhecido que sumiu e ciclo novo', () => {
    const { novos, sumidos } = conferirCiclos(
      [{ nivel: 'arquivo', membros: ['src/x.ts', 'src/y.ts'], caminho: ['src/x.ts', 'src/y.ts', 'src/x.ts'] }],
      [{ nivel: 'arquivo', membros: ['src/z.ts', 'src/w.ts'], motivo: 'teste' }],
    );
    expect(novos).toEqual([expect.stringContaining('src/x.ts → src/y.ts → src/x.ts')]);
    expect(sumidos).toEqual([expect.stringContaining('Tire a entrada de CICLOS_CONHECIDOS')]);
  });
});
