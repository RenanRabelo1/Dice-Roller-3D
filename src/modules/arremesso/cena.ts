// Scene door of `arremesso` (ADR 0010): the React hooks and components. Everything pure is in index.ts.
export { useArremesso } from './ui/useArremesso.tsx';
// The replay loop (worker or main thread), the die's physical body and the tray's colliders. The hand is still legacy.
export { LoopDoArremesso } from './scene/LoopDoArremesso.tsx';
export { CorpoDoDado } from './scene/CorpoDoDado.tsx';
export { ColisoresDaBandeja } from './scene/ColisoresDaBandeja.tsx';
