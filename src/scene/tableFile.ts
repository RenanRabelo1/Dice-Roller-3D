import {
  Box3, BoxGeometry, Camera, Group, Light, Material, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PlaneGeometry,
  Scene, Texture, Vector3, type BufferGeometry,
} from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { parseGlb } from '../dice/importer';
import { TRAY, trayColliders } from '../physics/world';
import { blobOfImage, TableError } from './tableImages';
import { feltMap } from './tableTextures';
import { EXTRAS_KEY, extrasOf, LIMITS, readExtras, type TableTheme, type ThemeExtras } from './tableTheme';

// The table as a 3D object: built from a theme, exported to a .glb, and imported back (cleaned, fitted, checked).
// Visual only: the colliders are trayColliders(), whatever the file shows.

export const GUIDE = { size: [2 * TRAY.halfWidth, TRAY.wallHeight, 2 * TRAY.halfDepth] as const, center: [0, TRAY.wallHeight / 2, 0] as const };
const BASE = { size: [15, 0.42, 10] as const, y: -0.29 }, FELT = { size: [14, 0.08, 9] as const, y: -0.04 };

export const SURFACE = 'tray-surface'; // what the kraken hides and the test hook looks for; exported as `piso`

// --- building ---------------------------------------------------------------------------------------------------

function box(name: string, size: readonly number[], at: readonly number[], material: Material): Mesh {
  const m = new Mesh(new BoxGeometry(...(size as [number, number, number])), material);
  m.name = name; m.position.set(at[0], at[1], at[2]);
  return m;
}

// The default table (today's look, recoloured by the theme): `piso` (base + felt), `moldura` (4 walls), the invisible
// play-area guide and, for a photo backdrop, the `fundo` plane (never drawn by the app: the photo is CSS behind the canvas).
export function defaultTable(theme: TableTheme, feltMap: Texture | null, backgroundMap: Texture | null): Group {
  const wood = new MeshStandardMaterial({ name: 'madeira', color: theme.wood.color, roughness: 0.7 });
  const felt = new MeshStandardMaterial({ name: 'feltro', color: theme.felt.color, roughness: 1, map: feltMap });
  const group = new Group(), surface = new Group(), frame = new Group();
  group.name = 'mesa'; surface.name = SURFACE; frame.name = 'moldura';
  surface.add(box('base', BASE.size, [0, BASE.y, 0], wood), box('feltro', FELT.size, [0, FELT.y, 0], felt));
  for (const { center, half } of trayColliders().filter((c) => c.kind === 'wall')) {
    frame.add(box('parede', [half[0] * 2, TRAY.wallHeight, half[2] * 2], [center[0], TRAY.wallHeight / 2, center[2]], wood));
  }
  group.add(surface, frame, guide());
  if (backgroundMap) group.add(backdrop(backgroundMap));
  group.userData[EXTRAS_KEY] = extrasOf(theme);
  return group;
}

function guide(): Mesh {
  const g = box('guia-area-de-jogo', GUIDE.size, GUIDE.center, new MeshBasicMaterial({ visible: false }));
  g.visible = false;
  return g;
}

// A vertical plane behind the table carrying the photo, so a 3D editor shows what the backdrop looks like.
function backdrop(map: Texture): Mesh {
  const img = map.image as { width: number; height: number }, aspect = img.width / img.height;
  const m = new Mesh(new PlaneGeometry(40 * aspect, 40), new MeshBasicMaterial({ map, name: 'fundo' }));
  m.name = 'fundo'; m.position.set(0, 10, -30); m.visible = false;
  return m;
}

// Shadows: the frame and anything the player added cast and receive; the floor only receives.
export function shade(root: Object3D) {
  root.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    const role = roleOf(o);
    o.receiveShadow = true;
    o.castShadow = role !== 'piso' && role !== 'guia-area-de-jogo' && role !== 'fundo';
  });
}

// The table for a theme without a model, ready for the scene. `felt` is the player's image once decoded.
export function buildDefault(theme: TableTheme, felt?: ImageBitmap): Group {
  const g = defaultTable(theme, feltMap(theme.felt.texture, felt), null);
  shade(g);
  return g;
}

// Any theme's table: the imported model fitted to the play area, or the default one (decoding the felt image first).
export async function buildFor(theme: TableTheme): Promise<Group> {
  if (theme.model) return (await readTable(theme.model.bytes, false)).group;
  const tx = theme.felt.texture;
  return buildDefault(theme, typeof tx === 'object' ? await createImageBitmap(tx.image) : undefined);
}

// Frees the GPU side of a table the scene stopped using.
export function disposeTable(root: Object3D) {
  root.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    o.geometry.dispose();
    for (const m of ([] as Material[]).concat(o.material)) {
      for (const t of Object.values(m)) if (t && (t as Texture).isTexture) (t as Texture).dispose();
      m.dispose();
    }
  });
}

// What the table shows (an imported model's own colours count): the kraken's shards and the test hook use it.
export function colorsOf(group: Object3D): { felt: string; wood: string } | null {
  const hex = (name: string) => { const m = find(group, name); const mat = m instanceof Mesh ? (Array.isArray(m.material) ? m.material[0] : m.material) as MeshStandardMaterial : null; return mat?.color ? `#${mat.color.getHexString()}` : null; };
  const felt = hex('feltro'), wood = hex('base') ?? hex('madeira');
  return felt && wood ? { felt, wood } : null;
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
  try {
    return (await new GLTFExporter().parseAsync(scene, { binary: true, onlyVisible: false })) as ArrayBuffer;
  } finally {
    scene.remove(group);
    renamed.reverse().forEach(([o, n]) => { o.name = n; });
    group.userData[EXTRAS_KEY] = previous;
    fresh?.removeFromParent();
    if (old && removedFrom) removedFrom.add(old);
  }
}

// --- importing --------------------------------------------------------------------------------------------------

// The role a node plays, from its name: Blender adds ".001" and three drops the dot, so both forms are accepted.
const roleOf = (o: Object3D): string => String(o.userData.name ?? o.name).toLowerCase().replace(/[._]?\d{3}$/, '');
function find(root: Object3D, role: string): Object3D | null {
  let hit: Object3D | null = null;
  root.traverse((o) => { if (!hit && o !== root && (roleOf(o) === role || o.name === role)) hit = o; });
  return hit;
}

// Lights and cameras would change the scene's light count (recompiling every die's shader); animations never reach us.
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
