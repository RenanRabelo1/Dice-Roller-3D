// Typed, synchronous, in-memory signal (ADR 0005). The publisher owns the instance and
// exposes only `subscribe`. No imports and erasable syntax only, so the server can import it.
export interface Signal<T> { emit(payload: T): void; subscribe(listener: (payload: T) => void): () => void }

export function createSignal<T>(): Signal<T> {
  // One entry per subscription, so the same listener subscribed twice is cancelled one at a time.
  const entries = new Set<{ listener: (payload: T) => void }>()
  return {
    emit(payload) {
      // Iterate a copy: (un)subscribing during delivery only affects the next emit.
      for (const { listener } of [...entries]) {
        try { listener(payload) } catch (error) { console.error('Signal listener threw:', error) }
      }
    },
    subscribe(listener) {
      const entry = { listener }
      entries.add(entry)
      return () => { entries.delete(entry) }
    },
  }
}
