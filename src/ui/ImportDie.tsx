import { useEffect, useMemo, useRef, useState, type ElementRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls } from '@react-three/drei';
import { BufferGeometry, Color, Float32BufferAttribute, Group, Matrix4, Mesh, Quaternion, Vector3 } from 'three';
import { customKind, type CustomDie } from '../dice/custom';
import { askOrder, checkValue, checkValues, formatOf, importModel, ImportError, inkOf, LIMITS, normaliseValues, renumbered, suggestOpposite, type Imported } from '../dice/importer';
import { slugOf, slugProblem } from '../dice/notation';
import { MAX_DICE, type Polyhedron } from '../dice/polyhedra';
import { GEM } from '../scene/Die';
import { useDice } from '../store';

type Step = 'file' | 'shape' | 'numbers' | 'save';
type Loaded = { imported: Imported; bytes: ArrayBuffer; fileName: string; format: 'stl' | 'glb' };

const prettySize = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

// How many sides the face (or, on a d4, nothing) has: the numeral turns in steps of 360° / sides.
const sidesOf = (poly: Polyhedron, face: number) => {
  const f = poly.faces[face], off = f.normal[0] * f.center[0] + f.normal[1] * f.center[1] + f.normal[2] * f.center[2];
  return poly.points.filter((p) => Math.abs(p[0] * f.normal[0] + p[1] * f.normal[1] + p[2] * f.normal[2] - off) < 1e-4).length;
};

// Turns the model so the asked face looks at the camera with its numeral's "up" pointing up the screen.
function orientation(normal: [number, number, number], up: [number, number, number]): Quaternion {
  const n = new Vector3(...normal), u = new Vector3(...up);
  return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(new Vector3().crossVectors(u, n), u, n)).invert();
}

// The face being asked, painted over the model (in the ideal solid's space): its polygon, or the corner of a d4.
function Marker({ poly, face }: { poly: Polyhedron; face: number }) {
  const { geometry, outline } = useMemo(() => {
    const g = new BufferGeometry(), line = new BufferGeometry();
    if (poly.shape === 'd4') return { geometry: g, outline: line };
    const f = poly.faces[face], n = new Vector3(...f.normal), d = n.dot(new Vector3(...f.center)), c = new Vector3(...f.center);
    const u = new Vector3().crossVectors(n, Math.abs(n.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0)).normalize(), w = new Vector3().crossVectors(n, u);
    const ring = poly.points.map((p) => new Vector3(...p)).filter((p) => Math.abs(n.dot(p) - d) < 1e-4)
      .sort((a, b) => Math.atan2(w.dot(a.clone().sub(c)), u.dot(a.clone().sub(c))) - Math.atan2(w.dot(b.clone().sub(c)), u.dot(b.clone().sub(c))));
    const lift = n.clone().multiplyScalar(0.006), v: number[] = [];
    for (let k = 1; k < ring.length - 1; k++) for (const p of [ring[0], ring[k], ring[k + 1]]) v.push(...p.clone().add(lift).toArray());
    g.setAttribute('position', new Float32BufferAttribute(v, 3));
    line.setAttribute('position', new Float32BufferAttribute(ring.flatMap((p) => p.clone().add(lift).toArray()), 3));
    return { geometry: g, outline: line };
  }, [poly, face]);
  useEffect(() => () => { geometry.dispose(); outline.dispose(); }, [geometry, outline]);
  if (poly.shape === 'd4') return <mesh position={poly.points[face]}><sphereGeometry args={[0.07, 16, 12]} /><meshBasicMaterial color="#ffb000" depthTest={false} /></mesh>;
  return (
    <>
      <mesh geometry={geometry}><meshBasicMaterial color="#ffb000" transparent opacity={0.08} depthWrite={false} side={2} /></mesh>
      <lineLoop geometry={outline}><lineBasicMaterial color="#ff8a00" /></lineLoop>
    </>
  );
}

// Frames the camera on the asked face (and again on demand: `nonce`), after the player has dragged it around.
function Rig({ distance, nonce, pose, controls }: { distance: number; nonce: number; pose: Quaternion | null; controls: React.RefObject<ElementRef<typeof OrbitControls> | null> }) {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    camera.position.set(0, 0, distance); camera.up.set(0, 1, 0); camera.lookAt(0, 0, 0);
    controls.current?.update();
  }, [camera, distance, nonce, pose, controls]);
  return null;
}

