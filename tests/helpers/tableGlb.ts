// A table as a .glb, hand-built (no browser needed): the nodes the game looks for, as an editor would export them.
// `scale`, `zUp` and `shift` mimic a file exported in centimetres, with Z up, or moved; `pillar` puts something inside the play area.
interface Opts { scale?: number; zUp?: boolean; shift?: [number, number, number]; pillar?: boolean; guide?: boolean; floor?: boolean; frame?: boolean; extras?: unknown }

export function tableGlb({ scale = 1, zUp = false, shift = [0, 0, 0], pillar = false, guide = true, floor = true, frame = true, extras }: Opts = {}): ArrayBuffer {
  // Unit cube: 8 corners, 12 triangles.
  const pos = new Float32Array([-1, -1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1, -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1].map((v) => v / 2));
  const idx = new Uint16Array([0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 3, 7, 6, 3, 6, 2, 0, 4, 7, 0, 7, 3, 1, 2, 6, 1, 6, 5]);
  type N = { name: string; mesh?: number; translation?: number[]; scale?: number[]; rotation?: number[]; children?: number[]; extras?: unknown };
  const nodes: N[] = [];
  const node = (n: N) => nodes.push(n) - 1;
  const part = (name: string, size: number[], at: number[], material: number) => node({ name, mesh: material, translation: at, scale: size });
  const children: number[] = [];
  if (floor) children.push(node({ name: 'piso', children: [part('base', [15, 0.42, 10], [0, -0.29, 0], 0), part('feltro', [14, 0.08, 9], [0, -0.04, 0], 1)] }));
  if (frame) {
    const walls = [part('parede', [0.5, 1.5, 10], [7.25, 0.75, 0], 0), part('parede', [0.5, 1.5, 10], [-7.25, 0.75, 0], 0),
      part('parede', [14, 1.5, 0.5], [0, 0.75, 4.75], 0), part('parede', [14, 1.5, 0.5], [0, 0.75, -4.75], 0)];
    if (pillar) walls.push(part('pilar', [1, 2, 1], [1, 1, 0], 0));
    children.push(node({ name: 'moldura', children: walls }));
  }
  if (guide) children.push(part('guia-area-de-jogo', [14, 1.5, 9], [0, 0.75, 0], 0));
  const root = node({
    name: 'mesa', children, scale: [scale, scale, scale], translation: shift,
    ...(zUp ? { rotation: [Math.SQRT1_2, 0, 0, Math.SQRT1_2] } : {}),
    ...(extras ? { extras: { diceRollerTable: extras } } : {}),
  });
  const bin = new Uint8Array(pos.byteLength + idx.byteLength);
  bin.set(new Uint8Array(pos.buffer), 0); bin.set(new Uint8Array(idx.buffer), pos.byteLength);
  const json = JSON.stringify({
    asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [root] }], nodes,
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0 }] }, { primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 1 }] }],
    materials: [{ pbrMetallicRoughness: { baseColorFactor: [0.04, 0.017, 0.008, 1] } }, { pbrMetallicRoughness: { baseColorFactor: [0.04, 0.005, 0.01, 1] } }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 8, type: 'VEC3', min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] },
      { bufferView: 1, componentType: 5123, count: 36, type: 'SCALAR' },
    ],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: pos.byteLength }, { buffer: 0, byteOffset: pos.byteLength, byteLength: idx.byteLength }],
    buffers: [{ byteLength: bin.length }],
  });
  const pad = (n: number) => (4 - (n % 4)) % 4;
  const jsonBytes = new TextEncoder().encode(json + ' '.repeat(pad(json.length)));
  const binLen = bin.length + pad(bin.length), total = 12 + 8 + jsonBytes.length + 8 + binLen;
  const out = new ArrayBuffer(total), view = new DataView(out);
  view.setUint32(0, 0x46546c67, true); view.setUint32(4, 2, true); view.setUint32(8, total, true);
  view.setUint32(12, jsonBytes.length, true); view.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(out, 20, jsonBytes.length).set(jsonBytes);
  const at = 20 + jsonBytes.length;
  view.setUint32(at, binLen, true); view.setUint32(at + 4, 0x004e4942, true);
  new Uint8Array(out, at + 8, bin.length).set(bin);
  return out;
}
