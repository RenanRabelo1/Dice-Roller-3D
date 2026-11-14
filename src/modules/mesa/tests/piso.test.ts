import { afterEach, describe, expect, it } from 'vitest';
import { Object3D } from 'three';
import { ocultarPiso } from '../index.ts';
import { pisoEstaOculto, registrarPiso } from '../scene/piso.ts';

describe('ocultarPiso', () => {
  afterEach(() => { registrarPiso(null); ocultarPiso(false); });

  it('keeps the flag even with no floor in the scene', () => {
    ocultarPiso(true);
    expect(pisoEstaOculto()).toBe(true);
    ocultarPiso(false);
    expect(pisoEstaOculto()).toBe(false);
  });

  it('applies at once to the current floor', () => {
    const piso = new Object3D();
    registrarPiso(piso);
    ocultarPiso(true);
    expect(piso.visible).toBe(false);
    ocultarPiso(false);
    expect(piso.visible).toBe(true);
  });

  it('a new floor inherits the flag, and the one that left is no longer touched', () => {
    const antigo = new Object3D(), novo = new Object3D();
    registrarPiso(antigo);
    ocultarPiso(true);
    // The table changes mid-break: MesaNaCena gives the old floor back whole and registers the new one.
    registrarPiso(null); antigo.visible = true;
    registrarPiso(novo);
    expect(novo.visible).toBe(false);
    ocultarPiso(true);
    expect(antigo.visible).toBe(true);
    ocultarPiso(false);
    expect(novo.visible).toBe(true);
  });
});