function Preview({ loaded, color, orient, face, plain }: { loaded: Loaded; color: string; orient: Quaternion | null; face: number | null; plain: boolean }) {
  const group = useRef<Group>(null);
  const { imported: { fit, object, poly }, format } = loaded;
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    if (orient) g.quaternion.copy(orient); else g.rotateY(dt * 0.6);
  });
  const at = fit.center.map((c) => -c * fit.scale) as [number, number, number];
  // While reading the numbers the model is "painted": pale and matte, with ink where it is cut into a face.
  const painted = useMemo(() => {
    if (!plain || format !== 'stl') return null;
    const g = (object as Mesh).geometry.clone(), ink = inkOf(g.getAttribute('position').array, loaded.imported);
    const pale = new Color('#e6e1d4'), dark = new Color('#16130f'), c = new Color(), colors = new Float32Array(ink.length);
    for (let i = 0; i < ink.length; i += 3) { c.copy(pale).lerp(dark, ink[i]); c.toArray(colors, i); }
    g.setAttribute('color', new Float32BufferAttribute(colors, 3));
    return g;
  }, [plain, format, object, loaded.imported]);
  useEffect(() => () => painted?.dispose(), [painted]);
  return (
    <group ref={group}>
      {format === 'stl'
        ? <mesh geometry={painted ?? (object as Mesh).geometry} position={at} scale={fit.scale}>
          {plain ? <meshStandardMaterial vertexColors roughness={0.95} metalness={0} />
            : <meshPhysicalMaterial color={color} roughness={0.08} clearcoat={1} clearcoatRoughness={0.04} ior={1.6} />}
        </mesh>
        : <primitive object={object} position={at} scale={fit.scale} />}
      {face !== null && <Marker poly={poly} face={face} />}
    </group>
  );
}

