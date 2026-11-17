import { useCallback, useEffect, useRef } from 'react';
import { useBeforePhysicsStep, type RapierRigidBody } from '@react-three/rapier';
import { customsOf } from '../../dados/index.ts';
import { registrarFalha, renderizadorPorSoftware } from '../../../shared/plataforma/index.ts';
import type { OmenTest, Recording, RollRequest, RollResponse } from '../contracts.ts';
import { bodyStates } from '../domain/apply.ts';
import { BIAS_BUDGET, orcamentoDaBusca, presimulateFor } from '../domain/presim.ts';
import { omenKinds } from '../domain/vies.ts';
import { criarWorkerDePresimulacao } from '../index.ts';
import { definirBuscaDoTeste } from '../buscaDoTeste.ts';
import { arremesso } from '../store.ts';
import { registrarLancamento, registroDeCorpos } from './corpos.ts';

const WORKER_TIMEOUT = 2000; // ms; a ten-dice recording takes well under 200 ms
// A test search ends when its budget runs out, but the seed in flight still finishes: give it room, or a late reply
// is thrown away for a local search.
const BIAS_MARGIN = 5000;

// `omenTest`: the dev test button that is on, read each step. It lives in `pressagios`, which depends on `arremesso`, so the
// shell passes it as a function (dependency inversion; importing `pressagios` here would make a cycle).
export function LoopDoArremesso({ omenTest: testeAtual }: { omenTest: () => OmenTest | null }) {
  const play = useRef<{ throwId: number; request: RollRequest; rec: Recording | null; at: number; sent: number } | null>(null);
  const worker = useRef<Worker | null>(null);
  // A blocked, failed or silent worker still gets a real roll, here; discard cancelled selections.
  // If the engine itself fails, the throw is dropped and the dice go back to the hand.
  const fallback = useCallback(() => {
    definirBuscaDoTeste(false);
    if (worker.current) console.warn('Worker da física indisponível: simulando na thread principal.');
    worker.current?.terminate(); worker.current = null;
    const pending = play.current, state = arremesso();
    if (pending && !pending.rec && pending.throwId === state.throwId && state.gesture.phase === 'rolling') {
      try { pending.rec = presimulateFor(pending.request, pending.request.orcamento?.local ?? BIAS_BUDGET.local); } catch (error) {
        console.error(error);
        state.reiniciar();
        registrarFalha('physics');
      }
    }
  }, []);
  useEffect(() => {
    try {
      const w = criarWorkerDePresimulacao();
      worker.current = w;
      w.onmessage = ({ data }: MessageEvent<RollResponse>) => {
        definirBuscaDoTeste(false); // a reply, current or stale, ends any search; the render resumes
        const pending = play.current, state = arremesso();
        if (!pending || data.throwId !== pending.throwId || data.throwId !== state.throwId || state.gesture.phase !== 'rolling') return;
        if ('error' in data) fallback();
        else pending.rec = data.rec;
      };
      w.onerror = (event) => { event.preventDefault(); fallback(); };
      w.onmessageerror = fallback;
    } catch { fallback(); }
    return () => { worker.current?.terminate(); worker.current = null; definirBuscaDoTeste(false); };
  }, [fallback]);
  const live = () => registroDeCorpos.current.filter((b): b is RapierRigidBody => b !== null && b.isValid());
  // On release the whole roll is simulated offline from the dice's current poses, then replayed one recorded
  // step per physics step: a real roll in real time, whose result is published the moment it ends.
  useBeforePhysicsStep(() => {
    const { gesture, throwId, launch, dice, publish } = arremesso(), omenTest = testeAtual();
    if (gesture.phase !== 'rolling' || !launch) return;
    const current = live();
    if (play.current?.throwId !== throwId) {
      if (current.length !== dice.length) return;
      const start = bodyStates(current).map(({ p, q }) => ({ p, q }));
      const request: RollRequest = { dice, start, launch, customs: customsOf(dice), ...(omenTest && { bias: { test: omenTest, kinds: omenKinds(dice) }, orcamento: orcamentoDaBusca(renderizadorPorSoftware()) }) };
      play.current = { throwId, request, rec: null, at: 0, sent: performance.now() };
      registrarFalha(null);
      if (worker.current) {
        worker.current.postMessage(request);
        if (request.bias) {
          // The render pauses during the search (buscaDoTeste.ts), and with it this step: the timeout is a real timer.
          definirBuscaDoTeste(true);
          const pending = play.current;
          setTimeout(() => { if (play.current === pending && !pending.rec) fallback(); }, WORKER_TIMEOUT + request.orcamento!.worker + BIAS_MARGIN);
        }
      }
      else play.current.rec = presimulateFor(request, request.orcamento?.local ?? BIAS_BUDGET.local);
      registrarLancamento({ before: start, after: bodyStates(current).map(({ p, q }) => ({ p, q })) });
    }
    const { rec } = play.current;
    if (!rec) { if (!play.current.request.bias && performance.now() - play.current.sent > WORKER_TIMEOUT) fallback(); return; }
    rec.frames[play.current.at].forEach(({ p, q }, i) => {
      current[i].setNextKinematicTranslation({ x: p[0], y: p[1], z: p[2] });
      current[i].setNextKinematicRotation({ x: q[0], y: q[1], z: q[2], w: q[3] });
    });
    if (++play.current.at === rec.frames.length) {
      // Subscribers must see the final pose, even before this physics step has run.
      rec.frames.at(-1)!.forEach(({ p, q }, i) => {
        current[i].setTranslation({ x: p[0], y: p[1], z: p[2] }, true);
        current[i].setRotation({ x: q[0], y: q[1], z: q[2], w: q[3] }, true);
      });
      publish(throwId, rec.results, rec.raw);
    }
  });
  return null;
}
