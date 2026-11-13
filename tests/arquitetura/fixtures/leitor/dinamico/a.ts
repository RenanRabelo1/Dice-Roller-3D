// Fixture: import() without a string literal is refused (leitor.test.ts).
const nome = './b';

export const porVariavel = () => import(nome);
export const porTemplate = () => import(`./${nome}`);
