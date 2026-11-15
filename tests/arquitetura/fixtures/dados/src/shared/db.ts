// Allowed: the only file that opens IndexedDB.
export const abrir = () => indexedDB.open('fixture');
export const defineStore = (nome: string) => ({ nome });
