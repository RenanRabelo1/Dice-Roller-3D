// One IndexedDB for the whole app. v1 had `customDice`; v2 adds `tables` (table themes). The upgrade only creates
// what is missing, so imported dice survive it. Every call can fail (private window, blocked site data, full disk).
const DB = 'dice-roller';
export const STORES = ['customDice', 'tables'] as const;
export type StoreName = (typeof STORES)[number];

let opened: Promise<IDBDatabase> | undefined;
export function openDb(): Promise<IDBDatabase> {
  opened ??= new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('sem IndexedDB'));
    const req = indexedDB.open(DB, 2);
    req.onupgradeneeded = () => { for (const s of STORES) if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s, { keyPath: 'id' }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('sem IndexedDB'));
    req.onblocked = () => reject(new Error('IndexedDB bloqueado'));
  });
  opened.catch(() => { opened = undefined; });
  return opened;
}

export async function run<T>(store: StoreName, mode: IDBTransactionMode, work: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = work(tx.objectStore(store));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error ?? req.error);
    tx.onabort = () => reject(tx.error ?? new Error('gravação cancelada'));
  });
}
