// Data-owner rules (rule 2 of the guide, ADR 0006 part B) on the real code, reading the owners from the
// donos-dos-dados block of the module map, and the proof that each rule fires on `fixtures/dados/`.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { conferirDados, formatarDado, lerAcessos, lerAcessosDe, lerDonos } from './donos.ts';
import { CICLOS_CONHECIDOS, DADOS_LEGADO, MAPA_DE_DONOS, RAIZES_DADOS } from './config.ts';

let real: ReturnType<typeof conferirDados> | undefined;
const conferirReal = () => real ??= conferirDados(lerAcessos(RAIZES_DADOS), lerDonos(readFileSync(MAPA_DE_DONOS, 'utf8'), MAPA_DE_DONOS), DADOS_LEGADO);

describe('arquitetura: dono dos dados (regra 2)', () => {
  it('as duas listas de exceção estão vazias (fase 7: exceções zeradas)', () => {
    // The mechanism stays for a future exception with an ADR; today none is needed.
    expect(DADOS_LEGADO).toEqual([]);
    expect(CICLOS_CONHECIDOS).toEqual([]);
  });
  it('nenhum acesso a dado fora do dono, fora de DADOS_LEGADO', () => {
    const { violacoes } = conferirReal();
    expect(violacoes, violacoes.join('\n')).toEqual([]);
  });
  it('toda exceção de DADOS_LEGADO ainda é usada', () => {
    const { semUso } = conferirReal();
    expect(semUso, semUso.join('\n')).toEqual([]);
  });
});

