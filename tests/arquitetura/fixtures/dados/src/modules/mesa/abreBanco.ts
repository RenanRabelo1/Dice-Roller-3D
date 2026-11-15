// Violates: IndexedDB outside src/shared/db.ts.
export const apagar = () => indexedDB.deleteDatabase('fixture');
