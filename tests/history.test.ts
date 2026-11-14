import { describe, expect, it } from 'vitest';
import { corpoDosDados } from '../src/app/historico';
import { customKind, unregisterCustom } from '../src/modules/dados/index.ts';
import { customDieOf, freeDieOf, prismTriangles } from './helpers/models';

// The shell builds each die's body from the legacy registry of imported dice (until phase 6).
describe('the body of each die sent to the history API', () => {
  it('an imported die also says its solid and whether it counts as a d20, so the server can score it', () => {
    const kind = customKind(customDieOf('d20', 'Caveira', 'caveira').id);
    try {
      expect(corpoDosDados([kind, 'd6'], [20, 3])).toEqual([{ kind, value: 20, base: 'd20', omens: true }, { kind: 'd6', value: 3 }]);
    } finally { unregisterCustom(kind); }
  });
  it('a free-form die goes out as base livre, with a negative value and no omens', () => {
    const kind = customKind(freeDieOf(prismTriangles(5, 1.4), 'Sete', 'sete-hist', [-5, 2, 3, 4, 5, 6, 7]).id);
    try {
      expect(corpoDosDados([kind], [-5])).toEqual([{ kind, value: -5, base: 'livre', omens: false }]);
    } finally { unregisterCustom(kind); }
  });
});
