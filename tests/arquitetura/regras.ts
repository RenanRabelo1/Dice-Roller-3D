// Architecture rules over the reader's graph (ADR 0006 part A, ADR 0009). Each rule returns its
// violations; the tests only print them. Exceptions live in `config.ts`.
import { dentro, type Aresta, type Grafo } from './leitor';
import {
  PACOTES_PROIBIDOS_EM_REGRAS, REGRAS_TESTES_PODEM_IMPORTAR, SERVIDOR_PODE_IMPORTAR, type CicloConhecido, type Nivel,
} from './config';

export interface Violacao { regra: string; de: string; para: string; referencia: string }
export const formatar = (v: Violacao) => `[${v.regra}] ${v.de} → ${v.para} (${v.referencia})`;

const internas = (g: Grafo) => g.arestas.filter((a) => !a.externo);
const ehCasca = (f: string) => f === 'src/main.tsx' || f === 'src/App.tsx' || dentro('src/app', f);
const moduloDe = (f: string) => /^src\/modules\/([^/]+)\//.exec(f)?.[1];
const violacao = (regra: string, referencia: string) => (a: Aresta): Violacao => ({ regra, de: a.de, para: a.para, referencia });

// ---- Cycles (rule 4) ----

/** Unit of the `pasta` level: `src/modules/<m>`, `src/<pasta>` or the root file itself; the same
 * inside `server/src` (`server/src/modules/<m>`, `server/src/<pasta>`). */
export const unidade = (f: string) => /^(server\/)?src\/(modules\/[^/]+|[^/]+)\//.exec(f)?.[0].slice(0, -1) ?? f;

export interface Ciclo { nivel: Nivel; membros: string[]; caminho: string[] }

/** Tarjan's strongly connected components; keeps those with 2+ nodes or a self-edge. */
function componentes(viz: Map<string, Set<string>>): string[][] {
  let proximo = 0;
  const indice = new Map<string, number>(), baixo = new Map<string, number>(), pilha: string[] = [], naPilha = new Set<string>();
  const saida: string[][] = [];
  const visitar = (v: string) => {
    indice.set(v, proximo); baixo.set(v, proximo++); pilha.push(v); naPilha.add(v);
    for (const w of viz.get(v) ?? []) {
      if (!indice.has(w)) { visitar(w); baixo.set(v, Math.min(baixo.get(v)!, baixo.get(w)!)); }
      else if (naPilha.has(w)) baixo.set(v, Math.min(baixo.get(v)!, indice.get(w)!));
    }
    if (baixo.get(v) !== indice.get(v)) return;
    const comp: string[] = [];
    let w: string;
    do { w = pilha.pop()!; naPilha.delete(w); comp.push(w); } while (w !== v);
    if (comp.length > 1 || viz.get(v)?.has(v)) saida.push(comp.sort());
  };
  for (const v of viz.keys()) if (!indice.has(v)) visitar(v);
  return saida;
}

/** One concrete loop inside a component (BFS from its first member back to it), for the message. */
function caminhoDe(viz: Map<string, Set<string>>, comp: string[]): string[] {
  const dentroDoComp = new Set(comp), origem = comp[0], pai = new Map<string, string>(), fila = [origem];
  while (fila.length) {
    const v = fila.shift()!;
    for (const w of viz.get(v) ?? []) {
      if (w === origem) { const c = [origem]; for (let x = v; x !== origem; x = pai.get(x)!) c.splice(1, 0, x); return [...c, origem]; }
      if (dentroDoComp.has(w) && !pai.has(w)) { pai.set(w, v); fila.push(w); }
    }
  }
  return comp;
}

const lido = (f: string) => dentro('src', f) || dentro('server/src', f);

/** Cycles in `src/` and `server/src` (and across them), counting type-only, dynamic and worker-URL edges. */
export function ciclos(g: Grafo, nivel: Nivel): Ciclo[] {
  const viz = new Map<string, Set<string>>();
  for (const a of internas(g)) {
    if (!lido(a.de) || !lido(a.para)) continue;
    const de = nivel === 'arquivo' ? a.de : unidade(a.de), para = nivel === 'arquivo' ? a.para : unidade(a.para);
    if (nivel === 'pasta' && de === para) continue;
    if (!viz.has(de)) viz.set(de, new Set());
    viz.get(de)!.add(para);
  }
  return componentes(viz).map((membros) => ({ nivel, membros, caminho: caminhoDe(viz, membros) }))
    .sort((a, b) => a.membros[0].localeCompare(b.membros[0]));
}

