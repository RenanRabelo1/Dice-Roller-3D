// Data-owner rules (rule 2 of the guide, ADR 0006 part B, ADR 0003 points 2 and 5). The owners come from
// the ```json donos-dos-dados block of the module map; the accesses come from the swc AST of each file.
// Heuristic by design: it catches the common case, not a deliberate indirect access (ADR 0006).
import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { parseSync } from '@swc/core';
import { listar, posixDe, texto } from './leitor';
import type { DadoLegado } from './config';

export interface Donos { indexedDB: Record<string, string>; localStorage: Record<string, string>; mongodb: Record<string, string> }
const GRUPOS = ['indexedDB', 'localStorage', 'mongodb'] as const;

/** Rule 1: parses the block, or throws saying what is wrong with it. */
export function lerDonos(md: string, origem: string): Donos {
  const bloco = /^```json donos-dos-dados[ \t]*\r?\n([\s\S]*?)^```[ \t]*\r?$/m.exec(md);
  if (!bloco) throw new Error(`[fonte única] ${origem} não tem o bloco \`\`\`json donos-dos-dados (ADR 0006 parte B). Sem ele o teste não sabe quem é dono de cada dado.`);
  let json: any;
  try { json = JSON.parse(bloco[1]); } catch (e) { throw new Error(`[fonte única] o bloco donos-dos-dados de ${origem} não é JSON válido: ${(e as Error).message} (ADR 0006 parte B).`); }
  const mapa = (v: unknown) => !!v && typeof v === 'object' && !Array.isArray(v) && Object.values(v).every((d) => typeof d === 'string' && d !== '');
  if (!json || typeof json !== 'object' || !GRUPOS.every((g) => mapa(json[g])))
    throw new Error(`[fonte única] o bloco donos-dos-dados de ${origem} precisa de ${GRUPOS.map((g) => `"${g}"`).join(', ')}, cada um { "<dado>": "<módulo dono>" } (ADR 0006 parte B).`);
  return json;
}

/** What one production file touches. `null` is a name that is not a literal. */
export interface Acessos {
  arquivo: string; indexedDB: boolean; storage: boolean; zustand: boolean;
  literais: string[]; chaves: string[]; stores: (string | null)[]; colecoes: (string | null)[]; lookups: (string | null)[];
}

const STORAGE = new Set(['localStorage', 'sessionStorage']);
/** The zustand store factories each entry point exports: the package root re-exports `zustand/vanilla`. */
const FABRICAS_DO_ZUSTAND: Record<string, Set<string>> = {
  zustand: new Set(['create', 'createStore']), 'zustand/vanilla': new Set(['createStore']),
};
const METODOS_DE_CHAVE = new Set(['getItem', 'setItem', 'removeItem']);
const METODOS_DE_COLECAO = new Set(['collection', 'createCollection', 'dropCollection']);
const COMANDOS_DE_COLECAO = ['collMod', 'create', 'drop'];
const nomeDe = (n: any): string | undefined => n?.type === 'Identifier' ? n.value : n?.type === 'Computed' ? texto(n.expression) : texto(n);
const prop = (obj: any, nome: string) => obj?.type === 'ObjectExpression'
  ? obj.properties.find((p: any) => p.type === 'KeyValueProperty' && nomeDe(p.key) === nome)?.value : undefined;
const ehStorage = (n: any) => n?.type === 'Identifier' ? STORAGE.has(n.value) : n?.type === 'MemberExpression' && STORAGE.has(nomeDe(n.property) ?? '');

