import { MathUtils } from 'three'
import { describe, expect, it } from 'vitest'
import { clamp01, cross, dot, easeOut, span, sub, unit } from '../math.ts'

describe('easeOut', () => {
  it('is the quartic ease-out', () => {
    expect(easeOut(0)).toBe(0)
    expect(easeOut(1)).toBe(1)
    expect(easeOut(0.5)).toBe(0.9375)
  })
})

describe('clamp01', () => {
  it('clamps below, inside and above [0, 1]', () => {
    expect(clamp01(-0.5)).toBe(0)
    expect(clamp01(0.25)).toBe(0.25)
    expect(clamp01(1.5)).toBe(1)
  })
})

describe('span', () => {
  it('is 0 before a, linear inside, 1 after b', () => {
    expect(span(0.1, 0.2, 0.6)).toBe(0)
    expect(span(0.4, 0.2, 0.6)).toBeCloseTo(0.5, 12)
    expect(span(0.9, 0.2, 0.6)).toBe(1)
  })

  it('matches three MathUtils.clamp on a sample, NaN included', () => {
    const ts = [-1, 0, 0.1, 0.2, 0.33, 0.5, 0.6, 0.75, 1, 2, NaN, Infinity, -Infinity]
    const ranges: [number, number][] = [[0, 1], [0.2, 0.6], [0.5, 0.5], [0.8, 0.3], [-1, 3]]
    for (const [a, b] of ranges) {
      for (const t of ts) expect(span(t, a, b)).toBe(MathUtils.clamp((t - a) / (b - a), 0, 1))
    }
  })
})

describe('Vec3', () => {
  it('sub, dot e cross', () => {
    expect(sub([3, 2, 1], [1, 1, 1])).toEqual([2, 1, 0])
    expect(dot([1, 2, 3], [4, -5, 6])).toBe(12)
    expect(cross([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1])
    expect(cross([0, 1, 0], [1, 0, 0])).toEqual([0, 0, -1])
  })
  it('unit normaliza e, no vetor zero, dá NaN como as cópias antigas', () => {
    const u = unit([3, 0, 4])
    expect(u[0]).toBeCloseTo(0.6); expect(u[2]).toBeCloseTo(0.8)
    expect(unit([0, 0, 0]).every(Number.isNaN)).toBe(true)
  })
})
