// Scene door of `arremesso` (ADR 0010): the React hooks and components. Everything pure is in index.ts.
export { useArremesso } from './ui/useArremesso.tsx';
// The replay loop (worker or main thread), the die's physical body, the tray's colliders and the hand in the throw
// (input, aim, whirl, arrow, return). What happens in `settled` is the `vitrine`'s `Vitrine`.
export { LoopDoArremesso } from './scene/LoopDoArremesso.tsx';
export { MaoDoArremesso } from './scene/MaoDoArremesso.tsx';
export { CorpoDoDado } from './scene/CorpoDoDado.tsx';
export { ColisoresDaBandeja } from './scene/ColisoresDaBandeja.tsx';
// The footer's parts: the roll mode (Relativa/Estática), the force bar and the phase's help text.
export { ModoDeRolagem } from './ui/ModoDeRolagem.tsx';
export { BarraDeForca } from './ui/BarraDeForca.tsx';
export { DicaDaFase } from './ui/DicaDaFase.tsx';
