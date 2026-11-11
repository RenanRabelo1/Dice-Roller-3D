import { useEffect, type CSSProperties, type RefObject } from 'react';
import { isD20, omenKind, omenMs, type OmenKind } from '../dice/omen';
import type { DieKind } from '../dice/polyhedra';
import { useDice } from '../store';

// The screen side of an omen: blood for a fumble, a white flash as the lightning strikes, a deep-sea
// vignette while the kraken rises. Duality shakes the canvas (CSS on the game area). Gone when the omen ends.

// A lumpy blob with a few flung drops, in a 100×100 box; seeded, so the same shapes every time.
function splat(seed: number): string {
  let a = seed;
  const rnd = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const n = 16, f = (v: number) => v.toFixed(1);
  const pts = Array.from({ length: n }, (_, i) => {
    const ang = (2 * Math.PI * i) / n, r = 22 + rnd() * 12 + (rnd() < 0.25 ? 10 : 0);
    return [50 + Math.cos(ang) * r, 50 + Math.sin(ang) * r];
  });
  const mid = (i: number) => pts[i % n].map((v, k) => (v + pts[(i + 1) % n][k]) / 2);
  let d = `M${mid(n - 1).map(f).join(' ')}`;
  pts.forEach((p, i) => { d += ` Q${f(p[0])} ${f(p[1])} ${mid(i).map(f).join(' ')}`; });
  d += 'Z';
  for (let k = 0; k < 6; k++) {
    const ang = rnd() * 2 * Math.PI, r = 38 + rnd() * 10, s = 1.5 + rnd() * 3;
    const x = 50 + Math.cos(ang) * r, y = 50 + Math.sin(ang) * r;
    d += ` M${f(x - s)} ${f(y)} a${f(s)} ${f(s)} 0 1 0 ${f(2 * s)} 0 a${f(s)} ${f(s)} 0 1 0 ${f(-2 * s)} 0`;
  }
  return d;
}
const SPLATS: { d: string; style: CSSProperties }[] = [
  { d: splat(3), style: { left: '-6%', top: '-10%', width: '34vmin' } },
  { d: splat(11), style: { right: '-4%', top: '-6%', width: '28vmin' } },
  { d: splat(23), style: { left: '8%', bottom: '-12%', width: '24vmin' } },
  { d: splat(41), style: { right: '12%', bottom: '-8%', width: '20vmin' } },
];
// left %, width px, final length %, delay ms, duration ms
const DRIPS = [[4, 16, 34, 40, 1100], [11, 9, 20, 160, 900], [19, 22, 46, 0, 1300], [31, 12, 26, 220, 1000], [44, 8, 15, 120, 800],
  [58, 18, 38, 60, 1200], [69, 10, 22, 260, 950], [80, 24, 50, 20, 1350], [91, 13, 30, 180, 1050]];
const SAY: Record<OmenKind, string> = { crit: 'Crítico!', fumble: 'Falha crítica!', duality: 'Dualidade: crítico e falha!' };

export function OmenOverlay({ gameArea }: { gameArea: RefObject<HTMLDivElement | null> }) {
  const omen = useDice((s) => s.omen), done = useDice((s) => s.omenDone), throwId = useDice((s) => s.throwId);
  const phase = useDice((s) => s.gesture.phase), dice = useDice((s) => s.dice);
  const live = omen && omen.throwId === throwId && phase === 'settled' && done !== throwId ? omen : null;
  const kind = live && omenKind(live);
  const kraken = kind === 'crit' && !!live?.crits.some((i) => dice[i] === 'd100');
  useEffect(() => {
    const area = gameArea.current;
    if (!area) return;
    if (kind) area.setAttribute('data-omen', kind); else area.removeAttribute('data-omen');
    area.toggleAttribute('data-kraken', kraken);
    return () => { area.removeAttribute('data-omen'); area.removeAttribute('data-kraken'); };
  }, [gameArea, kind, kraken]);
  if (!live || !kind) return null;
  const on = (is: (die: DieKind) => boolean) => kind === 'crit' && live.crits.some((i) => is(dice[i]));
  return (
    <>
      <div key={live.throwId} className="omen" style={{ '--ms': `${omenMs(live, dice)}ms` } as CSSProperties} aria-hidden="true">
        {kind === 'fumble' && <>
          <div className="omen-blood" />
          {SPLATS.map(({ d, style }, i) => <svg key={i} className="omen-splat" viewBox="0 0 100 100" style={{ ...style, animationDelay: `${i * 70}ms` }}><path d={d} /></svg>)}
          {DRIPS.map(([left, w, h, delay, ms], i) => <i key={i} className="omen-drip"
            style={{ left: `${left}%`, '--w': `${w}px`, '--h': `${h}%`, animationDelay: `${delay + 120}ms`, animationDuration: `${ms}ms` } as CSSProperties} />)}
        </>}
        {on(isD20) && <div className="omen-flash" />}
        {on((die) => die === 'd100') && <><div className="omen-deep" /><div className="omen-heaven" /></>}
      </div>
      <p className="sr-only" role="status">{SAY[kind]}</p>
    </>
  );
}
