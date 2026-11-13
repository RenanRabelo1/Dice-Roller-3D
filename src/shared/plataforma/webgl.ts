// Whether this browser can make a WebGL context.
let probed: boolean | undefined // probed once: StrictMode renders twice, and each probe makes a context
export function hasWebGL(): boolean {
  return probed ??= probe()
}
function probe(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    gl?.getExtension('WEBGL_lose_context')?.loseContext() // the probe's context is not kept
    return !!gl
  } catch { return false }
}
