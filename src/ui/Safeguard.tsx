import { Component, type ErrorInfo, type ReactNode } from 'react';
import { FAILURE } from '../failure';
import { useDice } from '../store';

// Catches a render/load failure below it, records it in the store and shows nothing (the App shows the message).
// `kind` is what this boundary's failures mean: around the Canvas it is the renderer, around <Physics> the physics.
export class Guard extends Component<{ kind: 'graphics' | 'physics'; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${this.props.kind}]`, error, info.componentStack);
    // The innermost boundary speaks first: a physics failure must not be relabelled as a renderer one.
    if (!useDice.getState().error) useDice.getState().setError(this.props.kind);
  }
  render() { return this.state.failed ? null : this.props.children; }
}

export function Failure() {
  const error = useDice((s) => s.error);
  if (!error) return null;
  return <p className="failure" role="alert" data-testid="failure">{FAILURE[error]}</p>;
}
