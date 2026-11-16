// Scene door of `mesa` (ADR 0010): the React hooks. Everything pure is in index.ts.
export { useMesa } from './ui/useMesa.tsx';
// The table in the scene (its look, inside arremesso's tray colliders), the ambience (colour background, 360° panorama,
// environment map) and the photo or ready-made backdrop behind the canvas.
export { MesaNaCena } from './scene/MesaNaCena.tsx';
export { AmbienteDaMesa } from './scene/AmbienteDaMesa.tsx';
export { FundoCss } from './ui/FundoCss.tsx';
// The "Personalizar mesa" chapter of the book: controlled by the shell (aberto, onAlternar, onFechar); the M key lives here.
export { PainelDaMesa } from './ui/PainelDaMesa.tsx';
