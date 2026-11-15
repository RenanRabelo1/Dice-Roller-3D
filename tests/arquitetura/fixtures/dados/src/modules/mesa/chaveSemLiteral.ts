// Violates: no literal of a declared key in the file (the key hides in a variable).
const CHAVE = ['mesa', 'brilho'].join('.');
export const brilho = () => window.sessionStorage.getItem(CHAVE);
