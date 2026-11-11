import type { DiceError } from './store';

// What the player reads when the 3D side cannot run (R10). Mensagens em pt-BR; `store.error` says which one.
export const FAILURE: Record<NonNullable<DiceError>, string> = {
  webgl: 'Este navegador não tem WebGL ativo. Abra no Chrome, Edge ou Firefox atualizados.',
  graphics: 'O 3D falhou neste navegador. Recarregue a página.',
  physics: 'Não foi possível carregar a física. Recarregue a página.',
};

let probed: boolean | undefined; // probed once: StrictMode renders twice, and each probe makes a context
export function hasWebGL(): boolean {
  return probed ??= probe();
}
function probe(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    gl?.getExtension('WEBGL_lose_context')?.loseContext(); // the probe's context is not kept
    return !!gl;
  } catch { return false; }
}

