import { useState, type RefObject } from 'react';
import { OMEN_TESTS, setOmenTest } from '../modules/pressagios/index';
import { usePresagio } from '../modules/pressagios/cena';

// Dev only (see App): a side panel to see each omen at will. The chosen one stays on for the next throws,
// which land on the faces that call it (real physics, see presimulateFor), until it is clicked again.
export function OmenTests({ gameArea }: { gameArea: RefObject<HTMLDivElement | null> }) {
  const [open, setOpen] = useState(false);
  const test = usePresagio((s) => s.omenTest);
  return (
    // Hand.tsx ignores presses that start here, so a click on these buttons never starts a throw.
    <aside className="omen-tests" aria-label="Testar animações">
      <button aria-expanded={open} onClick={() => setOpen((o) => !o)}>Testar animações{test && ' •'}</button>
      {open && (
        <div role="group" aria-label="Animação dos próximos arremessos">
          {OMEN_TESTS.map(({ id, name, face }) => (
            <button key={id} aria-pressed={test === id} onClick={() => {
              setOmenTest(test === id ? null : id);
              gameArea.current?.focus({ preventScroll: true }); // Space throws again, it does not press this button
            }}>{name}<small>{face}</small></button>
          ))}
          <p>Os próximos arremessos caem nesse resultado, com física real. Clique de novo para desligar.</p>
        </div>
      )}
    </aside>
  );
}
