import { useId } from 'react';
import type { Finish, Ink } from '../dice/custom';

const INKS: [Ink, string][] = [['auto', 'Automática'], ['ouro', 'Dourada'], ['escura', 'Escura'], ['branca', 'Branca'], ['nenhuma', 'Sem tinta']];
const FINISHES: [Finish, string][] = [['gema', 'Gema'], ['fosco', 'Fosco']];

// The ink of the engraved numerals and, for an STL, the finish: shared by the import wizard and "Meus dados".
// On a model with its own texture the ink multiplies it, so only dark ink (or none) is offered.
export function InkChoice({ ink, finish, engraved, stl, textured, onInk, onFinish }: {
  ink: Ink; finish: Finish; engraved: boolean; stl: boolean; textured: boolean; onInk: (ink: Ink) => void; onFinish: (finish: Finish) => void;
}) {
  const id = useId();
  const inks = textured ? INKS.filter(([k]) => k === 'escura' || k === 'nenhuma') : INKS;
  const shown = inks.some(([k]) => k === ink) ? ink : inks[0][0];
  return (
    <div className="ink-choice">
      {engraved && (
        <fieldset>
          <legend>Tinta dos números</legend>
          {inks.map(([k, label]) => (
            <label key={k}><input type="radio" name={`${id}-ink`} checked={shown === k} onChange={() => onInk(k)} /> {label}</label>
          ))}
        </fieldset>
      )}
      {stl && (
        <fieldset>
          <legend>Acabamento</legend>
          {FINISHES.map(([k, label]) => (
            <label key={k}><input type="radio" name={`${id}-finish`} checked={finish === k} onChange={() => onFinish(k)} /> {label}</label>
          ))}
        </fieldset>
      )}
    </div>
  );
}
