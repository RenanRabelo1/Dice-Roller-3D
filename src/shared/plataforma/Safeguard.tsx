import { Component, type ErrorInfo, type ReactNode } from 'react'
import { falha, registrarFalha, useFalha, type Falha } from './falha.ts'

// What the player reads when the 3D side cannot run (R10). Messages in pt-BR; `falha()` says which one.
const FAILURE: Record<Falha, string> = {
  webgl: 'Este navegador não tem WebGL ativo. Abra no Chrome, Edge ou Firefox atualizados.',
  graphics: 'O 3D falhou neste navegador. Recarregue a página.',
  physics: 'Não foi possível carregar a física. Recarregue a página.',
}

// Catches a render/load failure below it, records it and shows nothing (the App shows the message).
// `kind` is what this boundary's failures mean: around the Canvas it is the renderer, around <Physics> the physics.
export class Guard extends Component<{ kind: 'graphics' | 'physics'; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${this.props.kind}]`, error, info.componentStack)
    // The innermost boundary speaks first: a physics failure must not be relabelled as a renderer one.
    if (!falha()) registrarFalha(this.props.kind)
  }
  render() { return this.state.failed ? null : this.props.children }
}

export function Failure() {
  const error = useFalha()
  if (!error) return null
  return <p className="failure" role="alert" data-testid="failure">{FAILURE[error]}</p>
}
