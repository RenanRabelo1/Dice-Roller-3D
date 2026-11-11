import { useEffect, useState, type CSSProperties } from 'react';
import { useTable } from './tableState';
import { PRESETS } from './tableTheme';

// A photo or ready-made backdrop lives behind the (transparent) canvas as plain CSS: blur and dimming cost the GPU nothing.
// A plain colour is the scene's own background (Stage), so nothing renders here for it.
export function Backdrop() {
  const bg = useTable((s) => s.theme.background);
  const image = bg.kind === 'image' ? bg.image : null;
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!image) return;
    let alive = true;
    const reader = new FileReader(); // a data: URL needs no cleanup, unlike an object URL
    reader.onload = () => { if (alive) setUrl(reader.result as string); };
    reader.readAsDataURL(image);
    return () => { alive = false; };
  }, [image]);
  if (bg.kind === 'color') return null;
  const style: CSSProperties = bg.kind === 'preset'
    ? { background: PRESETS[bg.preset].css }
    : { backgroundImage: image && url ? `url(${url})` : undefined, filter: `blur(${bg.blur}px)`, inset: `${-2 * bg.blur}px` };
  return (
    <div className="backdrop" data-kind={bg.kind} aria-hidden="true">
      <div className="backdrop-art" style={style} />
      {bg.kind === 'image' && <div className="backdrop-dim" style={{ opacity: bg.dim / 100 }} />}
    </div>
  );
}
