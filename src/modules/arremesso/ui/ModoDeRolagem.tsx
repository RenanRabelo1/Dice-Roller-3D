import { setChargeMode } from '../store.ts';
import { useArremesso } from './useArremesso.tsx';

// Bottom left: how the charge moves while you hold (see arremesso/domain/aim.ts).
const MODES = [
  ['relative', 'Relativa', 'A força sobe e desce enquanto você segura: solte na hora certa.'],
  ['static', 'Estática', 'A força só sobe, até o máximo, e fica no máximo até você soltar.'],
] as const;
export function ModoDeRolagem() {
  const mode = useArremesso((s) => s.chargeMode);
  return (
    <div className="roll-mode" role="radiogroup" aria-label="Rolagem">
      <span aria-hidden="true">Rolagem</span>
      {MODES.map(([value, name, hint]) => (
        <label key={value} title={hint}>
          <input type="radio" name="roll-mode" value={value} checked={mode === value} onChange={() => setChargeMode(value)} />
          {name}
        </label>
      ))}
    </div>
  );
}
