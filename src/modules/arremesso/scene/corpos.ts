// The registry of the scene's die bodies and of the launches (owned by `arremesso`), without React: `CorpoDoDado`
// registers itself, `LoopDoArremesso` and `MaoDoArremesso` read it, the legacy (`Hand`, `Omens`) and the shell
// (test hook) read it through index.ts. Slot `i` is die `i` of the current throw; a disposed body leaves `null`.
import type { RapierRigidBody } from '@react-three/rapier';
import type { Quat, Vec3 } from '../../../shared/math.ts';
import type { UltimoLancamento } from '../contracts.ts';

export const registroDeCorpos: { current: (RapierRigidBody | null)[] } = { current: [] };

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
