import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { PresagioVampiro } from '../../regras/index.ts';
import type { PlanoDoPresagio } from '../contracts.ts';
import { COR_VAMPIRO, corDaDualidade, fonteDaLuz, luzDaDualidade, luzDaTempestade, luzDoKraken, luzDoVampiro, POS_VAMPIRO, TROVAO } from '../domain/luz.ts';

const plano = (p: Partial<PlanoDoPresagio>): PlanoDoPresagio => ({ kind: null, raios: [], kraken: [], tempestade: [], fogo: [], vampiro: null, ms: 0, ...p });

describe('curvas da luz', () => {
  it('kraken: sobe, pulsa e cai nos últimos 500 ms', () => {
    expect(luzDoKraken(0, 6500)).toBe(0);
    expect(luzDoKraken(300, 6500)).toBeCloseTo(4);
    expect(luzDoKraken(3000, 6500)).toBeCloseTo(8 + 2 * Math.sin(3000 / 400));
    expect(luzDoKraken(6250, 6500)).toBeCloseTo(0.5 * (8 + 2 * Math.sin(6250 / 400)));
    expect(luzDoKraken(6500, 6500)).toBeCloseTo(0);
  });
  it('tempestade: dois relâmpagos e escuro no resto', () => {
    expect(luzDaTempestade(1363)).toBeCloseTo(28);
    expect(luzDaTempestade(1489)).toBeCloseTo(18);
    expect(luzDaTempestade(1423)).toBeCloseTo(14);
    expect(luzDaTempestade(1000)).toBe(0);
    expect(luzDaTempestade(1500)).toBeGreaterThan(0);
    expect(luzDaTempestade(1700)).toBe(0);
  });
  it('dualidade: 6 enquanto gira, alternando a cor a cada 500 ms', () => {
    expect(luzDaDualidade(1000, 2600)).toBe(6);
    expect(luzDaDualidade(2600, 2600)).toBe(0);
    expect(corDaDualidade(0)).toBe('#ffd36a');
    expect(corDaDualidade(500)).toBe('#9cc8ff');
    expect(corDaDualidade(1000)).toBe('#ffd36a');
  });
});

describe('prioridade da luz', () => {
  it('fogo > raio > tempestade > kraken > dualidade', () => {
    expect(fonteDaLuz(plano({ fogo: [0], raios: [1], tempestade: [2], kraken: [3] }))).toBe('fogo');
    expect(fonteDaLuz(plano({ raios: [1], kraken: [3] }))).toBe('raio');
    expect(fonteDaLuz(plano({ tempestade: [2], kraken: [3] }))).toBe('tempestade');
    expect(fonteDaLuz(plano({ kraken: [3] }))).toBe('kraken');
    expect(fonteDaLuz(plano({ kind: 'duality' }))).toBe('dualidade');
    expect(fonteDaLuz(plano({}))).toBeNull();
  });

  it('o vampiro usa a luz compartilhada com a prioridade mais baixa', () => {
    const vampiro: PresagioVampiro = { tipo: 'falha-bestial', dados: [0] };
    expect(fonteDaLuz(plano({ vampiro }))).toBe('vampiro');
    expect(fonteDaLuz(plano({ vampiro, kind: 'duality' }))).toBe('dualidade');
    expect(COR_VAMPIRO).toBe('#b3122a');
    expect(POS_VAMPIRO[1]).toBeLessThan(1);
    expect(luzDoVampiro(0, 5400)).toBe(0);
    expect(luzDoVampiro(1500, 5400)).toBeGreaterThan(0);
    expect(luzDoVampiro(5400, 5400)).toBe(0);
  });
});

describe('trovão do CSS', () => {
  it('bate com TROVAO', () => {
    const css = readFileSync(new URL('../ui/presagios.css', import.meta.url), 'utf8');
    const animacao = css.match(/\.omen-thunder\s*\{[^}]*animation:\s*thunder\s+(\d+)ms\s+[\w-]+\s+(\d+)ms/);
    expect(animacao).not.toBeNull();
    expect(Number(animacao![1])).toBe(TROVAO.duracao);
    expect(Number(animacao![2])).toBe(TROVAO.inicio);
    const quadros = css.match(/@keyframes thunder\s*\{([^\n]*)\}\s*$/m)![1];
    const picos = [...quadros.matchAll(/(\d+)%\s*\{\s*opacity:\s*([\d.]+)/g)].filter((m) => Number(m[2]) > 0.1).map((m) => Number(m[1]) / 100);
    expect(picos).toEqual(TROVAO.picos);
  });
});