export function ImportDie({ open, onClose }: { open: boolean; onClose: () => void }) {
  const customs = useDice((s) => s.customs), sessionOnly = useDice((s) => s.sessionOnly), selected = useDice((s) => s.dice);
  const [step, setStep] = useState<Step>('file');
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [omens, setOmens] = useState(true);
  const [color, setColor] = useState(GEM.d20);
  const [printed, setPrinted] = useState(false); // the model has its own numerals: calibrate
  const [asking, setAsking] = useState(false);
  const [pos, setPos] = useState(0); // which face is being asked
  const [values, setValues] = useState<Record<number, number>>({}); // by face (d4: corner); confirmed and suggested
  const [confirmed, setConfirmed] = useState<number[]>([]);
  const [turns, setTurns] = useState<Record<number, number>>({});
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const orbit = useRef<ElementRef<typeof OrbitControls>>(null);

  const imp = loaded?.imported;
  const order = useMemo(() => (imp ? askOrder(imp.poly) : []), [imp]);
  const faceCount = order.length;
  const face = order[pos];
  const isD4 = imp?.base === 'd4';

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    panel.current?.querySelector<HTMLElement>('input, button')?.focus({ preventScroll: true });
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const reset = () => {
    setStep('file'); setLoaded(null); setError(''); setPrinted(false); setAsking(false); setPos(0); setValues({}); setConfirmed([]); setTurns({});
    setName(''); setSlug(''); setSlugEdited(false); setOmens(true);
  };
  const close = () => { onClose(); reset(); };

  const pick = async (file: File | undefined) => {
    if (!file) return;
    reset();
    const format = formatOf(file.name);
    if (!format) { setError('Formato não suportado. Use um arquivo .stl ou .glb.'); return; }
    if (file.size > LIMITS.bytes) { setError(`O arquivo passa de ${LIMITS.bytes / 1024 / 1024} MB.`); return; }
    setBusy(true);
    try {
      const bytes = await file.arrayBuffer();
      const imported = await importModel(bytes, format);
      setLoaded({ imported, bytes, fileName: file.name, format });
      setColor(GEM[imported.base as 'd20']);
      setName(file.name.replace(/\.[^.]*$/, '').slice(0, 24));
      setStep('shape');
    } catch (e) {
      setError(e instanceof ImportError ? e.message : 'Não consegui ler esse arquivo.');
    } finally { setBusy(false); }
  };

  // Calibration: what the player sees is the asked face, turned by the numeral's current rotation.
  const preview = useMemo(() => {
    if (!imp || step !== 'numbers' || !asking || face === undefined) return null;
    const turned = renumbered(imp.poly, { turns: imp.poly.faces.map((_, i) => (i === face ? turns[face] ?? 0 : 0)) });
    return isD4 ? orientation(imp.poly.tops[face].dir, [0, 1, 0.001]) : orientation(imp.poly.faces[face].normal, turned.labelList[face].up);
  }, [imp, step, asking, face, turns, isD4]);

  const [look, setLook] = useState(0); // "Voltar à face"
  // Close enough that the asked face fills most of the preview (~75%).
  const distance = useMemo(() => {
    if (!imp || face === undefined || isD4) return 2.8;
    const f = imp.poly.faces[face], c = new Vector3(...f.center);
    const reach = Math.max(...imp.poly.points.map((p) => new Vector3(...p)).filter((p) => Math.abs(p.clone().sub(c).dot(new Vector3(...f.normal))) < 1e-4).map((p) => p.distanceTo(c)));
    return c.length() + reach / (0.75 * Math.tan((17.5 * Math.PI) / 180));
  }, [imp, face, isD4]);

  const askNext = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!imp || face === undefined) return;
    const draft = String(new FormData(e.currentTarget).get('value') ?? '').trim(), v = Number(draft);
    const problem = draft === '' ? 'Digite o número que está nesta face.' : checkValue(imp.base, v);
    if (problem) { setError(problem); return; }
    const mine = normaliseValues(imp.base, [v])[0];
    const clash = confirmed.find((j) => j !== face && normaliseValues(imp.base, [values[j]])[0] === mine);
    if (clash !== undefined) { setError(`O número ${v} já foi usado em outra face.`); return; }
    setError('');
    const next = { ...values, [face]: v };
    const done = confirmed.includes(face) ? confirmed : [...confirmed, face];
    if (!isD4) {
      const opposite = order[pos % 2 === 0 ? pos + 1 : pos - 1], suggestion = suggestOpposite(imp.base, mine);
      if (opposite !== undefined && !done.includes(opposite) && suggestion !== null) next[opposite] = imp.base === 'd10' && suggestion === 0 ? 10 : suggestion;
    }
    setValues(next); setConfirmed(done);
    if (pos + 1 < faceCount) setPos(pos + 1);
    else finish(next);
  };
  const finish = (all: Record<number, number>) => {
    if (!imp) return;
    const count = isD4 ? imp.poly.tops.length : imp.poly.faces.length;
    const problem = checkValues(imp.base, Array.from({ length: count }, (_, i) => all[i] ?? NaN));
    if (problem) { setError(problem); return; }
    setStep('save');
  };

  const save = async () => {
    if (!imp || !loaded) return;
    const trimmed = name.trim(), bad = trimmed.length < 1 || trimmed.length > 24 ? 'O nome tem de 1 a 24 caracteres.' : slugProblem(slug);
    if (bad) { setError(bad); return; }
    let poly = imp.poly;
    if (printed) {
      const count = isD4 ? imp.poly.tops.length : imp.poly.faces.length;
      poly = renumbered(imp.poly, {
        values: normaliseValues(imp.base, Array.from({ length: count }, (_, i) => values[i])),
        turns: isD4 ? undefined : imp.poly.faces.map((_, i) => turns[i] ?? 0),
      });
    }
    const die: CustomDie = {
      version: 1, id: crypto.randomUUID(), createdAt: Date.now(), name: trimmed, slug, base: imp.base,
      omens: imp.base === 'd20' && omens,
      file: { format: loaded.format, name: loaded.fileName, bytes: loaded.bytes },
      fit: imp.fit, poly, printed, color: loaded.format === 'stl' ? color : null,
    };
    setBusy(true);
    const failure = await useDice.getState().addCustom(die);
    setBusy(false);
    if (failure) { setError(failure); return; }
    if (selected.length < MAX_DICE) useDice.getState().addDie(customKind(die.id));
    close();
  };

  const turnLabel = imp && face !== undefined && !isD4 ? sidesOf(imp.poly, face) : 0;

  return (
    <aside ref={panel} id="import-die" className="chat panel import" data-open={open} inert={!open} aria-label="Importar dado">
      <header>
        <h2>Importar dado</h2>
        <button aria-label="Fechar importação" onClick={close}>×</button>
      </header>
      <div className="import-body">
        {sessionOnly && <p className="import-note" role="status">Este navegador não deixa guardar dados: o dado fica só nesta sessão.</p>}
        {step === 'file' && (
          <label className="import-drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void pick(e.dataTransfer.files[0]); }}>
            <span>Arraste um arquivo <b>.stl</b> ou <b>.glb</b> aqui, ou escolha no computador.</span>
            <small>Até {LIMITS.bytes / 1024 / 1024} MB e {LIMITS.triangles.toLocaleString('pt-BR')} triângulos. Dados d4, d6, d8, d10, d12 e d20.</small>
            <input type="file" accept=".stl,.glb" data-testid="import-file" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
        )}
        {loaded && imp && step !== 'file' && (
          <div className="import-preview" aria-label="Prévia do dado">
            <Canvas key={step === 'numbers' ? 'read' : 'look'} camera={{ position: [0, 0, step === 'numbers' ? 2.6 : 3.4], fov: 35 }} dpr={1}>
              <ambientLight intensity={step === 'numbers' ? 1.1 : 0.6} />
              {/* A low light from the side throws shadows into engraved numbers. */}
              <directionalLight position={[3, 0.6, 2]} intensity={step === 'numbers' ? 2.6 : 2.2} />
              <Environment resolution={64}>
                <Lightformer position={[0, 4, 3]} scale={[6, 3, 1]} intensity={3} color="#fff4dd" />
                <Lightformer position={[-4, 1, 3]} scale={[2, 5, 1]} intensity={3} color="#dceaff" />
              </Environment>
              <Preview loaded={loaded} color={color} orient={step === 'numbers' && asking ? preview : null}
                face={step === 'numbers' && asking && face !== undefined ? face : null} plain={step === 'numbers'} />
              <OrbitControls ref={orbit} enableZoom={false} enablePan={false} />
              {step === 'numbers' && asking && <Rig distance={distance} nonce={look} pose={preview} controls={orbit} />}
            </Canvas>
          </div>
        )}
        {step === 'shape' && loaded && imp && (
          <>
            <p data-testid="import-shape">Reconheci um <strong>{imp.base}</strong>. {loaded.fileName}: {prettySize(loaded.bytes.byteLength)}, {imp.triangles.toLocaleString('pt-BR')} triângulos.</p>
            {imp.base === 'd20' && <label className="import-row"><input type="checkbox" checked={omens} onChange={(e) => setOmens(e.target.checked)} /> Conta como d20 nos críticos</label>}
            {loaded.format === 'stl' && <label className="import-row">Cor da gema <input type="color" value={color} onChange={(e) => setColor(e.target.value)} /></label>}
            <button onClick={() => setStep('numbers')}>Continuar</button>
          </>
        )}
        {step === 'numbers' && imp && (
          <>
            {!asking ? (
              <>
                <p><strong>Esse modelo já vem com números gravados nas faces?</strong></p>
                {imp.hasNumbers && <p className="import-note" data-testid="import-hint">Parece que esse modelo já tem números.</p>}
                <div className="import-choice">
                  <button className={imp.hasNumbers ? 'primary' : undefined} onClick={() => { setPrinted(true); setAsking(true); setPos(0); }}>
                    Sim, calibrar<small>Sim — você me diz o número de cada face</small></button>
                  <button onClick={() => { setPrinted(false); setStep('save'); }}>
                    Não, numerar para mim<small>Não — o dado é liso, eu escrevo os números</small></button>
                </div>
                <small>Se escolher “Não” num modelo numerado, os nossos números vão por cima dos dele. Arraste a prévia para girar o dado.</small>
              </>
            ) : (
              <form onSubmit={askNext} className="import-ask">
                <p aria-live="polite" data-testid="import-progress">{pos + 1} de {faceCount}</p>
                <label>{isD4 ? 'Que número você lê no vértice voltado para você?' : 'Que número está nesta face?'}
                  <input key={pos} name="value" type="number" defaultValue={values[face] ?? ''} onChange={() => setError('')} autoFocus /></label>
                <div className="import-row">
                  <button type="button" onClick={() => setLook((n) => n + 1)}>Voltar à face</button>
                  {!isD4 && <button type="button" aria-label="Girar o numeral" onClick={() => setTurns((t) => ({ ...t, [face]: ((t[face] ?? 0) + 1) % turnLabel }))}>↻ Girar</button>}
                  <button type="button" disabled={pos === 0} onClick={() => { setPos(pos - 1); setError(''); }}>Voltar</button>
                  <button type="submit">{pos + 1 === faceCount ? 'Concluir' : 'Confirmar face'}</button>
                </div>
              </form>
            )}
          </>
        )}
        {step === 'save' && imp && (
          <form className="import-ask" onSubmit={(e) => { e.preventDefault(); void save(); }}>
            <label>Nome <input value={name} maxLength={24} onChange={(e) => { setName(e.target.value); if (!slugEdited) setSlug(slugOf(e.target.value)); }} /></label>
            <label>Apelido no chat <input value={slug} spellCheck={false} onChange={(e) => { setSlug(e.target.value.toLowerCase()); setSlugEdited(true); }} aria-describedby="slug-hint" /></label>
            <small id="slug-hint">Ex.: 2d{imp.base.slice(1)}{slug || 'apelido'}</small>
            <button type="submit" disabled={busy}>Salvar</button>
          </form>
        )}
        {busy && step === 'file' && <p role="status">Lendo o modelo…</p>}
        {error && <p className="import-error" role="alert">{error}</p>}
      </div>
      <footer>{customs.length > 0 && <small>{customs.length} dado(s) guardado(s) neste navegador.</small>}</footer>
    </aside>
  );
}

