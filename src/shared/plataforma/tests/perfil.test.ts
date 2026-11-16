import { describe, expect, it } from 'vitest'
import { decidirPerfil } from '../perfil.ts'

const base = { busca: '', renderer: 'NVIDIA GeForce RTX 3060' }

describe('decidirPerfil', () => {
  it('?perfil= manda sobre tudo', () => {
    expect(decidirPerfil({ ...base, busca: '?perfil=leve' })).toBe('leve')
    expect(decidirPerfil({ busca: '?perfil=completo', renderer: 'SwiftShader', memoria: 1 })).toBe('completo')
    expect(decidirPerfil({ ...base, busca: '?perfil=xyz' })).toBe('completo')
  })
  it('renderizador por software é leve', () => {
    for (const r of ['ANGLE (Google, Vulkan, SwiftShader)', 'llvmpipe (LLVM 15)', 'Microsoft Basic Render Software']) expect(decidirPerfil({ ...base, renderer: r })).toBe('leve')
  })
  it('memoria <= 2 é leve', () => { expect(decidirPerfil({ ...base, memoria: 2, nucleos: 16 })).toBe('leve') })
  it('memoria <= 4 com nucleos <= 4 é leve', () => {
    expect(decidirPerfil({ ...base, memoria: 4, nucleos: 4 })).toBe('leve')
    expect(decidirPerfil({ ...base, memoria: 4, nucleos: 8 })).toBe('completo')
  })
  it('o resto é completo', () => { expect(decidirPerfil({ ...base, memoria: 8, nucleos: 4 })).toBe('completo') })
  it('sem memoria não puxa para leve', () => { expect(decidirPerfil({ ...base, nucleos: 2 })).toBe('completo') })
})
