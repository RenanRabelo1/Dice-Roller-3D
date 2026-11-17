import { defineStore } from '../../shared/db.ts';
import { migrarTema, type TableTheme } from './domain/tableTheme.ts';

const store = defineStore('tables');

// Saved tables (store `tables`, opened by shared/db.ts) and which one is active. Every call can fail: callers fall back to "this session only".
export const listTables = async (): Promise<TableTheme[]> => (await store.run('readonly', (s) => s.getAll() as IDBRequest<TableTheme[]>)).filter((t) => t.version === 1).map(migrarTema).sort((a, b) => a.createdAt - b.createdAt);
export const saveTable = async (t: TableTheme): Promise<void> => { await store.run('readwrite', (s) => s.put(t)); };
export const deleteTable = async (id: string): Promise<void> => { await store.run('readwrite', (s) => s.delete(id)); };

const ACTIVE = 'mesa.ativa';
export const activeId = (): string | null => { try { return localStorage.getItem(ACTIVE); } catch { return null; } };
export const setActiveId = (id: string | null) => { try { if (id) localStorage.setItem(ACTIVE, id); else localStorage.removeItem(ACTIVE); } catch { /* blocked storage: the table is the default next visit */ } };
