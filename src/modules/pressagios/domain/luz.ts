import { span } from '../../../shared/math.ts';
import type { PlanoDoPresagio } from '../contracts.ts';

// The omen's one light (the Show's PointLight), as pure curves. `t` is ms since the show began; the result is the
// intensity. Lightning and fire keep their own curves in the Show; these three only play when neither is active.

export type FonteDaLuz = 'fogo' | 'raio' | 'tempestade' | 'kraken' | 'dualidade';

// Who gets the light when several effects want it in the same throw, strongest first.
export function fonteDaLuz(plano: PlanoDoPresagio): FonteDaLuz | null {
  if (plano.fogo.length) return 'fogo';
  if (plano.raios.length) return 'raio';
  if (plano.tempestade.length) return 'tempestade';
  if (plano.kraken.length) return 'kraken';
  return plano.kind === 'duality' ? 'dualidade' : null;
}

// Must match `@keyframes thunder` (15% and 45% of 420 ms, from 1300 ms) in ui/presagios.css; tests/luz.test.ts checks it.
export const TROVAO = { inicio: 1300, duracao: 420, picos: [0.15, 0.45] };
const PICOS = TROVAO.picos.map((p) => TROVAO.inicio + p * TROVAO.duracao); // 1363, 1489
const FORCA_DOS_PICOS = [28, 18], DECAIMENTO = 120;

export const COR_KRAKEN = '#3fd6a0';
export const COR_TEMPESTADE = '#bcd4ff';
export const COR_DUALIDADE = ['#ffd36a', '#9cc8ff'];
export const POS_KRAKEN: [number, number, number] = [0, 0.3, 0]; // low, "from below"
export const POS_TEMPESTADE: [number, number, number] = [0, 9, -3];
export const POS_DUALIDADE: [number, number, number] = [0, 2, 1.5]; // under the taiji (it floats at y 4)

export const luzDoKraken = (t: number, ms: number) =>
  (t < 600 ? 8 * (t / 600) : 8 + 2 * Math.sin(t / 400)) * (1 - span(t, ms - 500, ms));

export const luzDaTempestade = (t: number) =>
  PICOS.reduce((soma, pico, i) => soma + (t >= pico && t < pico + DECAIMENTO ? FORCA_DOS_PICOS[i] * (1 - (t - pico) / DECAIMENTO) : 0), 0);

export const luzDaDualidade = (t: number, ms: number) => (t < ms ? 6 : 0);
export const corDaDualidade = (t: number) => COR_DUALIDADE[Math.floor(t / 500) % 2];
