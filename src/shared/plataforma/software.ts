// Set when the renderer is a software one (SwiftShader), so heavy work can scale itself down.
let software = false
export const marcarRenderizadorPorSoftware = () => { software = true }
export const renderizadorPorSoftware = (): boolean => software
