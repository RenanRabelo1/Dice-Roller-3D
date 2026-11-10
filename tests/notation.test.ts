import { describe, it, expect } from 'vitest';
import { formatDice, parseDice } from '../src/dice/notation';

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
  ])('%s', (text, dice) => expect(parseDice(text)).toEqual({ dice }));

  it.each(['', '   ', '2d7', 'abc', '0d6', 'd', '2d', '10', '2d8v', 'd20fogo', 'bola'])('rejects "%s" with a message', (text) => {
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
});
