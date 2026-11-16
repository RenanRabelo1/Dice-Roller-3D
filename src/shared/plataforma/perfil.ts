// The device profile (ADR 0011): decided once, before the canvas, and never changed in the session.
import { hasWebGL, rendererDoTeste } from './webgl.ts'

export type Perfil = 'completo' | 'leve'

// Pure: the order is the criterion. Without `memoria` (only Chromium has deviceMemory) steps 3 and 4 never pull to leve.
export function decidirPerfil(entrada: { busca: string; renderer: string; memoria?: number; nucleos?: number }): Perfil {
  const pedido = new URLSearchParams(entrada.busca).get('perfil')
  if (pedido === 'leve' || pedido === 'completo') return pedido
  if (/swiftshader|llvmpipe|software/i.test(entrada.renderer)) return 'leve'
  const { memoria, nucleos } = entrada
  if (memoria !== undefined && memoria <= 2) return 'leve'
  if (memoria !== undefined && memoria <= 4 && nucleos !== undefined && nucleos <= 4) return 'leve'
  return 'completo'
}

let decidido: Perfil | undefined
export function perfil(): Perfil {
  if (decidido) return decidido
  hasWebGL() // the probe reads the renderer name
  const nav = navigator as Navigator & { deviceMemory?: number }
  return decidido = decidirPerfil({ busca: location.search, renderer: rendererDoTeste(), memoria: nav.deviceMemory, nucleos: nav.hardwareConcurrency })
}
export const perfilLeve = () => perfil() === 'leve'
