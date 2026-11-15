import { afterEach, describe, expect, it } from 'vitest'
import { falha, registrarFalha } from '../falha.ts'

afterEach(() => { registrarFalha(null) })

describe('registrarFalha', () => {
  it('starts with no failure', () => {
    expect(falha()).toBeNull()
  })

  it('overwrites the recorded failure', () => {
    registrarFalha('graphics')
    registrarFalha('physics')
    expect(falha()).toBe('physics')
  })

  it('clears it with null', () => {
    registrarFalha('webgl')
    registrarFalha(null)
    expect(falha()).toBeNull()
  })

  it('falha() reflects the last record', () => {
    for (const f of ['webgl', 'graphics', 'physics', null, 'graphics'] as const) {
      registrarFalha(f)
      expect(falha()).toBe(f)
    }
  })
})
