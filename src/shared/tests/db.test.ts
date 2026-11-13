import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A minimal fake IndexedDB: `open` fires upgrade (when the stored version is older) and success on a later tick,
// and every transaction completes on a later tick with the request's result.
function fakeIndexedDb(existing: string[], storedVersion = 1) {
  const names = new Set(existing)
  const created: { name: string; options?: IDBObjectStoreParameters }[] = []
  const opens: { name: string; version?: number }[] = []
  const db = {
    objectStoreNames: { contains: (n: string) => names.has(n) },
    createObjectStore(name: string, options?: IDBObjectStoreParameters) { names.add(name); created.push({ name, options }) },
    transaction(store: string) {
      const tx: Record<string, unknown> = {
        objectStore: (n: string) => ({ name: n, get: () => ({ result: `${store}:value` }) }),
      }
      setTimeout(() => (tx.oncomplete as () => void)())
      return tx
    },
  }
  const factory = {
    open(name: string, version?: number) {
      opens.push({ name, version })
      const req: Record<string, unknown> = { result: db }
      setTimeout(() => {
        if ((version ?? 1) > storedVersion) (req.onupgradeneeded as () => void)()
        ;(req.onsuccess as () => void)()
      })
      return req
    },
  }
  return { factory, created, opens }
}

const load = () => import('../db.ts')
const get = (s: IDBObjectStore) => s.get('x') as IDBRequest<string>

beforeEach(() => { vi.resetModules() })
afterEach(() => { vi.unstubAllGlobals() })

describe('shared/db', () => {
  it('rejects without IndexedDB and tries to open again on the next call', async () => {
    const { defineStore } = await load()
    const store = defineStore('a')
    await expect(store.run('readonly', get)).rejects.toThrow('sem IndexedDB')
    const fake = fakeIndexedDb(['a'], 2)
    vi.stubGlobal('indexedDB', fake.factory)
    await expect(store.run('readonly', get)).resolves.toBe('a:value')
    expect(fake.opens).toEqual([{ name: 'dice-roller', version: 2 }])
  })

  it('the upgrade creates only the registered stores that are missing, keyed by id', async () => {
    const fake = fakeIndexedDb(['a'])
    vi.stubGlobal('indexedDB', fake.factory)
    const { defineStore } = await load()
    defineStore('a')
    const b = defineStore('b')
    await expect(b.run('readwrite', get)).resolves.toBe('b:value')
    expect(fake.created).toEqual([{ name: 'b', options: { keyPath: 'id' } }])
  })

  it('opens the database once for every store', async () => {
    const fake = fakeIndexedDb([], 2)
    vi.stubGlobal('indexedDB', fake.factory)
    const { defineStore } = await load()
    const a = defineStore('a'), b = defineStore('b')
    await Promise.all([a.run('readonly', get), b.run('readonly', get), a.run('readonly', get)])
    expect(fake.opens).toHaveLength(1)
  })

  it('throws when a store is defined after the database was opened', async () => {
    vi.stubGlobal('indexedDB', fakeIndexedDb(['a'], 2).factory)
    const { defineStore } = await load()
    await defineStore('a').run('readonly', get)
    expect(() => defineStore('b')).toThrow(/after the database was opened/)
  })

  it('throws when a store is defined while the database is still opening', async () => {
    vi.stubGlobal('indexedDB', fakeIndexedDb(['a'], 2).factory)
    const { defineStore } = await load()
    const pending = defineStore('a').run('readonly', get)
    expect(() => defineStore('b')).toThrow(/after the database was opened/)
    await expect(pending).resolves.toBe('a:value')
  })

  it('accepts a store defined after a failed open, and the next open creates it', async () => {
    const { defineStore } = await load()
    const a = defineStore('a')
    await expect(a.run('readonly', get)).rejects.toThrow('sem IndexedDB')
    const b = defineStore('b')
    const fake = fakeIndexedDb(['a'])
    vi.stubGlobal('indexedDB', fake.factory)
    await expect(b.run('readwrite', get)).resolves.toBe('b:value')
    expect(fake.created).toEqual([{ name: 'b', options: { keyPath: 'id' } }])
  })

  it('throws when the same store is defined twice', async () => {
    const { defineStore } = await load()
    defineStore('a')
    expect(() => defineStore('a')).toThrow(/called twice/)
  })
})