/** Reads one file's accesses from its AST. */
export function lerAcessosDe(arquivo: string, codigo: string, tsx: boolean): Acessos {
  const a: Acessos = { arquivo, indexedDB: false, storage: false, zustand: false, literais: [], chaves: [], stores: [], colecoes: [], lookups: [] };
  const corpo = parseSync(codigo, { syntax: 'typescript', tsx }).body;
  // A store factory of zustand (`create`, `createStore`), by name or through a namespace (`espacos` maps the
  // namespace to the factories its package exports).
  const creates = new Set<string>(), espacos = new Map<string, Set<string>>();
  for (const d of corpo) {
    if (d.type !== 'ImportDeclaration' || d.typeOnly) continue;
    const fabricas = FABRICAS_DO_ZUSTAND[d.source.value];
    if (fabricas) for (const s of d.specifiers) {
      if (s.type === 'ImportNamespaceSpecifier') espacos.set(s.local.value, fabricas);
      else if (s.type === 'ImportSpecifier' && !s.isTypeOnly && fabricas.has(s.imported?.value ?? s.local.value)) creates.add(s.local.value);
    }
  }
  const arg0 = (n: any) => n.arguments[0]?.expression;
  const visitar = (n: any): void => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { for (const x of n) visitar(x); return; }
    const t = texto(n);
    if (t !== undefined) a.literais.push(t);
    switch (n.type) {
      case 'Identifier':
        if (n.value === 'indexedDB') a.indexedDB = true;
        if (STORAGE.has(n.value)) a.storage = true;
        break;
      case 'MemberExpression': {
        const p = n.property?.type === 'Computed' ? texto(n.property.expression) : undefined;
        if (p === 'indexedDB') a.indexedDB = true;
        if (p && STORAGE.has(p)) a.storage = true;
        break;
      }
      // An object key named like a global is not an access: only the value (and a computed key) is walked.
      case 'KeyValueProperty': {
        const k = nomeDe(n.key);
        if (k === '$lookup' || k === '$graphLookup') a.lookups.push(texto(prop(n.value, 'from')) ?? null);
        if (n.key.type === 'Computed') visitar(n.key);
        else if (texto(n.key) !== undefined) a.literais.push(texto(n.key)!);
        visitar(n.value);
        return;
      }
      case 'CallExpression': {
        const c = n.callee, metodo = c?.type === 'MemberExpression' ? nomeDe(c.property) : undefined;
        if ((c?.type === 'Identifier' && creates.has(c.value)) || (metodo && c.object?.type === 'Identifier' && espacos.get(c.object.value)?.has(metodo))) a.zustand = true;
        if ((c?.type === 'Identifier' && c.value === 'defineStore') || metodo === 'defineStore') a.stores.push(texto(arg0(n)) ?? null);
        if (metodo && METODOS_DE_COLECAO.has(metodo)) a.colecoes.push(texto(arg0(n)) ?? null);
        if (metodo === 'listCollections' && prop(arg0(n), 'name') !== undefined) a.colecoes.push(texto(prop(arg0(n), 'name')) ?? null);
        if (metodo === 'command') for (const k of COMANDOS_DE_COLECAO) if (prop(arg0(n), k) !== undefined) a.colecoes.push(texto(prop(arg0(n), k)) ?? null);
        if (metodo && METODOS_DE_CHAVE.has(metodo) && ehStorage(c.object) && texto(arg0(n)) !== undefined) a.chaves.push(texto(arg0(n))!);
        break;
      }
    }
    for (const k in n) if (k !== 'span' && k !== 'ctxt') visitar(n[k]);
  };
  visitar(corpo);
  return a;
}

/** Every production `.ts`/`.tsx` under `raizes` (relative to `base`), skipping any `tests/` folder. */
export function lerAcessos(raizes: string[], base = process.cwd()): Acessos[] {
  return raizes.flatMap((r) => listar(resolve(base, r)))
    .map((abs) => ({ abs, arquivo: posixDe(relative(base, abs)) }))
    .filter(({ arquivo }) => !arquivo.split('/').includes('tests'))
    .map(({ abs, arquivo }) => lerAcessosDe(arquivo, readFileSync(abs, 'utf8'), abs.endsWith('.tsx')));
}

export interface ViolacaoDeDado { regra: string; arquivo: string; dado: string; dono: string; referencia: string }
export const formatarDado = (v: ViolacaoDeDado) => `[${v.regra}] ${v.arquivo}: ${v.dado} (dono esperado: ${v.dono}; ${v.referencia})`;

const REF = 'regra 2 do guia; ADR 0003 ponto 5; ADR 0006 parte B';
/** The one file outside the modules allowed a zustand store (ADR 0008: the failure lives in shared/plataforma). */
const ZUSTAND_EM_SHARED = 'src/shared/plataforma/falha.ts';
const NAO_DECLARADO = 'nenhum; declare no bloco donos-dos-dados de docs/mapa-modulos.md';
const moduloDe = (f: string) => /^src\/modules\/([^/]+)\//.exec(f)?.[1];
const moduloDoServidor = (f: string) => /^server\/src\/modules\/([^/]+)\//.exec(f)?.[1];
const unicos = (xs: string[]) => [...new Set(xs)].sort();

