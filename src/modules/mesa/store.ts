// The table's state (owned by `mesa`): a vanilla zustand store, written only here, read outside through `mesa()` and
// `useMesa()` (cena.ts).
import { createStore } from 'zustand/vanilla';
import type { TableState } from './contracts.ts';
// Imported statically: its defineStore must run before the database opens (armadilhas.md).
import { activeId, deleteTable, listTables, saveTable, setActiveId } from './repository.ts';
import { DEFAULT_ID, DEFAULT_THEME, type TableTheme } from './domain/tableTheme.ts';

// The active table and the saved ones. The active theme is always a saved record (except the built-in default),
// so editing it updates the record; saves are debounced because colour pickers fire on every drag.
const newId = () => (globalThis.crypto?.randomUUID?.() ?? `m-${Date.now()}-${Math.random().toString(36).slice(2)}`);
let timer: ReturnType<typeof setTimeout> | undefined;
let unsaved: (() => void) | undefined; // the debounced write still waiting, if any

export const store = createStore<TableState>((set, get) => {
  const persist = (t: TableTheme, now = false) => {
    if (t.id === DEFAULT_ID) return;
    const write = () => { unsaved = undefined; clearTimeout(timer); return saveTable(t).catch(() => set({ sessionOnly: true })); };
    clearTimeout(timer);
    if (now) void write(); else { unsaved = () => void write(); timer = setTimeout(unsaved, 300); }
  };
  const activate = (theme: TableTheme) => {
    setActiveId(theme.id === DEFAULT_ID ? null : theme.id);
    set((s) => ({
      theme, colors: { felt: theme.felt.color, wood: theme.wood.color },
      tables: theme.id === DEFAULT_ID || s.tables.some((t) => t.id === theme.id) ? s.tables.map((t) => (t.id === theme.id ? theme : t)) : [...s.tables, theme],
    }));
  };
  return {
    theme: DEFAULT_THEME, tables: [], sessionOnly: false, colors: { felt: DEFAULT_THEME.felt.color, wood: DEFAULT_THEME.wood.color },
    async load() {
      try {
        const tables = await listTables(), id = activeId(), found = tables.find((t) => t.id === id);
        set({ tables });
        if (found) activate(found);
      } catch { set({ sessionOnly: true }); }
    },
    apply(theme) { activate(theme); persist(theme, true); },
    edit(patch) {
      const cur = get().theme;
      const next: TableTheme = cur.id === DEFAULT_ID ? { ...cur, id: newId(), name: 'Minha mesa', createdAt: Date.now(), ...patch } : { ...cur, ...patch };
      if (cur.id === DEFAULT_ID) { setActiveId(next.id); set((s) => ({ tables: [...s.tables, next] })); }
      set((s) => ({ theme: next, colors: cur.model ? s.colors : { felt: next.felt.color, wood: next.wood.color }, tables: s.tables.map((t) => (t.id === next.id ? next : t)) }));
      persist(next);
    },
    copy() {
      const cur = get().theme;
      const next = { ...cur, id: newId(), name: `${cur.name} (cópia)`.slice(0, 40), createdAt: Date.now() };
      activate(next); persist(next, true);
    },
    remove(id) {
      clearTimeout(timer); unsaved = undefined; // a pending save of this table must not bring it back
      void deleteTable(id).catch(() => set({ sessionOnly: true }));
      set((s) => ({ tables: s.tables.filter((t) => t.id !== id) }));
      if (get().theme.id === id) activate(DEFAULT_THEME);
    },
    reset() { activate(DEFAULT_THEME); },
    setColors: (colors) => set({ colors }),
  };
});

export const mesa = (): TableState => store.getState();

export const { load, apply, edit, copy, remove, reset, setColors } = store.getState();

// Closing the tab within the debounce window still saves the last change (best effort: IndexedDB may not finish).
if (typeof addEventListener === 'function') addEventListener('pagehide', () => unsaved?.());
