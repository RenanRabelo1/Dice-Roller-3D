import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { customDie, customKind, customList, polyhedron, unregisterCustom, type CustomDie } from '../../dados/index.ts';
import { deleteCustomDie, listCustomDice, saveCustomDie } from '../repository.ts';
import { store } from '../store.ts';
import { atualizar, carregar, excluir, meusDados, salvar } from '../index.ts';

// The IndexedDB is the repository's business: here it is replaced, so each test says how the save goes.
vi.mock('../repository.ts', () => ({ listCustomDice: vi.fn(), saveCustomDie: vi.fn(), deleteCustomDie: vi.fn() }));

const die = (id: string, patch: Partial<CustomDie> = {}): CustomDie => ({
  version: 1, id, createdAt: 0, name: id, slug: id, base: 'd6', omens: false,
  file: { format: 'stl', name: `${id}.stl`, bytes: new ArrayBuffer(0) }, fit: { center: [0, 0, 0], scale: 1 },
  poly: polyhedron('d6'), printed: true, color: null, ...patch,
});
const quota = () => new DOMException('cheio', 'QuotaExceededError');

beforeEach(() => {
  vi.mocked(listCustomDice).mockReset().mockResolvedValue([]);
  vi.mocked(saveCustomDie).mockReset().mockResolvedValue();
  vi.mocked(deleteCustomDie).mockReset().mockResolvedValue();
  store.setState({ customs: [], sessionOnly: false });
});
afterEach(() => { for (const d of customList()) unregisterCustom(customKind(d.id)); });

describe('meus-dados: ações', () => {
  it('carregar registra no catálogo e preenche customs', async () => {
    const a = die('m-a'), b = die('m-b');
    vi.mocked(listCustomDice).mockResolvedValue([a, b]);
    await carregar();
    expect(customDie(customKind('m-a'))).toBe(a);
    expect(customDie(customKind('m-b'))).toBe(b);
    expect(meusDados()).toEqual({ customs: [a, b], sessionOnly: false });
  });

  it('carregar sem banco liga sessionOnly', async () => {
    vi.mocked(listCustomDice).mockRejectedValue(new Error('sem IndexedDB'));
    await carregar();
    expect(meusDados()).toEqual({ customs: [], sessionOnly: true });
  });

  it('salvar com a quota cheia não registra e devolve a mensagem', async () => {
    vi.mocked(saveCustomDie).mockRejectedValue(quota());
    const failure = await salvar(die('m-q'));
    expect(failure).toBe('Não coube no armazenamento do navegador. Libere espaço ou use um modelo menor.');
    expect(customDie(customKind('m-q'))).toBeUndefined();
    expect(meusDados()).toEqual({ customs: [], sessionOnly: false });
  });

  it('salvar com outra falha registra e liga sessionOnly', async () => {
    vi.mocked(saveCustomDie).mockRejectedValue(new Error('sem IndexedDB'));
    const d = die('m-s');
    expect(await salvar(d)).toBeNull();
    expect(customDie(customKind('m-s'))).toBe(d);
    expect(meusDados()).toEqual({ customs: [d], sessionOnly: true });
  });

  it('salvar que grava registra e mantém sessionOnly', async () => {
    store.setState({ sessionOnly: true }); // a save that works does not turn the session warning off
    const d = die('m-ok');
    expect(await salvar(d)).toBeNull();
    expect(saveCustomDie).toHaveBeenCalledWith(d);
    expect(meusDados()).toEqual({ customs: [d], sessionOnly: true });
  });

  it('atualizar aplica antes de gravar', async () => {
    const d = die('m-u');
    await salvar(d);
    const changed = { ...d, ink: 'branca' as const };
    let seenWhileSaving: CustomDie | undefined, listWhileSaving: CustomDie[] = [];
    vi.mocked(saveCustomDie).mockImplementation(async () => {
      seenWhileSaving = customDie(customKind('m-u'));
      listWhileSaving = meusDados().customs;
    });
    expect(await atualizar(changed)).toBeNull();
    expect(seenWhileSaving).toBe(changed);
    expect(listWhileSaving).toEqual([changed]);
  });

  it('atualizar com a quota cheia vale só na sessão e devolve a mensagem', async () => {
    const d = die('m-uq');
    await salvar(d);
    vi.mocked(saveCustomDie).mockRejectedValue(quota());
    const changed = { ...d, ink: 'escura' as const };
    expect(await atualizar(changed)).toBe('Não coube no armazenamento do navegador; a mudança vale só nesta sessão.');
    expect(customDie(customKind('m-uq'))).toBe(changed);
    expect(meusDados().sessionOnly).toBe(true);
  });

  it('excluir tira do catálogo e da lista', async () => {
    const a = die('m-x'), b = die('m-y');
    await salvar(a);
    await salvar(b);
    // The record is deleted first; the kind leaves the catalogue after (OS-0027, decisão 4).
    let inCatalogueWhileDeleting: CustomDie | undefined;
    vi.mocked(deleteCustomDie).mockImplementation(async () => { inCatalogueWhileDeleting = customDie(customKind('m-x')); });
    await excluir(customKind('m-x'));
    expect(deleteCustomDie).toHaveBeenCalledWith('m-x');
    expect(inCatalogueWhileDeleting).toBe(a);
    expect(customDie(customKind('m-x'))).toBeUndefined();
    expect(meusDados().customs).toEqual([b]);
  });

  it('excluir tira do catálogo mesmo quando apagar do banco falha', async () => {
    await salvar(die('m-z'));
    vi.mocked(deleteCustomDie).mockRejectedValue(new Error('sem IndexedDB'));
    await excluir(customKind('m-z'));
    expect(customDie(customKind('m-z'))).toBeUndefined();
    expect(meusDados().customs).toEqual([]);
  });
});
