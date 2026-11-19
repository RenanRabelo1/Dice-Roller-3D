import { useEffect, type CSSProperties, type RefObject } from 'react';
import type { OmenKind, TipoVampiro } from '../../regras/index.ts';
import { useArremesso } from '../../arremesso/cena.ts';
import { planoDoPresagio } from '../domain/plano.ts';
import { VAMPIRO } from '../domain/vampiroMotion.ts';
import { usePresagio, usePresagioTocando } from './usePresagio.tsx';
import './presagios.css';

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
const SAY_VAMPIRO: Record<TipoVampiro, string> = {
  'par-de-criticos': 'Crítico em par!', 'critico-bestial': 'Crítico bestial!', 'falha-bestial': 'Falha bestial!',
};
const { falha } = VAMPIRO;
const FALHA_CSS = {
  '--fecha': `${falha.destapa}ms`, '--abertura': `${falha.espera - falha.destapa}ms`,
  '--rasgos-em': `${falha.ataque}ms`, '--rasgos-ms': `${falha.revela - falha.ataque}ms`,
} as CSSProperties;

function VampiroOverlay({ tipo }: { tipo: TipoVampiro }) {
  return <div className="omen-vampiro" style={tipo === 'falha-bestial' ? FALHA_CSS : undefined}>
    {tipo === 'falha-bestial' && <>
      <div className="vampiro-sombra" />
      <div className="vampiro-rasgos"><i /><i /><i /></div>
    </>}
  </div>;
}

export function OverlayDoPresagio({ gameArea }: { gameArea: RefObject<HTMLDivElement | null> }) {
  const playing = usePresagioTocando(), omen = usePresagio((s) => s.omen), vampiro = usePresagio((s) => s.vampiro);
  const dice = useArremesso((s) => s.dice), live = playing ? omen ?? vampiro : null;
  // Which effect on which die comes from the plan (the same for every omen as the old calculation: tests/plano.test.ts).
  const plano = planoDoPresagio(playing ? omen : null, dice, playing ? vampiro : null);
  const { kind } = plano, tipo = plano.vampiro?.tipo;
  const kraken = plano.kraken.length > 0, storm = plano.tempestade.length > 0;
  useEffect(() => {
    const area = gameArea.current;
    if (!area) return;
    if (kind) area.setAttribute('data-omen', kind); else area.removeAttribute('data-omen');
    area.toggleAttribute('data-kraken', kraken);
    area.toggleAttribute('data-storm', storm);
    if (tipo) area.setAttribute('data-vampiro', tipo); else area.removeAttribute('data-vampiro');
    return () => {
      area.removeAttribute('data-omen'); area.removeAttribute('data-kraken'); area.removeAttribute('data-storm');
      area.removeAttribute('data-vampiro');
    };
  }, [gameArea, kind, kraken, storm, tipo]);
  if (!live) return null;
  return (
    <>
      <div key={live.throwId} className="omen" style={{ '--ms': `${plano.ms}ms` } as CSSProperties} aria-hidden="true">
        {plano.raios.length > 0 && <div className="omen-flash" />}
        {kraken && <div className="omen-deep" />}
        {plano.fogo.length > 0 && <div className="omen-heat" />}
        {tipo && <VampiroOverlay tipo={tipo} />}
        {storm && <>
          <div className="omen-sea" />
          <div className="omen-rain">
            {RAIN.map(([left, delay, ms, length, near], i) => <i key={i} className={near ? 'near' : undefined}
              style={{ left: `${left}%`, height: `${length}px`, animationDelay: `-${delay}ms`, animationDuration: `${ms}ms` }} />)}
          </div>
          <div className="omen-thunder" />
        </>}
      </div>
      <p className="sr-only" role="status">{tipo ? SAY_VAMPIRO[tipo] : kind && SAY[kind]}</p>
    </>
  );
}
