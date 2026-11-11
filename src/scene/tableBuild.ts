import { BoxGeometry, Group, Material, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, type Object3D, type Texture } from 'three';
import { TRAY, trayColliders } from '../physics/world';
import { feltMap } from './tableTextures';
import { EXTRAS_KEY, extrasOf, type TableTheme } from './tableTheme';


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
export function backdrop(map: Texture): Mesh {
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



// The role a node plays, from its name: Blender adds ".001" and three drops the dot, so both forms are accepted.
export const roleOf = (o: Object3D): string => String(o.userData.name ?? o.name).toLowerCase().replace(/[._]?\d{3}$/, '');
export function find(root: Object3D, role: string): Object3D | null {
  let hit: Object3D | null = null;
  root.traverse((o) => { if (!hit && o !== root && (roleOf(o) === role || o.name === role)) hit = o; });
  return hit;
}

// Lights and cameras would change the scene's light count (recompiling every die's shader); animations never reach us.
