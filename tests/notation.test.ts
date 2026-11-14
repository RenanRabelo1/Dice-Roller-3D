import { describe, it, expect } from 'vitest';
import { resultText } from '../src/dice/notation';

// The notation moved to src/modules/selecao/tests/notacao.test.ts; the result text stays until vitrine/regras take it.
describe('resultText', () => {
  it('resultText: the panel total sums the dice; coins read Cara/Coroa and never add up', () => {
    expect(resultText(['d20'], [17])).toEqual({ total: '17', detail: '' });
    expect(resultText(['d10', 'd10', 'd100'], [3, 4, 50])).toEqual({ total: '57', detail: 'd10: 3 + 4 · d100: 50' });
    expect(resultText(['d20', 'coin'], [17, 1])).toEqual({ total: '17', detail: 'd20: 17 · Moeda: Cara' });
    expect(resultText(['coin'], [2])).toEqual({ total: 'Coroa', detail: '' });
    expect(resultText(['coin', 'coin', 'coin'], [1, 2, 1])).toEqual({ total: '2 caras, 1 coroa', detail: 'Moeda: Cara, Coroa, Cara' });
    expect(resultText(['coin', 'coin'], [2, 2])).toEqual({ total: '2 coroas', detail: 'Moeda: Coroa, Coroa' });
  });
});
