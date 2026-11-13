// The door of shared/plataforma (ADR 0008): the rest of the client imports from here, never from a file inside.
export { falha, registrarFalha, useFalha, type Falha } from './falha.ts'
export { Failure, Guard } from './Safeguard.tsx'
export { hasWebGL } from './webgl.ts'
export { marcarRenderizadorPorSoftware, renderizadorPorSoftware } from './software.ts'
