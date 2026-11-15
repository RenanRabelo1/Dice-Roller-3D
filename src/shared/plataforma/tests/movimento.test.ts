import { afterEach, describe, expect, it, vi } from 'vitest'
import { aoMudarMovimentoReduzido, definirMovimentoReduzido, movimentoReduzido, observarPreferenciaDoSistema } from '../movimento.ts'

afterEach(() => { definirMovimentoReduzido(false); vi.unstubAllGlobals() })

describe('definirMovimentoReduzido', () => {
  it('starts off', () => {
    expect(movimentoReduzido()).toBe(false)
  })

  it('changes the value and emits it', () => {
    const heard: boolean[] = []
    const cancel = aoMudarMovimentoReduzido((v) => { heard.push(v) })
    definirMovimentoReduzido(true)
    expect(movimentoReduzido()).toBe(true)
    definirMovimentoReduzido(false)
    expect(movimentoReduzido()).toBe(false)
    expect(heard).toEqual([true, false])
    cancel()
  })

  it('emits even when the value repeats', () => {
    const heard: boolean[] = []
    const cancel = aoMudarMovimentoReduzido((v) => { heard.push(v) })
    definirMovimentoReduzido(true)
    definirMovimentoReduzido(true)
    expect(heard).toEqual([true, true])
    cancel()
  })

  it('a cancelled listener hears nothing more', () => {
    const heard: boolean[] = []
    aoMudarMovimentoReduzido((v) => { heard.push(v) })()
    definirMovimentoReduzido(true)
    expect(heard).toEqual([])
  })
})

describe('observarPreferenciaDoSistema', () => {
  // A stand-in for the MediaQueryList of '(prefers-reduced-motion: reduce)'.
  const fakeMedia = (matches: boolean) => {
    const listeners = new Set<() => void>()
    const media = {
      matches,
      addEventListener: (_: 'change', l: () => void) => { listeners.add(l) },
      removeEventListener: (_: 'change', l: () => void) => { listeners.delete(l) },
      flip(to: boolean) { media.matches = to; for (const l of [...listeners]) l() },
      listeners,
    }
    return media
  }

  it('reads the initial value, follows change and stops after cancelling', () => {
    const media = fakeMedia(true)
    const query = vi.fn(() => media)
    vi.stubGlobal('matchMedia', query)
    const cancel = observarPreferenciaDoSistema()
    expect(query).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)')
    expect(movimentoReduzido()).toBe(true)
    media.flip(false)
    expect(movimentoReduzido()).toBe(false)
    media.flip(true)
    expect(movimentoReduzido()).toBe(true)
    cancel()
    expect(media.listeners.size).toBe(0)
    media.flip(false)
    expect(movimentoReduzido()).toBe(true)
  })
})
