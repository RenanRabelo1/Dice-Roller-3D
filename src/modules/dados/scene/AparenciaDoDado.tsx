import { useEffect, useMemo, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { BatchedText, Text } from 'troika-three-text';
import { BufferGeometry, Float32BufferAttribute, Matrix4, Mesh, MeshBasicMaterial, Object3D, Vector3, type Group, type Material } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Vec3 } from '../../../shared/math.ts';
import type { DieKind } from '../../regras/index.ts';
import type { CustomDie, Label, Polyhedron } from '../contracts.ts';
import { carregarModelo, FONT, FONT_URL, numeralInk, SYMBOL, type NumeralInk } from '../domain/aparencia.ts';
import { polyhedron } from '../domain/catalogo.ts';
import { symbolGeometry } from '../domain/simbolos.ts';
import { finishOf, inkColorOf } from '../domain/tinta.ts';
import { GemMaterial } from './GemMaterial.tsx';
import { usePainted, paintGlb } from './Pintura.tsx';

// Sits `o` on its face, upright; tests read what the face shows from userData.
function place<T extends Object3D>(o: T, label: Label): T {
  const normal = new Vector3(...label.normal), up = new Vector3(...label.up);
  o.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(new Vector3().crossVectors(up, normal), up, normal));
  o.position.set(...label.position).addScaledVector(normal, 0.002);
  Object.assign(o.userData, { text: label.symbol ?? label.text, value: label.value });
  return o;
}

