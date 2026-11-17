import { createSignal } from '../events.ts'

// Whether the player asked for reduced motion (ADR 0005, ADR 0008). The value is private to this file and every
// write is announced, so modules that hold state tied to it (the omen) can react in the same synchronous tick.
let reduzido = false
const mudou = createSignal<boolean>()

export const movimentoReduzido = (): boolean => reduzido
export const aoMudarMovimentoReduzido = (ouvinte: (v: boolean) => void): (() => void) => mudou.subscribe(ouvinte)
// Emits on every call, even when the value repeats: turning it on always drops the omen being shown.
export const definirMovimentoReduzido = (v: boolean) => { reduzido = v; mudou.emit(v) }

// Follows the system's prefers-reduced-motion: reads it now, then on every change. Returns the cancel.
export function observarPreferenciaDoSistema(): () => void {
  const media = matchMedia('(prefers-reduced-motion: reduce)')
  const update = () => definirMovimentoReduzido(media.matches)
  update(); media.addEventListener('change', update)
  return () => media.removeEventListener('change', update)
}
