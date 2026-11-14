// Scene door of `arremesso` (ADR 0010): the React hooks and components. Everything pure is in index.ts.
export { useArremesso } from './ui/useArremesso.tsx';
// The replay loop (worker or main thread), the die's physical body, the tray's colliders and the hand in the throw
// (input, aim, whirl, arrow, return). What the hand does in `settled` is still the legacy `Hand`.
export { LoopDoArremesso } from './scene/LoopDoArremesso.tsx';
export { MaoDoArremesso } from './scene/MaoDoArremesso.tsx';
export { CorpoDoDado } from './scene/CorpoDoDado.tsx';
export { ColisoresDaBandeja } from './scene/ColisoresDaBandeja.tsx';
