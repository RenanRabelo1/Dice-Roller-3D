// Whether this browser can make a WebGL context.
let probed: boolean | undefined // probed once: StrictMode renders twice, and each probe makes a context
let renderer = ''
export function hasWebGL(): boolean {
  return probed ??= probe()
}
// The GPU name the probe saw (empty without WebGL). Read by perfil.ts, after hasWebGL().
export function rendererDoTeste(): string { return renderer }
function probe(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    if (gl) {
      const info = gl.getExtension('WEBGL_debug_renderer_info')
      renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? '')
    }
    gl?.getExtension('WEBGL_lose_context')?.loseContext() // the probe's context is not kept
    return !!gl
  } catch { return false }
}
