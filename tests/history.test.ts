import { afterEach, describe, expect, it, vi } from 'vitest';
import { playerId, rollBody, saveRoll } from '../src/api/history';

afterEach(() => vi.unstubAllGlobals());

describe('saving throws to the history API', () => {
  it('sends each die with its result, and the throw force', () => {
    expect(rollBody('p', ['d20', 'coin'], [20, 2], 0.73)).toEqual({ playerId: 'p', dice: [{ kind: 'd20', value: 20 }, { kind: 'coin', value: 2 }], force: 0.73 });
  });
  it('without an API address nothing is sent (the table works offline)', () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    saveRoll(['d6'], [4], 0.5, undefined);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('with one, posts the throw as JSON, fire and forget', async () => {
    const fetch = vi.fn().mockRejectedValue(new Error('offline')); vi.stubGlobal('fetch', fetch);
    saveRoll(['d6'], [4], 0.5, 'http://127.0.0.1:3001/');
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('http://127.0.0.1:3001/rolls');
    expect(init).toMatchObject({ method: 'POST', keepalive: true, headers: { 'content-type': 'application/json' } });
    expect(JSON.parse(init.body)).toEqual({ playerId: playerId(), dice: [{ kind: 'd6', value: 4 }], force: 0.5 });
    await Promise.resolve(); // a network error is swallowed, never thrown into the game loop
  });
  it('the player is one stable anonymous id', () => {
    expect(playerId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(playerId()).toBe(playerId());
  });
});
