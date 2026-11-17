// Scene door of `pressagios` (ADR 0010): the React hooks, the omen's scene and its HTML layer. Everything pure is in index.ts.
export { usePresagio, usePresagioTocando } from './ui/usePresagio.tsx';
// The 3D side of the omen (lightning, kraken and storm, fire, the duality's fish, the effect light, shader warm-up),
// mounted after the physics; and the tray's break, mounted right before <MesaNaCena/>.
export { PresagiosNaCena } from './scene/PresagiosNaCena.tsx';
export { QuebraDaMesa } from './scene/QuebraDaMesa.tsx';
// The omen's HTML layer (flash, heat, the kraken's and the storm's backdrop, the status line; it writes data-omen,
// data-kraken and data-storm on .game-area and brings presagios.css), and the dev test buttons (the App mounts them in DEV).
export { OverlayDoPresagio } from './ui/OverlayDoPresagio.tsx';
export { BotoesDeTeste } from './ui/BotoesDeTeste.tsx';
// The kraken's shards in the table's colours (the module's tests read them).
export { shard, shardWood } from './scene/Kraken.ts';
