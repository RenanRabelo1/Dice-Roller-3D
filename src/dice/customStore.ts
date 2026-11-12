import { run } from '../indexedDb';
import type { CustomDie } from './custom';

// Where imported dice live between visits (store `customDice`, see indexedDb.ts); callers treat a failure as "this session only".
export const listCustomDice = async (): Promise<CustomDie[]> => (await run('customDice', 'readonly', (s) => s.getAll() as IDBRequest<CustomDie[]>)).filter((d) => d.version === 1).sort((a, b) => a.createdAt - b.createdAt);
export const saveCustomDie = async (die: CustomDie): Promise<void> => { await run('customDice', 'readwrite', (s) => s.put(die)); };
export const deleteCustomDie = async (id: string): Promise<void> => { await run('customDice', 'readwrite', (s) => s.delete(id)); };
