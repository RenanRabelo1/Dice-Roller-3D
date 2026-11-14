// Scene door of `pressagios` (ADR 0010): the React hooks and the omen's scene. Everything pure is in index.ts.
// The omen's HTML layer is still legacy (OS-0040).
export { usePresagio, usePresagioTocando } from './ui/usePresagio.tsx';
// The 3D side of the omen (lightning, kraken and storm, fire, the duality's fish, the effect light, shader warm-up),
// mounted after the physics; and the tray's break, mounted right before <MesaNaCena/>.
export { PresagiosNaCena } from './scene/PresagiosNaCena.tsx';
export { QuebraDaMesa } from './scene/QuebraDaMesa.tsx';
// The kraken's shards in the table's colours (the module's tests read them).
export { SHARD_DEFAULT, shard, shardWood } from './scene/Kraken.ts';
