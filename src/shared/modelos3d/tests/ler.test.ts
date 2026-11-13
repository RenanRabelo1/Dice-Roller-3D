import { describe, expect, it } from 'vitest'
import { Object3D } from 'three'
import { formatOf, ModelError, readModel } from '../index.ts'

const LIMITS = { bytes: 1024 * 1024, triangles: 100, texture: 2048 }

// Binary STL for `n` small triangles side by side (normals left zero, as many exporters do).
function stl(n: number): ArrayBuffer {
  const buf = new ArrayBuffer(84 + 50 * n), view = new DataView(buf)
  view.setUint32(80, n, true)
  for (let t = 0; t < n; t++) {
    const tri = [t, 0, 0, t + 1, 0, 0, t, 1, 0]
    tri.forEach((v, k) => view.setFloat32(84 + 50 * t + 12 + k * 4, v, true))
  }
  return buf
}

const refusal = async (p: Promise<unknown>) => { try { await p } catch (e) { return e } throw new Error('not refused') }

describe('readModel', () => {
  it('reads a valid STL', async () => {
    const m = await readModel(stl(3), 'stl', LIMITS)
    expect(m.triangles).toBe(3)
    expect(m.positions).toHaveLength(27)
    expect(Array.from(m.positions.slice(9, 18))).toEqual([1, 0, 0, 2, 0, 0, 1, 1, 0])
    expect(m.object).toBeInstanceOf(Object3D)
  })

  it('takes the byte limit from the caller', async () => {
    const file = stl(3)
    const e = await refusal(readModel(file, 'stl', { ...LIMITS, bytes: file.byteLength - 1 }))
    expect(e).toBeInstanceOf(ModelError)
    expect((e as Error).message).toMatch(/^O arquivo passa de [\d.]+ MB\.$/)
    expect((await readModel(file, 'stl', { ...LIMITS, bytes: file.byteLength })).triangles).toBe(3)
    const small = await refusal(readModel(new ArrayBuffer(3 * 1024 * 1024 + 1), 'stl', { ...LIMITS, bytes: 3 * 1024 * 1024 }))
    expect(small).toBeInstanceOf(ModelError)
    expect((small as Error).message).toBe('O arquivo passa de 3 MB.')
  })

  it('takes the triangle limit from the caller', async () => {
    const e = await refusal(readModel(stl(5), 'stl', { ...LIMITS, triangles: 4 }))
    expect(e).toBeInstanceOf(ModelError)
    expect((e as Error).message).toBe('O arquivo tem 5 triângulos; o máximo é 4.')
    expect((await readModel(stl(5), 'stl', { ...LIMITS, triangles: 5 })).triangles).toBe(5)
  })

  it('refuses an empty file', async () => {
    const e = await refusal(readModel(new ArrayBuffer(0), 'stl', LIMITS))
    expect(e).toBeInstanceOf(ModelError)
    expect((e as Error).message).toBe('O arquivo está vazio.')
  })

  it('refuses a file with no triangles', async () => {
    const e = await refusal(readModel(stl(0), 'stl', LIMITS))
    expect(e).toBeInstanceOf(ModelError)
    expect((e as Error).message).toBe('O arquivo não tem nenhum triângulo.')
  })

  it('refuses an invalid file', async () => {
    const stlErr = await refusal(readModel(new Uint8Array([1, 2, 3]).buffer, 'stl', LIMITS))
    expect(stlErr).toBeInstanceOf(ModelError)
    expect((stlErr as Error).message).toBe('O arquivo não parece um STL válido.')
    const glbErr = await refusal(readModel(new ArrayBuffer(10), 'glb', LIMITS))
    expect(glbErr).toBeInstanceOf(ModelError)
    expect((glbErr as Error).message).toBe('O arquivo não parece um GLB válido.')
  })
})

describe('formatOf', () => {
  it('knows STL and GLB by extension, whatever the case', () => {
    expect(formatOf('dado.STL')).toBe('stl')
    expect(formatOf('a.b.glb')).toBe('glb')
    expect(formatOf('dado.obj')).toBeNull()
  })
})
