import { run } from '../indexedDb';
import type { TableTheme } from './tableTheme';

// Saved tables (store `tables`, see indexedDb.ts) and which one is active. Every call can fail: callers fall back to "this session only".
export const listTables = async (): Promise<TableTheme[]> => (await run('tables', 'readonly', (s) => s.getAll() as IDBRequest<TableTheme[]>)).filter((t) => t.version === 1).sort((a, b) => a.createdAt - b.createdAt);
export const saveTable = async (t: TableTheme): Promise<void> => { await run('tables', 'readwrite', (s) => s.put(t)); };
export const deleteTable = async (id: string): Promise<void> => { await run('tables', 'readwrite', (s) => s.delete(id)); };

const ACTIVE = 'mesa.ativa';
export const activeId = (): string | null => { try { return localStorage.getItem(ACTIVE); } catch { return null; } };
export const setActiveId = (id: string | null) => { try { if (id) localStorage.setItem(ACTIVE, id); else localStorage.removeItem(ACTIVE); } catch { /* blocked storage: the table is the default next visit */ } };
