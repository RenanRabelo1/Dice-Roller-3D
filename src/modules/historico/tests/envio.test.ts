import { afterEach, describe, expect, it, vi } from 'vitest';
import { registrarArremesso } from '../index.ts';
import { playerId } from '../repository.ts';

afterEach(() => vi.unstubAllGlobals());

const API = 'http://127.0.0.1:3001/';
const sent = (fetch: ReturnType<typeof vi.fn>) => JSON.parse(fetch.mock.calls[0][1].body);

describe('saving throws to the history API', () => {
  it('sends each die with its result, and the throw force', () => {
    const fetch = vi.fn().mockResolvedValue(undefined); vi.stubGlobal('fetch', fetch);
    registrarArremesso({ dice: [{ kind: 'd20', value: 20 }, { kind: 'coin', value: 2 }], force: 0.73 }, API);
    expect(sent(fetch)).toEqual({ playerId: playerId(), dice: [{ kind: 'd20', value: 20 }, { kind: 'coin', value: 2 }], force: 0.73 });
  });
  it('the force goes out held between 0 and 1', () => {
    const fetch = vi.fn().mockResolvedValue(undefined); vi.stubGlobal('fetch', fetch);
    registrarArremesso({ dice: [{ kind: 'd6', value: 4 }], force: 1.7 }, API);
    registrarArremesso({ dice: [{ kind: 'd6', value: 4 }], force: -0.2 }, API);
    expect(fetch.mock.calls.map(([, init]) => JSON.parse(init.body).force)).toEqual([1, 0]);
  });
  it('without an API address nothing is sent (the table works offline)', () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    registrarArremesso({ dice: [{ kind: 'd6', value: 4 }], force: 0.5 }, undefined);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('with one, posts the throw as JSON, fire and forget', async () => {
    const fetch = vi.fn().mockRejectedValue(new Error('offline')); vi.stubGlobal('fetch', fetch);
    registrarArremesso({ dice: [{ kind: 'd6', value: 4 }], force: 0.5 }, API);
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('http://127.0.0.1:3001/rolls');
    expect(init).toMatchObject({ method: 'POST', keepalive: true, headers: { 'content-type': 'application/json' } });
    expect(JSON.parse(init.body)).toEqual({ playerId: playerId(), dice: [{ kind: 'd6', value: 4 }], force: 0.5 });
    await Promise.resolve(); // a network error is swallowed, never thrown into the game loop
  });
});
