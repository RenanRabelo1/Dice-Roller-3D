import { useArremesso } from './useArremesso.tsx';

// The charge now (or the last throw's). Whoever mounts it decides when it shows (the shell's Painel, src/app/Painel.tsx: only in `charging`).
export function BarraDeForca() {
  const force = useArremesso((s) => s.force);
  return <progress aria-label="Força" max={1} value={force} />;
}