// One object per die, so its faces cost a single draw call (was one draw per number):
// a BatchedText with every number or, on a symbol die, one mesh with every symbol merged.
function useNumbers(model: Polyhedron, size: number, ink: NumeralInk, printed: boolean) {
  const batch = useMemo((): Object3D & { dispose(): void } => {
    if (printed) {
      // The model carries its own numerals: only invisible anchors, so tests and the showcase still find a face by value.
      const anchors = model.labelList.map((label) => place(new Object3D(), label));
      anchors.forEach((a) => a.updateMatrix());
      return Object.assign(new Object3D(), { dispose: () => {}, userData: { labels: anchors } });
    }
    if (model.labelList.some((l) => l.symbol)) {
      const anchors = model.labelList.map((label) => { const o = place(new Object3D(), label); o.scale.setScalar(model.shape === 'coin' ? 1.02 : size * SYMBOL); o.updateMatrix(); return o; });
      const geometry = mergeGeometries(model.labelList.flatMap((l, i) => (l.symbol ? [symbolGeometry(l.symbol).clone().applyMatrix4(anchors[i].matrix)] : [])));
      const material = new MeshBasicMaterial({ color: ink.color, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
      const mesh = Object.assign(new Mesh(geometry, material), { dispose: () => { geometry.dispose(); material.dispose(); } });
      mesh.userData.labels = anchors;
      return mesh;
    }
    const b = new BatchedText();
    const texts: Text[] = [];
    b.depthOffset = -1;
    b.material = new MeshBasicMaterial({ toneMapped: false });
    for (const label of model.labelList) {
      const t = place(new Text(), label);
      Object.assign(t, { text: label.text, font: FONT_URL, fontSize: size, color: ink.color, anchorX: 'center', anchorY: 'middle', outlineWidth: ink.outline ? '2%' : 0, outlineColor: ink.outline ?? 0 });
      texts.push(t);
      b.add(t);
    }
    b.userData.labels = texts; // BatchedText keeps members out of the scene graph; tests read them here
    b.sync();
    return b;
  }, [model, size, ink, printed]);
  useEffect(() => () => batch.dispose(), [batch]);
  return batch;
}

// The player's model, parsed from the saved file (the loaders are a separate chunk) while the ideal solid stands in.
// STL gives a geometry for the gem material; GLB gives its own meshes, cloned so each die owns its materials.
function useModel(die: CustomDie | undefined) {
  const [model, setModel] = useState<{ id: string; geometry?: BufferGeometry; object?: Object3D } | null>(null);
  useEffect(() => {
    if (!die) return;
    let live = true, clone: Object3D | undefined;
    void carregarModelo(die).then((source) => {
      if (!live) return;
      if (die.file.format === 'stl') { setModel({ id: die.id, geometry: (source as Mesh).geometry }); return; }
      clone = source.clone(true);
      clone.traverse((o) => {
        if (!(o instanceof Mesh)) return;
        o.castShadow = o.receiveShadow = true;
        const own = (Array.isArray(o.material) ? o.material : [o.material]).map((m: Material) => { const c = m.clone(); c.transparent = true; return c; });
        o.material = Array.isArray(o.material) ? own : own[0];
      });
      setModel({ id: die.id, object: clone });
    }, () => { /* keep showing the ideal solid */ });
    return () => {
      live = false;
      clone?.traverse((o) => { if (o instanceof Mesh) for (const m of Array.isArray(o.material) ? o.material : [o.material]) (m as Material).dispose(); });
    };
  }, [die]);
  return die && model?.id === die.id ? model : null;
}

// The die as it shows (gem, numerals, symbols, the player's model and its ink), without a physical body: whoever owns
// the body puts this inside it. `custom` is the imported die's record (undefined for a built-in kind).
export function AparenciaDoDado({ index, kind, color, custom }: { index: number; kind: DieKind; color: string; custom?: CustomDie }) {
  const model = polyhedron(kind);
  const geometry = useMemo(() => {
    const result = new BufferGeometry();
    result.setAttribute('position', new Float32BufferAttribute(model.triangles, 3));
    result.computeVertexNormals();
    return result;
  }, [model]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const file = useModel(custom);
  const finish = custom ? finishOf(custom) : 'gema', ink = custom ? inkColorOf(custom, color) : null;
  const painted = usePainted(file?.geometry, color, ink);
  const gem = useRef<Group>(null);
  const { gl, camera, scene } = useThree();
  // A new material variant (painted numerals, matte) is compiled before it shows, so the first throw does not stall on it;
  // the ideal solid stands in meanwhile. The gem look and a plain model need no wait.
  const variant = file ? `${file.id}|${finish}|${!!ink}` : '';
  const [warm, setWarm] = useState('');
  const needsWarm = !!file && (!!ink || finish === 'fosco');
  useEffect(() => {
    if (!needsWarm || warm === variant || !gem.current) return;
    let live = true;
    void gl.compileAsync(gem.current, camera, scene).catch(() => {}).then(() => { if (live) setWarm(variant); });
    return () => { live = false; };
  }, [needsWarm, warm, variant, gl, camera, scene]);
  useEffect(() => { if (file?.object) paintGlb(file.object, ink); }, [file, ink]);
  const shown = !!file && (!needsWarm || warm === variant);
  const numbers = useNumbers(model, model.font ?? FONT[model.shape], numeralInk(kind, model.shape), !!custom?.printed);
  return (
    <group name={`die-${index}`}>
      {custom ? (
        // gem-i is a group here (a GLB has many meshes): shadows are toggled on its meshes with traverse.
        <group name={`gem-${index}`} ref={gem}>
          {file?.object && <primitive object={file.object} visible={shown} position={custom.fit.center.map((c) => -c * custom.fit.scale)} scale={custom.fit.scale} />}
          {file?.geometry && <mesh geometry={painted ?? file.geometry} visible={shown} position={custom.fit.center.map((c) => -c * custom.fit.scale) as Vec3} scale={custom.fit.scale} castShadow receiveShadow><GemMaterial kind={kind} color={color} finish={finish} painted={!!painted} /></mesh>}
          <mesh geometry={geometry} visible={!shown} castShadow receiveShadow><GemMaterial kind={kind} color={color} /></mesh>
        </group>
      ) : (
        <mesh name={`gem-${index}`} geometry={geometry} castShadow receiveShadow><GemMaterial kind={kind} color={color} /></mesh>
      )}
      <primitive object={numbers} />
    </group>
  );
}
