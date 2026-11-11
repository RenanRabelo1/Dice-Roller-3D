import { useEffect, useRef, useState } from 'react';
import { colorsOf, disposeTable } from '../scene/tableBuild';
import { reduceImage, TableError } from '../scene/tableImages';
import { useTable } from '../scene/tableState';
import { clampBlur, clampDim, clampTile, DEFAULT_THEME, fileSafe, LIMITS, PRESETS, type Background, type PresetName, type TableTheme } from '../scene/tableTheme';

const typing = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

type Pending = { theme: TableTheme; warnings: string[] };

// Side sheet "Personalizar mesa" (header button or the M key): backdrop, felt/wood, and the table file (export/import).
export function TablePanel() {
  const { theme, tables, sessionOnly, edit, apply, copy, remove, reset } = useTable();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState<Pending | null>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const bg = theme.background, model = !!theme.model;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (e.key === 'Escape' && open) { setOpen(false); toggle.current?.focus(); return; }
      if ((e.key === 'm' || e.key === 'M') && !typing(e.target)) { e.preventDefault(); setOpen((o) => !o); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Runs `work` with a status line; a TableError becomes the message, anything else a generic one.
  const task = async (label: string, work: () => Promise<void>) => {
    setError(''); setBusy(label);
    try { await work(); } catch (e) { setError(e instanceof TableError ? e.message : 'Não consegui fazer isso. Tente de novo.'); } finally { setBusy(''); }
  };
  const photo = (file: File | undefined) => file && task('Preparando imagem…', async () => {
    const image = await reduceImage(file, LIMITS.photoPx);
    edit({ background: { kind: 'image', image, blur: bg.kind === 'image' ? bg.blur : 0, dim: bg.kind === 'image' ? bg.dim : 25 } });
  });
  const feltImage = (file: File | undefined) => file && task('Preparando imagem…', async () => {
    // White, so the picture shows in its own colours; the colour can still be changed afterwards to tint it on purpose.
    edit({ felt: { color: '#ffffff', texture: { image: await reduceImage(file, LIMITS.texturePx), tile: 2 } } });
  });
  const setBackground = (background: Background) => edit({ background });

  const exportFile = () => task('Preparando arquivo…', async () => {
    const { buildFor, exportTable } = await import('../scene/tableFile');
    const { CanvasTexture } = await import('three');
    const group = await buildFor(theme);
    const map = bg.kind === 'image' ? new CanvasTexture(await createImageBitmap(bg.image)) : null;
    try {
      const bytes = await exportTable(group, theme, map);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([bytes], { type: 'model/gltf-binary' }));
      a.download = `mesa-${fileSafe(theme.name)}.glb`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    } finally { disposeTable(group); map?.dispose(); }
  });

  const importFile = (file: File | undefined) => file && task('Lendo a mesa…', async () => {
    if (!file.name.toLowerCase().endsWith('.glb')) throw new TableError('Use um arquivo .glb (exporte como glTF Binário).');
    const bytes = await file.arrayBuffer();
    const { readTable } = await import('../scene/tableFile');
    const read = await readTable(bytes);
    const colors = colorsOf(read.group) ?? { felt: DEFAULT_THEME.felt.color, wood: DEFAULT_THEME.wood.color };
    disposeTable(read.group);
    const x = read.extras;
    const background: Background = x ? (x.background.kind === 'image' ? (read.backdrop ? { kind: 'image', image: read.backdrop, blur: x.background.blur, dim: x.background.dim } : bg) : x.background) : bg;
    const next: TableTheme = {
      version: 1, id: crypto.randomUUID(), name: (x?.name ?? file.name.replace(/\.glb$/i, '')).slice(0, 40), createdAt: Date.now(),
      background, felt: { color: colors.felt, texture: 'liso' }, wood: { color: colors.wood }, model: { name: file.name, bytes },
    };
    if (read.warnings.length) setPending({ theme: next, warnings: read.warnings }); else apply(next);
  });

  const color = (label: string, value: string, onChange: (v: string) => void, disabled = false) => (
    <label className="table-row">{label}<input type="color" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} /></label>
  );
  const texture = typeof theme.felt.texture === 'object' ? 'imagem' : theme.felt.texture;

  return (
    <>
      <button ref={toggle} className="chat-toggle" aria-expanded={open} aria-controls="table-panel" aria-keyshortcuts="M"
        onClick={() => setOpen((o) => !o)}>Mesa <kbd>M</kbd></button>
      <aside id="table-panel" className="chat panel import table-panel" data-open={open} inert={!open} aria-label="Personalizar mesa">
        <header>
          <h2>Personalizar mesa</h2>
          <button aria-label="Fechar painel da mesa" onClick={() => { setOpen(false); toggle.current?.focus(); }}>×</button>
        </header>
        <div className="import-body">
          {sessionOnly && <p className="import-error">Este navegador não guarda dados: a mesa vale só nesta sessão.</p>}
          <fieldset>
            <legend>Fundo</legend>
            <div className="import-row" role="group" aria-label="Tipo de fundo">
              <button aria-pressed={bg.kind === 'color'} onClick={() => setBackground({ kind: 'color', color: DEFAULT_THEME.background.kind === 'color' ? DEFAULT_THEME.background.color : '#140E10' })}>Cor</button>
              <button aria-pressed={bg.kind === 'image'} onClick={() => document.getElementById('table-photo')?.click()}>Foto</button>
              <button aria-pressed={bg.kind === 'preset'} onClick={() => bg.kind !== 'preset' && setBackground({ kind: 'preset', preset: 'taverna' })}>Tema</button>
              <input id="table-photo" data-testid="table-photo" type="file" accept="image/png,image/jpeg,image/webp" hidden
                onChange={(e) => { photo(e.target.files?.[0]); e.target.value = ''; }} />
            </div>
            {bg.kind === 'color' && color('Cor do fundo', bg.color, (v) => setBackground({ kind: 'color', color: v }))}
            {bg.kind === 'preset' && (
              <div className="import-row" role="group" aria-label="Temas de fundo">
                {(Object.keys(PRESETS) as PresetName[]).map((p) => (
                  <button key={p} aria-pressed={bg.preset === p} onClick={() => setBackground({ kind: 'preset', preset: p })}>{PRESETS[p].label}</button>
                ))}
              </div>
            )}
            {bg.kind === 'image' && <>
              <label className="table-row">Desfoque <input type="range" min={0} max={LIMITS.blur} value={bg.blur} onChange={(e) => setBackground({ ...bg, blur: clampBlur(+e.target.value) })} /></label>
              <label className="table-row">Escurecer <input type="range" min={0} max={LIMITS.dim} value={bg.dim} onChange={(e) => setBackground({ ...bg, dim: clampDim(+e.target.value) })} /></label>
            </>}
          </fieldset>
          <fieldset disabled={model}>
            <legend>Mesa</legend>
            {model && <small>Mesa importada: as cores e a textura vêm do arquivo.</small>}
            {color('Feltro', theme.felt.color, (v) => edit({ felt: { ...theme.felt, color: v } }), model)}
            {color('Madeira', theme.wood.color, (v) => edit({ wood: { color: v } }), model)}
            <label className="table-row">Textura do feltro
              <select value={texture} onChange={(e) => {
                const v = e.target.value;
                if (v === 'imagem') document.getElementById('table-felt-image')?.click();
                else edit({ felt: { color: theme.felt.color, texture: v as 'liso' | 'veludo' | 'couro' } });
              }}>
                <option value="liso">Liso</option><option value="veludo">Veludo</option><option value="couro">Couro</option><option value="imagem">Minha imagem…</option>
              </select>
            </label>
            <input id="table-felt-image" data-testid="table-felt-image" type="file" accept="image/png,image/jpeg,image/webp" hidden
              onChange={(e) => { feltImage(e.target.files?.[0]); e.target.value = ''; }} />
            {typeof theme.felt.texture === 'object' && <small>A cor do feltro tinge a textura. Branco mostra a imagem como ela é.</small>}
            {typeof theme.felt.texture === 'object' && (
              <label className="table-row">Tamanho da textura <input type="range" min={LIMITS.tile[0]} max={LIMITS.tile[1]} step={0.5} value={theme.felt.texture.tile}
                onChange={(e) => edit({ felt: { color: theme.felt.color, texture: { image: (theme.felt.texture as { image: Blob }).image, tile: clampTile(+e.target.value) } } })} /></label>
            )}
          </fieldset>
          <fieldset>
            <legend>Arquivo</legend>
            <label className="table-row">Nome da mesa <input value={theme.name} maxLength={40} disabled={theme.id === DEFAULT_THEME.id} onChange={(e) => edit({ name: e.target.value })} /></label>
            <div className="import-row">
              <button onClick={exportFile}>Exportar mesa</button>
              <button onClick={() => document.getElementById('table-import')?.click()}>Importar mesa</button>
              <input id="table-import" data-testid="table-import" type="file" accept=".glb,model/gltf-binary" hidden
                onChange={(e) => { importFile(e.target.files?.[0]); e.target.value = ''; }} />
              <button onClick={copy} disabled={theme.id === DEFAULT_THEME.id}>Duplicar mesa</button>
              <button onClick={reset} disabled={theme.id === DEFAULT_THEME.id}>Restaurar mesa padrão</button>
            </div>
            <small>Só .glb (até 20 MB, 100 mil triângulos, texturas de 2048 px). A mesa só muda o visual: a física e os resultados não mudam.</small>
          </fieldset>
          {busy && <p role="status">{busy}</p>}
          {error && <p className="import-error" role="alert">{error}</p>}
          {pending && (
            <div className="import-error" role="alertdialog" aria-label="Avisos da mesa" data-testid="table-warnings">
              <strong>Antes de aplicar:</strong>
              <ul>{pending.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
              <div className="import-row">
                <button onClick={() => { apply(pending.theme); setPending(null); }}>Aplicar mesmo assim</button>
                <button onClick={() => setPending(null)}>Cancelar</button>
              </div>
            </div>
          )}
          {tables.length > 0 && (
            <fieldset>
              <legend>Mesas salvas</legend>
              <ul className="table-list">
                {tables.map((t) => (
                  <li key={t.id}>
                    <button aria-pressed={t.id === theme.id} onClick={() => apply(t)}>{t.name}</button>
                    <button aria-label={`Excluir ${t.name}`} onClick={() => { if (confirm(`Excluir a mesa "${t.name}"?`)) remove(t.id); }}>🗑</button>
                  </li>
                ))}
              </ul>
            </fieldset>
          )}
        </div>
      </aside>
    </>
  );
}
