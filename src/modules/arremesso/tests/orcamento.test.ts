import { describe, expect, it } from 'vitest';
import { orcamentoDaBusca } from '../domain/presim.ts';

describe('orcamentoDaBusca', () => {
  it('dá 6 s no worker e 3 s no local sem renderização por software', () => {
    expect(orcamentoDaBusca(false)).toEqual({ worker: 6000, local: 3000 });
  });
  it('dá 20 s no worker e 10 s no local com renderização por software', () => {
    expect(orcamentoDaBusca(true)).toEqual({ worker: 20000, local: 10000 });
  });
});
