import { Box3, Camera, Group, Light, Mesh, MeshBasicMaterial, MeshStandardMaterial, Scene, Texture, Vector3, type BufferGeometry, type Object3D } from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { parseGlb } from '../dice/importer';
import { TRAY } from '../physics/world';
import { backdrop, buildDefault, find, GUIDE, isPlaceholder, roleOf, shade, SURFACE } from './tableBuild';
import { blobOfImage, TableError } from './tableImages';
import { EXTRAS_KEY, extrasOf, LIMITS, readExtras, type TableTheme, type ThemeExtras } from './tableTheme';

// Exporting, importing (cleaned, fitted, checked) and building any theme's table. Loaded on demand: it carries the
// glTF loader and exporter. The default table's own build lives in tableBuild.ts.

// Any theme's table: the imported model fitted to the play area, or the default one (decoding the felt image first).
export async function buildFor(theme: TableTheme): Promise<Group> {
  if (theme.model) return (await readTable(theme.model.bytes, false)).group;
  const tx = theme.felt.texture;
  return buildDefault(theme, typeof tx === 'object' ? await createImageBitmap(tx.image) : undefined);
}

// --- exporting --------------------------------------------------------------------------------------------------

export async function exportTable(group: Group, theme: TableTheme, backgroundMap: Texture | null): Promise<ArrayBuffer> {
  const renamed: [Object3D, string][] = [];
  const rename = (o: Object3D, name: string) => { renamed.push([o, o.name]); o.name = name; };
  // The model's old `fundo` is replaced by the one for the current backdrop.
  const old = find(group, 'fundo');
  const removedFrom = old?.parent ?? null;
  old?.removeFromParent();
  const fresh = backgroundMap && theme.background.kind === 'image' ? backdrop(backgroundMap) : null;
  if (fresh) group.add(fresh);
  const surface = group.getObjectByName(SURFACE);
  if (surface === group) rename(group, 'mesa'); else if (surface) rename(surface, 'piso');
  const previous = group.userData[EXTRAS_KEY];
  group.userData[EXTRAS_KEY] = extrasOf(theme);
  const scene = new Scene();
  scene.userData[EXTRAS_KEY] = extrasOf(theme);
  scene.add(group);
  // The plain felt's white pixel is not part of the player's table.
  const blanked: MeshStandardMaterial[] = [];
  group.traverse((o) => { if (o instanceof Mesh) for (const m of ([] as MeshStandardMaterial[]).concat(o.material)) if (isPlaceholder(m.map)) { blanked.push(m); } });
  const maps = blanked.map((m) => m.map);
  blanked.forEach((m) => { m.map = null; });
  try {
    return (await new GLTFExporter().parseAsync(scene, { binary: true, onlyVisible: false })) as ArrayBuffer;
  } finally {
    blanked.forEach((m, i) => { m.map = maps[i]; });
    scene.remove(group);
    renamed.reverse().forEach(([o, n]) => { o.name = n; });
    group.userData[EXTRAS_KEY] = previous;
    fresh?.removeFromParent();
    if (old && removedFrom) removedFrom.add(old);
  }
}

// --- importing --------------------------------------------------------------------------------------------------
export function cleanTable(root: Object3D): number {
  const drop: Object3D[] = [];
  root.traverse((o) => { if (o instanceof Light || o instanceof Camera) drop.push(o); });
  drop.forEach((o) => o.removeFromParent());
  return drop.length;
}

const triangles = (root: Object3D) => {
  let n = 0;
  root.traverse((o) => { if (o instanceof Mesh) { const g = o.geometry as BufferGeometry; n += (g.index ? g.index.count : g.getAttribute('position').count) / 3; } });
  return n;
};

const boxOf = (o: Object3D, outer: Object3D) => { outer.updateMatrixWorld(true); return new Box3().setFromObject(o, true); };
const geoMean = (v: number[]) => Math.exp(v.reduce((s, x) => s + Math.log(x), 0) / v.length);