const chave = (c: { nivel: Nivel; membros: string[] }) => `${c.nivel}: ${[...c.membros].sort().join(' ↔ ')}`;

/** Compares the cycles found with the known list, both ways. */
export function conferirCiclos(atuais: Ciclo[], conhecidos: CicloConhecido[]) {
  const listados = new Set(conhecidos.map(chave)), achados = new Set(atuais.map(chave));
  return {
    novos: atuais.filter((c) => !listados.has(chave(c))).map((c) =>
      `[ciclo fora de CICLOS_CONHECIDOS, nível ${c.nivel}] ${c.caminho.join(' → ')} (regra 4 do guia; ADR 0006). ` +
      `Desfaça o ciclo; se ele mudou de forma, atualize a entrada, citando o mapa ou o plano.`),
    sumidos: conhecidos.filter((c) => !achados.has(chave(c))).map((c) =>
      `[ciclo conhecido que não existe mais, nível ${c.nivel}] ${c.membros.join(' ↔ ')} (regra 4 do guia; ADR 0006). ` +
      `Tire a entrada de CICLOS_CONHECIDOS em tests/arquitetura/config.ts.`),
  };
}

// ---- Imports (rule 1 and the ADRs) ----

/** `src/shared/**` imports nothing from `src/` outside `src/shared/` (shell, legacy or modules). */
export const sharedIsolado = (g: Grafo) => internas(g)
  .filter((a) => dentro('src/shared', a.de) && dentro('src', a.para) && !dentro('src/shared', a.para))
  .map(violacao('shared importa fora de src/shared', 'regra 1 do guia; ADR 0006'));

/** From another module only its doors: `index.ts` (pure), `cena.ts` (components and hooks, ADR 0010), or its
 * `contracts.ts` as `import type`. */
export const portaUnica = (g: Grafo) => internas(g).filter((a) => {
  const de = moduloDe(a.de), para = moduloDe(a.para);
  if (!de || !para || de === para) return false;
  const arquivo = a.para.slice(`src/modules/${para}/`.length);
  return !(arquivo === 'index.ts' || arquivo === 'cena.ts' || (arquivo === 'contracts.ts' && a.soTipo));
}).map(violacao('porta única: de outro módulo só index.ts, cena.ts, ou contracts.ts com import type', 'regra 1 do guia; ADR 0006; ADR 0010'));

const ehReact = (p: string) => p === 'react' || p.startsWith('react/') || p.startsWith('@react-three/');

/** The closure of each module's `index.ts` (the files of its own module it reaches, `import()` included) imports
 * neither `react` nor `@react-three/*`: the worker and the Node tests load only the pure half (ADR 0010).
 * `import type` is erased, so it is neither followed nor counted. */
export const indexSemReact = (g: Grafo) => {
  const saidas = new Map<string, Aresta[]>();
  for (const a of g.arestas) if (!a.soTipo) saidas.set(a.de, [...(saidas.get(a.de) ?? []), a]);
  const viu = new Set<string>(), erros: Aresta[] = [];
  for (const porta of g.arquivos.filter((f) => /^src\/modules\/[^/]+\/index\.ts$/.test(f))) {
    const m = moduloDe(porta), fila = [porta];
    while (fila.length) {
      const f = fila.shift()!;
      if (viu.has(f)) continue;
      viu.add(f);
      for (const a of saidas.get(f) ?? []) {
        if (a.externo) { if (ehReact(a.para)) erros.push(a); }
        else if (moduloDe(a.para) === m) fila.push(a.para);
      }
    }
  }
  return erros.map(violacao('index.ts alcança react ou @react-three/* dentro do módulo', 'ADR 0010'));
};

/** No module imports the shell (`src/main.tsx`, `src/App.tsx`, `src/app/**`). */
export const semCasca = (g: Grafo) => internas(g).filter((a) => moduloDe(a.de) && ehCasca(a.para))
  .map(violacao('módulo importa a casca', 'regra 1 do guia; ADR 0006'));

