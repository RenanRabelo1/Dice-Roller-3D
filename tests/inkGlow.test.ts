import { describe, expect, it } from 'vitest';
import { BufferGeometry, Float32BufferAttribute, Group, Mesh } from 'three';
import { glowMesh, upInk } from '../src/scene/inkGlow';

const normals = [0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0.7071, 0.7071];

describe('upInk', () => {
  it('keeps inked triangles that face up', () => {
    const mask = Uint8Array.from([1, 1, 0, 1]);
    expect(upInk(normals, mask, [0, -1, 0])).toEqual([0, 3]);
    expect(upInk(normals, mask, [-1, 0, 0])).toEqual([1]);
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
    const glow = glowMesh(group, group, [0, -1, 0], '#fff')!;
    expect(glow.geometry.getAttribute('position').count).toBe(3);
    const p = glow.geometry.getAttribute('position');
    expect([p.getX(0), p.getY(0), p.getZ(0)].map((v) => +v.toFixed(3))).toEqual([1, 0.004, 0]);
    expect([p.getX(2), p.getY(2), p.getZ(2)].map((v) => +v.toFixed(3))).toEqual([3, 0.004, 0]);
  });
  it('is null when nothing qualifies', () => {
    const group = build([0, 0]);
    expect(glowMesh(group, group, [0, -1, 0], '#fff')).toBeNull();
  });
});
