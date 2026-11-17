// Folhear (OS-0067): a "folha" is one double page of a chapter body laid out in columns.
// `conteudo` is the body's scrollWidth, `largura` its clientWidth and `vao` its column-gap.
export const larguraDaFolha = (largura: number, vao: number) => largura + vao;
export const totalDeFolhas = (conteudo: number, largura: number, vao: number) =>
  Math.max(1, Math.ceil((conteudo + vao) / larguraDaFolha(largura, vao) - 0.01));
export const folhaEm = (scrollLeft: number, largura: number, vao: number) =>
  Math.round(scrollLeft / larguraDaFolha(largura, vao));

// The sheet being shown, 1-based. The last sheet can sit short of its own offset (the browser stops at
// scrollWidth - clientWidth), so resting at the end of the scroll always counts as the last sheet.
export function folhaVista(scrollLeft: number, conteudo: number, largura: number, vao: number): number {
  const total = totalDeFolhas(conteudo, largura, vao);
  if (total > 1 && scrollLeft >= conteudo - largura - 2) return total;
  return Math.min(total, folhaEm(scrollLeft, largura, vao) + 1);
}
