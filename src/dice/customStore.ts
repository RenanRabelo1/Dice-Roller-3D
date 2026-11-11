import type { CustomDie } from './custom';

// Where imported dice live between visits: the browser's IndexedDB, no server. Every call can fail (private
// window, blocked site data, full disk); callers treat that as "this session only".
const DB = 'dice-roller', STORE = 'customDice';

let opened: Promise<IDBDatabase> | undefined;
function open(): Promise<IDBDatabase> {
  opened ??= new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('sem IndexedDB'));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('sem IndexedDB'));
    req.onblocked = () => reject(new Error('IndexedDB bloqueado'));
  });
  opened.catch(() => { opened = undefined; });
  return opened;
}

async function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = work(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error ?? req.error);
    tx.onabort = () => reject(tx.error ?? new Error('gravação cancelada'));
  });
}

export const listCustomDice = async (): Promise<CustomDie[]> => (await run('readonly', (s) => s.getAll() as IDBRequest<CustomDie[]>)).filter((d) => d.version === 1).sort((a, b) => a.createdAt - b.createdAt);
export const saveCustomDie = async (die: CustomDie): Promise<void> => { await run('readwrite', (s) => s.put(die)); };
export const deleteCustomDie = async (id: string): Promise<void> => { await run('readwrite', (s) => s.delete(id)); };
