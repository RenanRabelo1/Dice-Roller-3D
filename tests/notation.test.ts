import { describe, it, expect } from 'vitest';
import { formatDice, parseDice, resultText } from '../src/dice/notation';

describe('parseDice', () => {
  it.each([
    ['2d10 + d100', ['d10', 'd10', 'd100']],
    ['2d10d100d4', ['d4', 'd10', 'd10', 'd100']],
    ['2D10 + D100+d4', ['d4', 'd10', 'd10', 'd100']],
    ['d20', ['d20']],
    ['3d6', ['d6', 'd6', 'd6']],
    ['2d102d4', ['d4', 'd4', 'd10', 'd10']], // compact + ambiguous: backtracks to 2d10 + 2d4
    ['1d4 + 1d100', ['d4', 'd100']],
    ['  d12 d8 ', ['d8', 'd12']],
    ['2d10v', ['vtm', 'vtm']],
    ['2d10vampiro', ['vtm', 'vtm']],
    ['2d10fome', ['hunger', 'hunger']],
    ['8d6fogo', Array(8).fill('fire')],
    ['2d10v1d10fome', ['vtm', 'vtm', 'hunger']], // compact
    ['2d10 Vampiro + 1d10 Fome + d10', ['d10', 'vtm', 'vtm', 'hunger']], // what formatDice writes reads back
    ['bola de fogo', Array(8).fill('fire')],
    ['Bola de Fogo + d20', ['d20', ...Array(8).fill('fire')]],
    ['moeda', ['coin']],
    ['2 moedas + d20', ['d20', 'coin', 'coin']],
    ['d20moeda', ['d20', 'coin']], // compact
    ['1d20 + 2 moedas', ['d20', 'coin', 'coin']], // what formatDice writes reads back
  ])('%s', (text, dice) => expect(parseDice(text)).toEqual({ dice }));

  it.each(['', '   ', '2d7', 'abc', '0d6', 'd', '2d', '10', '2d8v', 'd20fogo', 'bola', '0moedas', 'moed'])('rejects "%s" with a message', (text) => {
    const r = parseDice(text);
    expect('error' in r && r.error.length > 0).toBe(true);
  });

  it('caps a throw at 10 dice', () => {
    const r = parseDice('6d6 + 5d4');
    expect(r).toEqual({ error: 'São 11 dados; o máximo por arremesso é 10.' });
  });

  it('formatDice writes the selection back', () => {
    expect(formatDice(['d4', 'd10', 'd10', 'd100'])).toBe('1d4 + 2d10 + 1d100');
  });

  it('formatDice names the custom dice', () => {
    expect(formatDice(['vtm', 'vtm', 'hunger', 'fire'])).toBe('2d10 Vampiro + 1d10 Fome + 1d6 Fogo');
  });

  it('resultText: the panel total sums the dice; coins read Cara/Coroa and never add up', () => {
    expect(resultText(['d20'], [17])).toEqual({ total: '17', detail: '' });
    expect(resultText(['d10', 'd10', 'd100'], [3, 4, 50])).toEqual({ total: '57', detail: 'd10: 3 + 4 · d100: 50' });
    expect(resultText(['d20', 'coin'], [17, 1])).toEqual({ total: '17', detail: 'd20: 17 · Moeda: Cara' });
    expect(resultText(['coin'], [2])).toEqual({ total: 'Coroa', detail: '' });
    expect(resultText(['coin', 'coin', 'coin'], [1, 2, 1])).toEqual({ total: '2 caras, 1 coroa', detail: 'Moeda: Cara, Coroa, Cara' });
    expect(resultText(['coin', 'coin'], [2, 2])).toEqual({ total: '2 coroas', detail: 'Moeda: Coroa, Coroa' });
  });

  it('formatDice names coins in words', () => {
    expect(formatDice(['d20', 'coin', 'coin'])).toBe('1d20 + 2 moedas');
    expect(formatDice(['coin'])).toBe('1 moeda');
  });
});
