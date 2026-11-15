// One IndexedDB for the whole app. It knows no store name: each owner declares its store with `defineStore` at the
// top of its module. The upgrade only creates what is missing, so stored records survive it. Every call can fail
// (private window, blocked site data, full disk).
export interface Store { run<T>(mode: IDBTransactionMode, work: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> }

const DB = 'dice-roller'
// A new store requires bumping the version (uma store nova exige subir a versão).
const VERSION = 2
const stores = new Set<string>()

let opened: Promise<IDBDatabase> | undefined
function openDb(): Promise<IDBDatabase> {
  opened ??= new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('sem IndexedDB'))
    const req = indexedDB.open(DB, VERSION)
    req.onupgradeneeded = () => { for (const s of stores) if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s, { keyPath: 'id' }) }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('sem IndexedDB'))
    req.onblocked = () => reject(new Error('IndexedDB bloqueado'))
  })
  opened.catch(() => { opened = undefined })
  return opened
}

export function defineStore(name: string): Store {
  // A store defined after the open would never be created by the upgrade: a programming error, not a runtime failure.
  if (opened) throw new Error(`defineStore('${name}') after the database was opened: define stores at module top level`)
  if (stores.has(name)) throw new Error(`defineStore('${name}') called twice`)
  stores.add(name)
  return {
    async run<T>(mode: IDBTransactionMode, work: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
      const db = await openDb()
      return new Promise<T>((resolve, reject) => {
        const tx = db.transaction(name, mode)
        const req = work(tx.objectStore(name))
        tx.oncomplete = () => resolve(req.result)
        tx.onerror = () => reject(tx.error ?? req.error)
        tx.onabort = () => reject(tx.error ?? new Error('gravação cancelada'))
      })
    },
  }
}
