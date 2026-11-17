// Pure door of `pressagios` (ADR 0010): the omen's state and its pure rules (which effect on which die, the duration,
// the test buttons and the motion of the kraken, the storm and the fire, with the tray's break), and what the test hook
// reads. No React here: the hooks, the omen's scene and its HTML layer are in cena.ts. Only what someone outside uses
// today is re-exported.
import { Color, type BufferGeometry, type Mesh, type Object3D } from 'three';
import { omenKind } from '../regras/index.ts';
import { arremesso } from '../arremesso/index.ts';
import type { PresagioInspecionado } from './contracts.ts';
import { presagio } from './store.ts';

export { presagio, presagioTocando, reiniciarPresagio, rigOmen, setOmenDone, setOmenTest } from './store.ts';
export { isD20, OMEN_MS, omenMs } from './domain/omen.ts';
export { indicesComPercurso, movimentoNoPresagio } from './domain/percurso.ts';
export { KRAKEN, krakenDieAt, STORM, stormAt, stormDieAt } from './domain/krakenMotion.ts';

// The omen as the test hook reads it (`omen`, `omenDone`, `omenTime`, `trayBroken` and `burning` of `window.__dice.state()`,
// and `shards()`): its state, and the tray's floor, the fire and the kraken's first floor shard in the scene the shell gives.
export function inspecao(cena: Object3D): PresagioInspecionado {
  const { throwId } = arremesso(), { omen, omenDone, omenAt } = presagio();
  const piece = cena.getObjectByName('kraken-fragments')?.children[0] as Mesh | undefined;
  const c = (piece?.geometry as BufferGeometry | undefined)?.getAttribute('color');
  const hex = (i: number) => (c ? `#${new Color(c.getX(i), c.getY(i), c.getZ(i)).getHexString()}` : null);
  return {
    omen: omen?.throwId === throwId ? omenKind(omen) : null, omenDone,
    omenTime: performance.now() - omenAt, trayBroken: cena.getObjectByName('tray-surface')?.visible === false,
    burning: cena.getObjectByName('fire')?.visible === true,
    shards: c ? { felt: hex(0)!, wood: hex(3)! } : null,
  };
}
