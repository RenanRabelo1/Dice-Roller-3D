import { defineStore } from '../../shared/db.ts';
import type { CustomDie } from '../dados/index.ts';

// Declared when the module loads, before the first open of the database (armadilhas.md): never load this file with import().
const store = defineStore('customDice');

// Where imported dice live between visits (store `customDice`, opened by shared/db.ts); callers treat a failure as "this session only".
export const listCustomDice = async (): Promise<CustomDie[]> => (await store.run('readonly', (s) => s.getAll() as IDBRequest<CustomDie[]>)).filter((d) => d.version === 1).sort((a, b) => a.createdAt - b.createdAt);
export const saveCustomDie = async (die: CustomDie): Promise<void> => { await store.run('readwrite', (s) => s.put(die)); };
export const deleteCustomDie = async (id: string): Promise<void> => { await store.run('readwrite', (s) => s.delete(id)); };
