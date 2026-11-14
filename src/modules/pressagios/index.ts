// Pure door of `pressagios` (ADR 0010): the omen's state and its pure rules (the duration, the test buttons and the
// motion of the kraken, the storm and the fire, with the tray's break). No React here: the hooks are in cena.ts.
// Only what someone outside uses today is re-exported. The omen's scene and HTML layer are still legacy (OS-0039, 0040).
export type { EstadoDoPresagio } from './contracts.ts';
export { presagio, presagioTocando, rigOmen, setOmenDone, setOmenTest } from './store.ts';
export { DUALITY_HIT, isD20, OMEN_MS, omenMs } from './domain/omen.ts';
export { OMEN_TESTS } from './domain/omenTest.ts';
export {
  fractureCells, KRAKEN, krakenAt, krakenDieAt, krakenIndices, STORM, stormAt, stormDieAt, stormIndices, trayBrokenAt,
} from './domain/krakenMotion.ts';
export { fireAt, fireIndices, fireReach } from './domain/fireMotion.ts';