// Puts the file's table where the game's is: the guide box (or, without one, the floor) is scaled, turned (Z up -> Y up)
// and moved onto the play area. Returns the wrapper, named SURFACE-style as the app expects, plus the checks.
export function fitTable(root: Object3D): { group: Group; warnings: string[] } {
  const piso = find(root, 'piso'), frame = find(root, 'moldura'), guia = find(root, 'guia-area-de-jogo');
  if (!guia && !piso) throw new TableError('Não achei a guia da área de jogo nem o piso nesse arquivo. Exporte a mesa do app e edite a partir dela.');
  const group = new Group();
  group.add(root);
  if (guia) {
    const [w, h, d] = GUIDE.size;
    let best = { spread: Infinity, rx: 0 };
    for (const rx of [0, -Math.PI / 2, Math.PI / 2]) { // the glTF standard is Y up; some editors export Z up
      group.rotation.set(rx, 0, 0);
      const s = boxOf(guia, group).getSize(new Vector3()), r = [s.x / w, s.y / h, s.z / d];
      const spread = Math.max(...r) / Math.max(Math.min(...r), 1e-9);
      if (spread < best.spread - 1e-6) best = { spread, rx };
    }
    group.rotation.set(best.rx, 0, 0);
    const s = boxOf(guia, group).getSize(new Vector3());
    const k = geoMean([s.x / w, s.y / h, s.z / d]);
    if (!(k > 0) || !Number.isFinite(k)) throw new TableError('A guia da área de jogo está vazia.');
    group.scale.setScalar(1 / k);
    const c = boxOf(guia, group).getCenter(new Vector3());
    group.position.set(GUIDE.center[0] - c.x, GUIDE.center[1] - c.y, GUIDE.center[2] - c.z);
  } else {
    const b = boxOf(piso!, group), s = b.getSize(new Vector3());
    const k = (s.x / 15 + s.z / 10) / 2;
    if (!(k > 0) || !Number.isFinite(k)) throw new TableError('O piso está vazio.');
    group.scale.setScalar(1 / k);
    const f = boxOf(piso!, group), c = f.getCenter(new Vector3());
    group.position.set(-c.x, -f.max.y, -c.z);
  }
  group.updateMatrixWorld(true);

  const warnings: string[] = [];
  const hw = TRAY.halfWidth - 0.05, hd = TRAY.halfDepth - 0.05, v = new Vector3();
  if (frame) {
    let inside = 0, top = -Infinity;
    frame.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      const pos = (o.geometry as BufferGeometry).getAttribute('position');
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        top = Math.max(top, v.y);
        if (Math.abs(v.x) < hw && Math.abs(v.z) < hd && v.y > 0.1) inside++;
      }
    });
    if (inside) warnings.push('A moldura entra na área de jogo. Os dados podem atravessar o que está dentro dela.');
    if (top < TRAY.wallHeight - 0.05) warnings.push('A moldura é mais baixa que as paredes invisíveis (1,5). Os dados podem bater numa parede que não aparece.');
  } else warnings.push('Não achei a moldura. Os dados vão bater em paredes invisíveis.');
  if (piso) {
    const top = new Box3().setFromObject(piso, true).max.y;
    if (Math.abs(top) > 0.1) warnings.push(`O topo do piso está ${top.toFixed(2).replace('.', ',')} acima do nível dos dados. Eles podem flutuar ou afundar no feltro.`);
    piso.name = SURFACE;
    group.name = 'mesa';
  } else {
    warnings.push('Não achei o piso. Na quebra da mesa (crítico do d100) o modelo inteiro some e só os cacos aparecem.');
    group.name = SURFACE;
  }
  if (guia) guia.visible = false;
  const fundo = find(root, 'fundo');
  if (fundo) fundo.visible = false;
  shade(group);
  return { group, warnings };
}

export interface ImportedTable { group: Group; warnings: string[]; extras: ThemeExtras | null; backdrop: Blob | null }

// A table file, read: size and triangle limits, only data: URLs, textures up to 2048 px (the backdrop up to 4096).
export async function readTable(bytes: ArrayBuffer, withBackdrop = true): Promise<ImportedTable> {
  if (bytes.byteLength > LIMITS.tableBytes) throw new TableError(`O arquivo passa de ${LIMITS.tableBytes / 1024 / 1024} MB.`);
  if (!bytes.byteLength) throw new TableError('O arquivo está vazio.');
  let root: Object3D;
  try {
    root = await parseGlb(bytes, (mesh) => (roleOf(mesh) === 'fundo' ? LIMITS.photoPx : LIMITS.texturePx));
  } catch (e) {
    if (e instanceof Error && e.constructor.name === 'ImportError') throw new TableError(e.message.replace('O GLB precisa', 'A mesa precisa'));
    throw new TableError('Não consegui ler esse arquivo. Exporte como .glb.');
  }
  cleanTable(root);
  const count = triangles(root);
  if (count > LIMITS.tableTriangles) throw new TableError(`A mesa tem ${count} triângulos; o máximo é ${LIMITS.tableTriangles}.`);
  const raw = [root.userData[EXTRAS_KEY], find(root, 'mesa')?.userData[EXTRAS_KEY], root.children[0]?.userData[EXTRAS_KEY]];
  const parsed = raw.map((x) => { if (typeof x === 'string') { try { return JSON.parse(x); } catch { return null; } } return x; });
  const extras = parsed.map(readExtras).find((e) => e) ?? null;
  const fundo = find(root, 'fundo');
  const map = fundo instanceof Mesh ? ((Array.isArray(fundo.material) ? fundo.material[0] : fundo.material) as MeshBasicMaterial).map : null;
  const { group, warnings } = fitTable(root);
  let backdrop: Blob | null = null;
  if (withBackdrop && extras?.background.kind === 'image') {
    if (map?.image) backdrop = await blobOfImage(map.image as HTMLImageElement);
    else warnings.push('O tema pede uma foto de fundo, mas o arquivo não tem o plano "fundo". O fundo atual foi mantido.');
  }
  if (withBackdrop && !extras) warnings.push('O arquivo não traz o tema (cores e fundo). Mantive o fundo atual; as cores vêm do modelo.');
  return { group, warnings, extras, backdrop };
}
