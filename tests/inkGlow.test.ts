import { describe, expect, it } from 'vitest';
import { BufferGeometry, Float32BufferAttribute, Group, Mesh } from 'three';
import { glowMesh, upInk } from '../src/scene/inkGlow';

const unit = (deg: number): [number, number, number] => [Math.sin((deg * Math.PI) / 180), Math.cos((deg * Math.PI) / 180), 0]; // deg from straight up
const faceAt = (deg: number) => ({ normal: unit(deg), center: unit(deg) });

describe('upInk', () => {
  it('lights a whole engraving by the face it is cut into, whatever the slope of its walls', () => {
    const a = unit(55), tangent = [Math.cos((55 * Math.PI) / 180), -Math.sin((55 * Math.PI) / 180), 0];
    const under = (k: number, s: number) => a.map((v, i) => v * 0.97 + tangent[i] * s + (i === 2 ? k : 0)); // just below face A's plane
    const centers = [...under(0, 0), ...under(0.2, 0.1), ...under(-0.2, -0.1), 0.97, 0, 0]; // the 4th is under a side face
    const faces = [faceAt(55), faceAt(90), faceAt(0)];
    expect(upInk(centers, Uint8Array.from([1, 1, 1, 1]), faces, [0, -1, 0])).toEqual([0, 1, 2]);
    expect(upInk(centers, Uint8Array.from([1, 0, 1, 1]), faces, [0, -1, 0])).toEqual([0, 2]); // plain triangles never
  });
});

describe('glowMesh', () => {
  const build = (mask: number[]) => {
    const g = new BufferGeometry();
    // triangle 0 lies in y=0 facing +y; triangle 1 lies in x=0 facing +x
    g.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1], 3));
    g.setAttribute('normal', new Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0], 3));
    g.userData.ink = Uint8Array.from(mask);
    const mesh = new Mesh(g);
    mesh.position.set(1, 0, 0); mesh.scale.setScalar(2);
    const group = new Group(); group.add(mesh);
    return group;
  };
  it('collects the up-facing ink in group space, lifted off the surface', () => {
    const group = build([1, 1]);
    const glow = glowMesh(group, group, [{ normal: [0, 1, 0], center: [0, 1, 0] }], [0, -1, 0], '#fff')!;
    expect(glow.geometry.getAttribute('position').count).toBe(6); // both triangles: the whole engraving, even the one on its side
    const p = glow.geometry.getAttribute('position');
    expect([p.getX(0), p.getY(0), p.getZ(0)].map((v) => +v.toFixed(3))).toEqual([1, 0.004, 0]);
    expect([p.getX(2), p.getY(2), p.getZ(2)].map((v) => +v.toFixed(3))).toEqual([3, 0.004, 0]);
  });
  it('is null when nothing qualifies', () => {
    const group = build([0, 0]);
    expect(glowMesh(group, group, [{ normal: [0, 1, 0], center: [0, 1, 0] }], [0, -1, 0], '#fff')).toBeNull();
    const inked = build([1, 1]);
    expect(glowMesh(inked, inked, [{ normal: [0, 1, 0], center: [0, 1, 0] }], [0, 1, 0], '#fff')).toBeNull(); // face looking down
  });
});