/** Rules 2 to 5 over the accesses, then rule 6: drops what `excecoes` allows and lists the exceptions nothing used. */
export function conferirDados(todos: Acessos[], donos: Donos, excecoes: DadoLegado[]) {
  const v: ViolacaoDeDado[] = [];
  const add = (regra: string, arquivo: string, dado: string, dono: string, referencia = REF) => v.push({ regra, arquivo, dado, dono, referencia });
  const definicoes = new Map<string, string[]>(Object.keys(donos.indexedDB).map((s) => [s, []]));
  for (const a of todos) {
    const f = a.arquivo;
    // Rule 2: IndexedDB.
    if (a.indexedDB && f !== 'src/shared/db.ts') add('indexedDB fora de src/shared/db.ts', f, 'indexedDB', 'src/shared/db.ts (infra)');
    for (const s of a.stores) {
      const dono = s === null ? undefined : donos.indexedDB[s];
      if (s === null) add('defineStore sem nome literal', f, '<nome não literal>', 'o módulo da store; passe o nome como string literal');
      else if (!dono) add('store do IndexedDB não declarada no mapa', f, s, NAO_DECLARADO);
      else { definicoes.get(s)!.push(f); if (moduloDe(f) !== dono) add('store do IndexedDB fora do módulo dono', f, s, `${dono} (src/modules/${dono}/)`); }
    }
    // Rule 3: localStorage/sessionStorage.
    if (a.storage) {
      const declaradas = unicos(a.literais.filter((l) => l in donos.localStorage));
      const novas = unicos(a.chaves.filter((k) => !(k in donos.localStorage)));
      for (const k of novas) add('chave não declarada no mapa', f, k, NAO_DECLARADO);
      if (!declaradas.length && !novas.length) add('chave não declarada no mapa', f, 'localStorage/sessionStorage', `${NAO_DECLARADO} (nenhum literal de chave do bloco no arquivo)`);
      for (const k of declaradas) {
        const dono = donos.localStorage[k];
        if (f !== `src/modules/${dono}/repository.ts`) add('localStorage/sessionStorage fora do repository.ts do dono', f, k, `${dono} (src/modules/${dono}/repository.ts)`);
      }
    }
    // Rule 4: MongoDB.
    for (const c of a.colecoes) {
      const dono = c === null ? undefined : donos.mongodb[c];
      if (c === null) add('coleção sem nome literal', f, '<nome não literal>', 'o módulo da coleção; passe o nome como string literal');
      else if (!dono) add('coleção não declarada no mapa', f, c, NAO_DECLARADO);
      else if (f !== `server/src/modules/${dono}/repository.ts` && f !== 'server/src/shared/db.ts')
        add('coleção acessada fora do repository.ts do dono', f, c, `${dono} (server/src/modules/${dono}/repository.ts ou server/src/shared/db.ts)`);
    }
    for (const c of a.lookups) {
      const dono = c === null ? undefined : donos.mongodb[c];
      if (c === null) add('$lookup sem from literal', f, '<from não literal>', 'o módulo da coleção; passe o from como string literal');
      else if (!dono) add('coleção não declarada no mapa', f, c, NAO_DECLARADO);
      else if (moduloDoServidor(f) !== dono) add('$lookup para coleção de outro dono (join entre domínios)', f, c, `${dono} (server/src/modules/${dono}/)`);
    }
    // Rule 5: zustand. A store is made only in a module's own `store.ts` (ADR 0003 ponto 2) and in
    // `src/shared/plataforma/falha.ts`, the platform failure's private store that ADR 0008 puts in shared/plataforma.
    if (a.zustand && !/^src\/modules\/[^/]+\/store\.ts$/.test(f) && f !== ZUSTAND_EM_SHARED)
      add(`create/createStore do zustand fora de src/modules/<m>/store.ts e de ${ZUSTAND_EM_SHARED}`, f, 'zustand', `o próprio módulo (src/modules/${moduloDe(f) ?? '<m>'}/store.ts)`, 'regra 2 do guia; ADR 0003 ponto 2; ADR 0006 parte B; ADR 0008');
  }
  for (const [s, fs] of definicoes) if (fs.length !== 1) {
    const dono = donos.indexedDB[s];
    if (!fs.length) add('store do mapa sem defineStore', 'docs/mapa-modulos.md', s, `${dono} (defina-a uma vez em src/modules/${dono}/)`);
    else for (const f of unicos(fs)) add(`store do IndexedDB definida ${fs.length} vezes (${unicos(fs).join(', ')})`, f, s, `${dono} (uma vez, em src/modules/${dono}/)`);
  }
  // Rule 6: named exceptions, both ways.
  const chave = (x: { arquivo: string; dado: string }) => `${x.arquivo}\n${x.dado}`;
  const permitidas = new Set(excecoes.map(chave)), usadas = new Set(v.filter((x) => permitidas.has(chave(x))).map(chave));
  const repetidas = excecoes.filter((e, i) => excecoes.findIndex((o) => chave(o) === chave(e)) !== i);
  return {
    violacoes: v.filter((x) => !permitidas.has(chave(x))).map(formatarDado).sort(),
    semUso: [
      ...excecoes.filter((e) => !usadas.has(chave(e))).map((e) =>
        `[exceção sem uso em DADOS_LEGADO] ${e.arquivo}: ${e.dado} (ADR 0006). O acesso não existe mais: tire a entrada de DADOS_LEGADO em tests/arquitetura/config.ts.`),
      ...repetidas.map((e) => `[exceção repetida em DADOS_LEGADO] ${e.arquivo}: ${e.dado} (ADR 0006). Uma entrada por arquivo e por dado.`),
    ],
    brutas: v,
  };
}