/** A module file imports, inside `src/`, only its own module, another module (its doors, `index.ts` or `cena.ts`: see
 * `portaUnica`) or
 * `src/shared/**`. Importing the shell, or any other file outside the modules and `src/shared`, fails (today only the
 * shell is there; the rule also catches any file that appears outside them).
 * Packages and the server (`fronteiraDoServidor`) are outside `src/`, so not this rule's. */
export const moduloSemLegado = (g: Grafo) => internas(g).filter((a) => {
  const m = moduloDe(a.de);
  return !!m && dentro('src', a.para) && !moduloDe(a.para) && !dentro('src/shared', a.para);
}).map(violacao('módulo extraído importa arquivo do legado ou da casca', 'plano-refatoracao.md §3, "Convivência com o legado"; ADR 0006'));

const ehProibidoEmRegras = (p: string) => PACOTES_PROIBIDOS_EM_REGRAS.some((x) => x.endsWith('/') ? p.startsWith(x) : p === x || p.startsWith(`${x}/`));

/** `src/modules/regras/**` imports nothing outside itself: no package, no other file (ADR 0002). */
export const regrasPuras = (g: Grafo) => g.arestas.filter((a) => {
  if (!dentro('src/modules/regras', a.de)) return false;
  if (!a.externo) return !dentro('src/modules/regras', a.para);
  return !(dentro('src/modules/regras/tests', a.de) && REGRAS_TESTES_PODEM_IMPORTAR.includes(a.para));
}).map((a) => violacao(
  a.externo && ehProibidoEmRegras(a.para) ? 'regras importa biblioteca de cena, física ou estado' : 'regras importa algo fora do próprio módulo',
  'ADR 0002; ADR 0006')(a));

/** `server/**` → `src/**` only through `SERVIDOR_PODE_IMPORTAR`; `src/**` → `server/**` only as
 * `import type` of `server/src/modules/<m>/contracts.ts` (ADR 0004). */
export const fronteiraDoServidor = (g: Grafo) => [
  ...internas(g).filter((a) => dentro('server', a.de) && dentro('src', a.para) && !SERVIDOR_PODE_IMPORTAR.includes(a.para))
    .map(violacao('servidor importa de src/ fora de SERVIDOR_PODE_IMPORTAR', 'ADR 0002; ADR 0004; ADR 0006')),
  ...internas(g).filter((a) => dentro('src', a.de) && dentro('server', a.para) && !(a.soTipo && /^server\/src\/modules\/[^/]+\/contracts\.ts$/.test(a.para)))
    .map(violacao('src importa do servidor sem ser import type de contracts.ts', 'ADR 0004; ADR 0006')),
];

/** A server module's `routes.ts` imports only its own `service.ts`, `contracts.ts` or `repository.ts`,
 * or something of `server/src/shared/` (ADR 0006; OS-0018). Packages (fastify) are not edges here. */
export const rotasDoServidor = (g: Grafo) => internas(g).filter((a) => {
  const m = /^server\/src\/modules\/([^/]+)\/routes\.ts$/.exec(a.de)?.[1];
  if (!m) return false;
  const proprios = ['service.ts', 'contracts.ts', 'repository.ts'].map((f) => `server/src/modules/${m}/${f}`);
  return !(proprios.includes(a.para) || dentro('server/src/shared', a.para));
}).map(violacao('routes.ts do servidor importa fora do próprio service/contracts/repository e de server/src/shared', 'ADR 0006'));

const ehMongodb = (p: string) => p === 'mongodb' || p.startsWith('mongodb/');
const podeImportarMongodb = (f: string) => /^server\/src\/modules\/[^/]+\/repository\.ts$/.test(f) || f === 'server/src/shared/db.ts'
  // The server's test files build their own in-memory database; only `server/src/**/tests/` is let through.
  || /^server\/src\/(.+\/)?tests\//.test(f);

/** `mongodb` is imported only by a module's `repository.ts` and by `server/src/shared/db.ts` (ADR 0006). */
export const mongodbSoNoRepositorio = (g: Grafo) => g.arestas.filter((a) => a.externo && ehMongodb(a.para) && !podeImportarMongodb(a.de))
  .map(violacao('mongodb importado fora de repository.ts e de server/src/shared/db.ts', 'ADR 0006'));

export const REGRAS = { sharedIsolado, portaUnica, indexSemReact, semCasca, moduloSemLegado, regrasPuras, fronteiraDoServidor, rotasDoServidor, mongodbSoNoRepositorio };
