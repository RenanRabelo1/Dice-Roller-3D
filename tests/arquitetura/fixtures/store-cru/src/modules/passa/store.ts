export const store = { valor: 1 };
export const ler = () => store.valor;
export const escrever = (v: number) => { store.valor = v; };
