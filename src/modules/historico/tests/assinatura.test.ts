import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { iniciarHistorico } from '../index.ts';
import { playerId } from '../repository.ts';
import { arremesso, input, publish, reiniciar, resultadoPublicado } from '../../arremesso/index.ts';
import { customKind, unregisterCustom } from '../../dados/index.ts';
import { definir } from '../../selecao/index.ts';
import { customDieOf } from '../../../../tests/helpers/models.ts';

const API = 'http://127.0.0.1:3001';
const P = { kind: 'pointer', id: 1 } as const;
// A throw through the public door of arremesso: press, release, and the throw's id read back.
const roll = () => {
  input({ type: 'press', source: P, at: 0, repeat: false });
  input({ type: 'release', source: P, at: 700 });
  return arremesso().throwId;
};

let fetch: ReturnType<typeof vi.fn>;
beforeEach(() => { reiniciar(); fetch = vi.fn().mockResolvedValue(undefined); vi.stubGlobal('fetch', fetch); });
afterEach(() => vi.unstubAllGlobals());

describe('the history subscribes to the published result', () => {
  it('each published result becomes one POST with each die body and the force; after cancelling, nothing more', () => {
    const kind = customKind(customDieOf('d20', 'Caveira', 'caveira-sinal').id);
    const parar = iniciarHistorico(API);
    let emitidos = 0;
    const espiao = resultadoPublicado.subscribe(() => { emitidos += 1; });
    try {
      definir(['d6', kind]);
      publish(roll(), [3, 20]);
      expect(fetch).toHaveBeenCalledTimes(1);
      const [url, init] = fetch.mock.calls[0];
      expect(url).toBe(`${API}/rolls`);
      expect(JSON.parse(init.body)).toEqual({
        playerId: playerId(), force: arremesso().force,
        dice: [{ kind: 'd6', value: 3 }, { kind, value: 20, base: 'd20', omens: true }],
      });
      parar();
      reiniciar();
      publish(roll(), [7, 2]);
      expect(emitidos).toBe(2); // the second result was published, and the history no longer heard it
      expect(fetch).toHaveBeenCalledTimes(1);
    } finally { espiao(); parar(); unregisterCustom(kind); }
  });
});