describe('as regras de dados disparam (fixtures/dados)', () => {
  const base = 'tests/arquitetura/fixtures/dados', mapa = `${base}/mapa.md`;
  const donos = lerDonos(readFileSync(mapa, 'utf8'), mapa);
  const acessos = lerAcessos(['src', 'server/src'], base);
  const campos = () => conferirDados(acessos, donos, []).brutas
    .map((v) => [v.regra, v.arquivo, v.dado, v.dono]).sort((a, b) => `${a[1]} ${a[0]}`.localeCompare(`${b[1]} ${b[0]}`));
  const naoDeclarado = 'nenhum; declare no bloco donos-dos-dados de docs/mapa-modulos.md';

  it('fonte única: bloco ausente, JSON inválido ou formato errado', () => {
    expect(() => lerDonos('# mapa sem bloco', 'x.md')).toThrow('[fonte única] x.md não tem o bloco ```json donos-dos-dados');
    expect(() => lerDonos('```json donos-dos-dados\n{ "indexedDB": \n```\n', 'x.md')).toThrow('não é JSON válido');
    expect(() => lerDonos('```json donos-dos-dados\n{ "indexedDB": {} }\n```\n', 'x.md')).toThrow('precisa de "indexedDB", "localStorage", "mongodb"');
    expect(donos.mongodb).toEqual({ rolls: 'historico', jogadores: 'perfil' });
  });

  it('cada regra dispara uma vez, com regra, arquivo, dado e dono esperado', () => {
    const zustand = 'create/createStore do zustand fora de src/modules/<m>/store.ts e de src/shared/plataforma/falha.ts';
    const duas = 'store do IndexedDB definida 2 vezes (src/modules/mesa/storeDeOutro.ts, src/modules/meus-dados/repository.ts)';
    expect(campos()).toEqual([
      ['$lookup para coleção de outro dono (join entre domínios)', 'server/src/modules/historico/repository.ts', 'jogadores', 'perfil (server/src/modules/perfil/)'],
      ['indexedDB fora de src/shared/db.ts', 'src/modules/mesa/abreBanco.ts', 'indexedDB', 'src/shared/db.ts (infra)'],
      ['chave não declarada no mapa', 'src/modules/mesa/chaveNova.ts', 'mesa.tema', naoDeclarado],
      ['chave não declarada no mapa', 'src/modules/mesa/chaveSemLiteral.ts', 'localStorage/sessionStorage', `${naoDeclarado} (nenhum literal de chave do bloco no arquivo)`],
      [zustand, 'src/modules/mesa/createStoreDaRaiz.ts', 'zustand', 'o próprio módulo (src/modules/mesa/store.ts)'],
      [zustand, 'src/modules/mesa/estado.ts', 'zustand', 'o próprio módulo (src/modules/mesa/store.ts)'],
      [duas, 'src/modules/mesa/storeDeOutro.ts', 'customDice', 'meus-dados (uma vez, em src/modules/meus-dados/)'],
      ['store do IndexedDB fora do módulo dono', 'src/modules/mesa/storeDeOutro.ts', 'customDice', 'meus-dados (src/modules/meus-dados/)'],
      [zustand, 'src/modules/mesa/vanilla.ts', 'zustand', 'o próprio módulo (src/modules/mesa/store.ts)'],
      [zustand, 'src/modules/mesa/vanillaEspaco.ts', 'zustand', 'o próprio módulo (src/modules/mesa/store.ts)'],
      [duas, 'src/modules/meus-dados/repository.ts', 'customDice', 'meus-dados (uma vez, em src/modules/meus-dados/)'],
      [zustand, 'src/shared/plataforma/outra.ts', 'zustand', 'o próprio módulo (src/modules/<m>/store.ts)'],
    ]);
    // Allowed by rule 5 itself, so absent: mesa/store.ts (create), meus-dados/store.ts (createStore of zustand/vanilla)
    // and src/shared/plataforma/falha.ts (ADR 0008).
    expect(acessos.filter((a) => a.zustand).map((a) => a.arquivo)).toEqual(expect.arrayContaining([
      'src/modules/mesa/store.ts', 'src/modules/meus-dados/store.ts', 'src/shared/plataforma/falha.ts',
    ]));
    const msg = formatarDado(conferirDados(acessos, donos, []).brutas.find((v) => v.dado === 'jogadores')!);
    expect(msg).toBe('[$lookup para coleção de outro dono (join entre domínios)] server/src/modules/historico/repository.ts: jogadores (dono esperado: perfil (server/src/modules/perfil/); regra 2 do guia; ADR 0003 ponto 5; ADR 0006 parte B)');
  });

  it('a pasta tests/ fica de fora', () => {
    expect(acessos.map((a) => a.arquivo)).not.toContain('src/modules/mesa/tests/ignorado.ts');
  });

  it('exceção usada esconde o acesso; exceção sem uso e repetida falham', () => {
    const usada = { arquivo: 'src/modules/mesa/estado.ts', dado: 'zustand', motivo: 'teste' };
    const { violacoes, semUso } = conferirDados(acessos, donos, [usada, usada, { arquivo: 'src/legado.ts', dado: 'tables', motivo: 'teste' }]);
    expect(violacoes.some((v) => v.includes('estado.ts'))).toBe(false);
    expect(semUso).toEqual([
      expect.stringContaining('[exceção sem uso em DADOS_LEGADO] src/legado.ts: tables'),
      expect.stringContaining('[exceção repetida em DADOS_LEGADO] src/modules/mesa/estado.ts: zustand'),
    ]);
    expect(semUso[0]).toContain('tire a entrada de DADOS_LEGADO em tests/arquitetura/config.ts');
  });

  it('coleção não declarada, nome não literal, store do mapa sem defineStore e as formas de coleção do servidor', () => {
    const a = lerAcessosDe('server/src/x.ts', `
      await db.listCollections({ name: 'rolls' }).hasNext(); await db.createCollection('rolls');
      await db.command({ collMod: 'rolls' }); db.collection(nome); db.collection('outra');`, false);
    expect(a.colecoes).toEqual(['rolls', 'rolls', 'rolls', null, 'outra']);
    const r = conferirDados([a], donos, []).brutas.map((v) => `${v.regra}: ${v.dado}`);
    expect(r).toEqual(expect.arrayContaining([
      'coleção acessada fora do repository.ts do dono: rolls', 'coleção sem nome literal: <nome não literal>',
      'coleção não declarada no mapa: outra', 'store do mapa sem defineStore: customDice', 'store do mapa sem defineStore: tables',
    ]));
  });
});
