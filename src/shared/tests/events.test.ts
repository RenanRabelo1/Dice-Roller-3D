import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSignal } from '../events.ts'

afterEach(() => { vi.restoreAllMocks() })

describe('createSignal', () => {
  it('delivers synchronously, inside the emit call', () => {
    const signal = createSignal<number>()
    const got: number[] = []
    signal.subscribe((n) => got.push(n))
    signal.emit(7)
    expect(got).toEqual([7])
  })

  it('delivers in subscription order', () => {
    const signal = createSignal<string>()
    const order: string[] = []
    signal.subscribe((s) => order.push(`a:${s}`))
    signal.subscribe((s) => order.push(`b:${s}`))
    signal.subscribe((s) => order.push(`c:${s}`))
    signal.emit('x')
    expect(order).toEqual(['a:x', 'b:x', 'c:x'])
  })

  it('isolates a throwing listener: the others still receive and emit does not throw', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const signal = createSignal<number>()
    const boom = new Error('boom')
    const got: string[] = []
    signal.subscribe(() => got.push('before'))
    signal.subscribe(() => { throw boom })
    signal.subscribe(() => got.push('after'))
    expect(() => signal.emit(1)).not.toThrow()
    expect(got).toEqual(['before', 'after'])
    expect(error).toHaveBeenCalledTimes(1)
    expect(error.mock.calls[0]).toContain(boom)
  })

  it('unsubscribe stops delivery and calling it twice has no effect', () => {
    const signal = createSignal<number>()
    const a = vi.fn()
    const b = vi.fn()
    const offA = signal.subscribe(a)
    signal.subscribe(b)
    offA()
    offA()
    signal.emit(1)
    expect(a).not.toHaveBeenCalled()
    expect(b).toHaveBeenCalledTimes(1)
  })

  it('the same listener subscribed twice is cancelled one subscription at a time', () => {
    const signal = createSignal<number>()
    const a = vi.fn()
    const off1 = signal.subscribe(a)
    signal.subscribe(a)
    off1()
    off1()
    signal.emit(1)
    expect(a).toHaveBeenCalledTimes(1)
  })

  it('unsubscribing during delivery does not change the round in progress', () => {
    const signal = createSignal<number>()
    const b = vi.fn()
    let offB = () => {}
    signal.subscribe(() => offB())
    offB = signal.subscribe(b)
    signal.emit(1)
    expect(b).toHaveBeenCalledTimes(1)
    signal.emit(2)
    expect(b).toHaveBeenCalledTimes(1)
  })

  it('a listener that unsubscribes itself still finishes the round for the others', () => {
    const signal = createSignal<number>()
    const b = vi.fn()
    const offA = signal.subscribe(() => offA())
    signal.subscribe(b)
    signal.emit(1)
    signal.emit(2)
    expect(b).toHaveBeenCalledTimes(2)
  })

  it('subscribing during delivery takes effect only from the next emit', () => {
    const signal = createSignal<number>()
    const late = vi.fn()
    let added = false
    signal.subscribe(() => { if (!added) { added = true; signal.subscribe(late) } })
    signal.emit(1)
    expect(late).not.toHaveBeenCalled()
    signal.emit(2)
    expect(late).toHaveBeenCalledExactlyOnceWith(2)
  })
})
