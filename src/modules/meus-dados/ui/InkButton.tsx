// The ink and finish of one imported die, changed in place (nothing is imported again).
import { useState } from 'react';
import { carregarModelo, finishOf, hasTexture, type CustomDie } from '../../dados/index.ts';
import { atualizar } from '../store.ts';
import { InkChoice } from './InkChoice.tsx';

export function InkButton({ die }: { die: CustomDie }) {
  const [textured, setTextured] = useState(false);
  const change = (patch: Partial<CustomDie>) => { void atualizar({ ...die, ...patch }); };
  return (
    <details className="ink-pop" onToggle={(e) => {
      if (e.currentTarget.open && die.file.format === 'glb') void carregarModelo(die).then((o) => setTextured(hasTexture(o)));
    }}>
      <summary aria-label={`Tinta de ${die.name}`}>Tinta</summary>
      <InkChoice ink={die.ink ?? 'auto'} finish={finishOf(die)} engraved stl={die.file.format === 'stl'} textured={textured}
        onInk={(ink) => change({ ink })} onFinish={(finish) => change({ finish })} />
    </details>
  );
}
