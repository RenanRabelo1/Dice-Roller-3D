// The registry of the scene's die bodies and of the launches (owned by `arremesso`), without React: `CorpoDoDado`
// registers itself, `LoopDoArremesso` and `MaoDoArremesso` read it, the `vitrine`'s `Vitrine`, `pressagios`' `PresagiosNaCena` and the shell
// (test hook) read it through index.ts. Slot `i` is die `i` of the current throw; a disposed body leaves `null`.
import type { RapierRigidBody } from '@react-three/rapier';
import type { Quat, Vec3 } from '../../../shared/math.ts';
import type { UltimoLancamento } from '../contracts.ts';
import { arremesso } from '../store.ts';

export const registroDeCorpos: { current: (RapierRigidBody | null)[] } = { current: [] };

// The registered bodies of the current selection, or `null` unless the hand is ready and the count matches.
export const corposVivos = (): RapierRigidBody[] | null => {
  const state = arremesso();
  const expected = state.dice.length, selection = state.dice.join(',');
  const registered = registroDeCorpos.current.filter((b): b is RapierRigidBody => b !== null && b.isValid() && (b.userData as { selection?: string } | undefined)?.selection === selection);
  return state.ready && registered.length === expected ? registered : null;
};

// How many launches were applied, and the poses just before and after the last one (`LoopDoArremesso` writes it).
let lancamentos: { count: number; last: UltimoLancamento | null } = { count: 0, last: null };
export const registrarLancamento = (last: UltimoLancamento) => { lancamentos = { count: lancamentos.count + 1, last }; };

// Test mode reading (the shell builds the test hook's `bodies` and `launches` from it).
export const inspecao = () => ({
  corpos: (): { handle: number; p: Vec3; q: Quat; type: number }[] => registroDeCorpos.current
    .filter((body): body is RapierRigidBody => body !== null && body.isValid()).map((body) => {
      const p = body.translation(), q = body.rotation();
      return { handle: body.handle, p: [p.x, p.y, p.z], q: [q.x, q.y, q.z, q.w], type: body.bodyType() };
    }),
  lancamentos: () => lancamentos,
});
