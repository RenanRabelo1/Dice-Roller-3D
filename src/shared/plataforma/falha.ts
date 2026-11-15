import { create } from 'zustand'

// The platform failure that keeps the 3D side from running (ADR 0008). It lives in its own store, private to this
// file: callers record it and read it only through the functions below.
export type Falha = 'webgl' | 'graphics' | 'physics'

const store = create<{ falha: Falha | null }>(() => ({ falha: null }))

export const falha = (): Falha | null => store.getState().falha
export const useFalha = (): Falha | null => store((s) => s.falha)
// Overwrites whatever was recorded; null clears it. "The first one wins" is the Guard's rule, not this one's.
export const registrarFalha = (f: Falha | null) => { store.setState({ falha: f }) }
