// inspecao(cena): the omen's fields of the test hook (OS-0040), the same calculation the shell's hook made before.
import { beforeEach, describe, expect, it } from 'vitest';
import { BufferAttribute, BufferGeometry, Group, Mesh, Object3D } from 'three';
import { input, publish, reiniciar, arremesso } from '../../arremesso/index.ts';
import { definir } from '../../selecao/index.ts';
import { definirMovimentoReduzido } from '../../../shared/plataforma/index.ts';
import { inspecao, setOmenDone } from '../index.ts';
import { store } from '../store.ts';

const P = { kind: 'pointer', id: 1 } as const;
const arremessar = (results: number[]) => {
  reiniciar();
  input({ type: 'press', source: P, at: 0, repeat: false });
  input({ type: 'release', source: P, at: 700 });
  const throwId = arremesso().throwId;
  publish(throwId, results);
  return throwId;
};
const nomeado = <T extends Object3D>(o: T, name: string, visible = true) => Object.assign(o, { name, visible });

beforeEach(() => { definir(['d20']); store.setState(store.getInitialState(), true); definirMovimentoReduzido(false); });

describe('inspecao: the omen as the test hook reads it', () => {
  it('an empty scene and no omen', () => {
    reiniciar();
    expect(inspecao(new Object3D())).toMatchObject({ omen: null, omenDone: 0, trayBroken: false, burning: false, shards: null });
  });
  it('the omen of the current throw only, its clock and omenDone', () => {
    const throwId = arremessar([20]);
    const antes = performance.now() - store.getState().omenAt;
    const lido = inspecao(new Object3D());
    expect(lido.omen).toBe('crit');
    expect(lido.omenTime).toBeGreaterThanOrEqual(antes);
    setOmenDone(throwId);
    expect(inspecao(new Object3D()).omenDone).toBe(throwId);
    store.setState({ omen: { throwId: throwId - 1, crits: [0], fumbles: [] } });
    expect(inspecao(new Object3D()).omen).toBeNull();
  });
  it('the broken floor, the fire and the first shard\'s colours, off the scene', () => {
    const cena = new Group(), cacos = nomeado(new Group(), 'kraken-fragments'), geo = new BufferGeometry();
    geo.setAttribute('color', new BufferAttribute(new Float32Array([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]), 3));
    cacos.add(new Mesh(geo));
    cena.add(nomeado(new Object3D(), 'tray-surface', false), nomeado(new Object3D(), 'fire'), cacos);
    expect(inspecao(cena)).toMatchObject({ trayBroken: true, burning: true, shards: { felt: '#ff0000', wood: '#0000ff' } });
  });
  it('reports the Vampire type for the current throw', () => {
    definir(['hunger']);
    arremessar([10]);
    const cena = new Object3D();
    expect(inspecao(cena)).toMatchObject({ omen: null, vampiro: 'critico-bestial' });
    reiniciar();
    expect(inspecao(cena).vampiro).toBeNull();
  });
});
