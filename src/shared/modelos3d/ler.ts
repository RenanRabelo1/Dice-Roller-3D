import { LoadingManager, Mesh, Vector3, type BufferGeometry, type Material, type Object3D, type Texture } from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// Reads a 3D model (.stl / .glb) into triangles and an object. Nothing comes from the network, and every limit
// arrives from the caller (ADR 0008): this module knows no domain. Pure: tested in Node.

export class ModelError extends Error {} // the message is shown to the player, in pt-BR
export type ModelFormat = 'stl' | 'glb'
export interface Model { positions: Float32Array; triangles: number; object: Object3D } // positions: 9 floats per triangle

export const formatOf = (name: string): ModelFormat | null => {
  const ext = name.toLowerCase().split('.').pop()
  return ext === 'stl' || ext === 'glb' ? ext : null
}

function collect(root: Object3D): { positions: Float32Array; triangles: number } {
  root.updateWorldMatrix(true, true)
  const out: number[] = []
  const v = new Vector3()
  root.traverse((o) => {
    if (!(o instanceof Mesh)) return
    const g = o.geometry as BufferGeometry, pos = g.getAttribute('position')
    const at = (i: number) => { v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); out.push(v.x, v.y, v.z) }
    if (g.index) for (let i = 0; i + 2 < g.index.count; i += 3) for (let k = 0; k < 3; k++) at(g.index.getX(i + k))
    else for (let i = 0; i + 2 < pos.count; i += 3) for (let k = 0; k < 3; k++) at(i + k)
  })
  return { positions: Float32Array.from(out), triangles: out.length / 9 }
}

const refuse = (what: string) => new ModelError(`O arquivo ${what}.`)

// `textureMax` is the biggest texture side, in px, allowed on each mesh.
export async function parseGlb(bytes: ArrayBuffer, textureMax: (mesh: Mesh) => number): Promise<Object3D> {
  // Nothing may come from the network: only data:/blob: URLs load, anything else fails the parse.
  const manager = new LoadingManager()
  manager.setURLModifier((url) => {
    if (/^(data|blob):/i.test(url)) return url
    throw new ModelError('O GLB precisa ser autocontido (sem arquivos externos).')
  })
  const gltf = await new GLTFLoader(manager).parseAsync(bytes, '')
  gltf.scene.traverse((o) => {
    if (!(o instanceof Mesh)) return
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      for (const t of Object.values(m as Material & Record<string, unknown>)) {
        const img = t && (t as Texture).isTexture ? ((t as Texture).image as { width?: number; height?: number } | null) : null
        if (img && Math.max(img.width ?? 0, img.height ?? 0) > textureMax(o)) throw new ModelError(`Textura maior que ${textureMax(o)} px no modelo.`)
      }
    }
  })
  return gltf.scene
}

export async function readModel(bytes: ArrayBuffer, format: ModelFormat, limits: { bytes: number; triangles: number; texture: number }): Promise<Model> {
  if (bytes.byteLength > limits.bytes) throw refuse(`passa de ${limits.bytes / 1024 / 1024} MB`)
  if (!bytes.byteLength) throw refuse('está vazio')
  let object: Object3D
  try {
    if (format === 'stl') {
      const geometry = new STLLoader().parse(bytes)
      geometry.computeVertexNormals() // many exporters leave the normals zero
      object = new Mesh(geometry)
    } else object = await parseGlb(bytes, () => limits.texture)
  } catch (e) {
    if (e instanceof ModelError) throw e
    throw refuse(`não parece um ${format.toUpperCase()} válido`)
  }
  const { positions, triangles } = collect(object)
  if (!triangles) throw refuse('não tem nenhum triângulo')
  if (triangles > limits.triangles) throw refuse(`tem ${triangles} triângulos; o máximo é ${limits.triangles}`)
  return { positions, triangles, object }
}
