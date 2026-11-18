import { BufferGeometry, Float32BufferAttribute, SphereGeometry, Vector3 } from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Vec3 } from '../../../shared/math.ts';

export function soldar(partes: BufferGeometry[]) {
  for (const parte of partes) {
    parte.deleteAttribute('uv');
    parte.deleteAttribute('normal');
  }
  const juntadas = mergeGeometries(partes);
  partes.forEach((parte) => parte.dispose());
  if (!juntadas) throw new Error('Não foi possível juntar as geometrias do presságio');
  const geometry = mergeVertices(juntadas, 1e-6);
  juntadas.dispose();
  geometry.computeVertexNormals();
  return geometry;
}

export function superficie(colunas: number, linhas: number, ponto: (u: number, v: number) => Vec3) {
  const positions: number[] = [], indices: number[] = [];
  for (let row = 0; row <= linhas; row++) for (let col = 0; col <= colunas; col++) {
    positions.push(...ponto(col / colunas, row / linhas));
    const i = row * (colunas + 1) + col, next = i + colunas + 1;
    if (row < linhas && col < colunas) indices.push(i, i + 1, next, i + 1, next + 1, next);
  }
  return new BufferGeometry().setAttribute('position', new Float32BufferAttribute(positions, 3)).setIndex(indices);
}

export function elipsoide(p: Vec3, s: Vec3, angle = 0, cols = 32, rows = 24) {
  const g = new SphereGeometry(1, cols, rows);
  const pos = g.getAttribute('position'), point = new Vector3();
  // Take samples at uniform angles of the surface normal, concentrating vertices
  // where a flattened ellipsoid curves fastest.
  for (let i = 0; i < pos.count; i++) {
    point.fromBufferAttribute(pos, i);
    const d = Math.hypot(point.x * s[0], point.y * s[1], point.z * s[2]);
    pos.setXYZ(i, point.x * s[0] ** 2 / d, point.y * s[1] ** 2 / d, point.z * s[2] ** 2 / d);
  }
  return g.rotateZ(angle).translate(...p);
}
