import { useEffect, type CSSProperties, type RefObject } from 'react';
import { omenKind, omenMs, type OmenKind } from '../dice/omen';
import { omenPlaying, useDice } from '../store';

// The screen side of an omen: a white flash as the lightning strikes, the deep dark while the kraken is up,
// heat while the felt burns, the storm (dark sea, slanting rain, a far-off flash, the screen rocking like a
// ship) round the d100 that rolled 100. Duality shakes the canvas. Gone when the omen ends.

// Rain: seeded, so the same drops every time. [left %, delay ms, duration ms, length px, near]
const RAIN = (() => {
  let a = 11;
  const rnd = () => { a = (a * 16807) % 2147483647; return a / 2147483647; };
  return Array.from({ length: 90 }, (_, i) => {
    const near = i % 3 === 0;
    return [rnd() * 112 - 6, rnd() * 900, (near ? 420 : 640) + rnd() * 200, (near ? 70 : 40) + rnd() * 40, near] as const;
  });
})();
const SAY: Record<OmenKind, string> = { crit: 'Crítico!', fumble: 'Falha crítica!', duality: 'Dualidade: crítico e falha!' };

export function OmenOverlay({ gameArea }: { gameArea: RefObject<HTMLDivElement | null> }) {
  const playing = useDice(omenPlaying), omen = useDice((s) => s.omen), dice = useDice((s) => s.dice);
  const live = playing ? omen : null;
  const kind = live && omenKind(live);
  const has = (list: number[] | undefined, die: string) => !!list?.some((i) => dice[i] === die);
  const kraken = kind === 'crit' && has(live?.crits, 'd100'), storm = kind === 'fumble' && has(live?.fumbles, 'd100');
  useEffect(() => {
    const area = gameArea.current;
    if (!area) return;
    if (kind) area.setAttribute('data-omen', kind); else area.removeAttribute('data-omen');
    area.toggleAttribute('data-kraken', kraken);
    area.toggleAttribute('data-storm', storm);
    return () => { area.removeAttribute('data-omen'); area.removeAttribute('data-kraken'); area.removeAttribute('data-storm'); };
  }, [gameArea, kind, kraken, storm]);
  if (!live || !kind) return null;
  return (
    <>
      <div key={live.throwId} className="omen" style={{ '--ms': `${omenMs(live, dice)}ms` } as CSSProperties} aria-hidden="true">
        {kind === 'crit' && has(live.crits, 'd20') && <div className="omen-flash" />}
        {kraken && <div className="omen-deep" />}
        {kind === 'fumble' && has(live.fumbles, 'd20') && <div className="omen-heat" />}
        {storm && <>
          <div className="omen-sea" />
          <div className="omen-rain">
            {RAIN.map(([left, delay, ms, length, near], i) => <i key={i} className={near ? 'near' : undefined}
              style={{ left: `${left}%`, height: `${length}px`, animationDelay: `-${delay}ms`, animationDuration: `${ms}ms` }} />)}
          </div>
          <div className="omen-thunder" />
        </>}
      </div>
      <p className="sr-only" role="status">{SAY[kind]}</p>
    </>
  );
}
