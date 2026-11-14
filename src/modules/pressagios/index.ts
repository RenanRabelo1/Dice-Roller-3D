// Pure door of `pressagios` (ADR 0010): the omen's state and its pure rules (which effect on which die, the duration,
// the test buttons and the motion of the kraken, the storm and the fire, with the tray's break). No React here: the
// hooks and the omen's scene are in cena.ts. Only what someone outside uses today is re-exported. The HTML layer is still
// legacy (OS-0040).
export type { EstadoDoPresagio, MovimentoNoPresagio, PlanoDoPresagio } from './contracts.ts';
export { presagio, presagioTocando, rigOmen, setOmenDone, setOmenTest } from './store.ts';
export { DUALITY_HIT, isD20, OMEN_MS, omenMs } from './domain/omen.ts';
export { planoDoPresagio } from './domain/plano.ts';
export { indicesComPercurso, movimentoNoPresagio } from './domain/percurso.ts';
export { OMEN_TESTS } from './domain/omenTest.ts';
export {
  fractureCells, KRAKEN, krakenAt, krakenDieAt, krakenIndices, STORM, stormAt, stormDieAt, stormIndices, trayBrokenAt,
} from './domain/krakenMotion.ts';
export { fireAt, fireIndices, fireReach } from './domain/fireMotion.ts';
