// Fixture: a non-code URL is ignored, a code URL is an edge (leitor.test.ts).
export const imagem = new URL('./dado.svg', import.meta.url);
export const codigo = new URL('./b.ts', import.meta.url);
