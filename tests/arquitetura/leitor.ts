// Import reader for the architecture tests (ADR 0009): swc AST in, file graph out.
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, join, posix, relative, resolve, sep } from 'node:path';
import { parseSync } from '@swc/core';

export type Tipo = 'import' | 'export' | 'dinamico' | 'url';
/** One edge. `para` is a repo-relative path (`externo: false`) or a package name (`externo: true`). */
export interface Aresta { de: string; para: string; tipo: Tipo; soTipo: boolean; externo: boolean }
export interface Grafo { arquivos: string[]; arestas: Aresta[] }
/** A raw edge; `problema` marks one the reader refuses (it makes `lerGrafo` throw). */
interface Bruta { especificador: string; tipo: Tipo; soTipo: boolean; problema?: string }

const CODIGO = /\.tsx?$/;
export const posixDe = (p: string) => p.split(sep).join('/');
/** Value of a string literal or of a template literal without expressions. */
export const texto = (n: any): string | undefined =>
  n?.type === 'StringLiteral' ? n.value
  : n?.type === 'TemplateLiteral' && n.expressions?.length === 0 ? n.quasis[0].cooked : undefined; // a template type has no `expressions`
const ehImportMetaUrl = (n: any) =>
  n?.type === 'MemberExpression' && n.object?.type === 'MetaProperty' && n.object.kind === 'import.meta' && n.property?.value === 'url';

/** Raw edges of one source file. Only `import type`/`export type` count as type-only: with
 * `verbatimModuleSyntax`, `import { type X }` still loads the module at runtime. */
export function lerArestas(codigo: string, tsx: boolean): Bruta[] {
  const saida: Bruta[] = [];
  const visitar = (n: any): void => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { for (const x of n) visitar(x); return; }
    switch (n.type) {
      case 'ImportDeclaration': saida.push({ especificador: n.source.value, tipo: 'import', soTipo: !!n.typeOnly }); break;
      case 'ExportNamedDeclaration': case 'ExportAllDeclaration':
        if (n.source) saida.push({ especificador: n.source.value, tipo: 'export', soTipo: !!n.typeOnly }); break;
      case 'TsImportType': saida.push({ especificador: n.argument.value, tipo: 'import', soTipo: true }); break;
      // import() with a computed argument cannot be followed, so it is refused, not skipped.
      case 'CallExpression': {
        if (n.callee?.type !== 'Import') break;
        const arg = n.arguments[0]?.expression, alvo = texto(arg);
        saida.push(alvo !== undefined ? { especificador: alvo, tipo: 'dinamico', soTipo: false }
          : { especificador: `<${arg?.type ?? 'vazio'}>`, tipo: 'dinamico', soTipo: false, problema: 'import() sem string literal' });
        break;
      }
      // new URL('./x', import.meta.url), alone or inside new Worker(...): the walk reaches both.
      case 'NewExpression': {
        const alvo = n.callee?.type === 'Identifier' && n.callee.value === 'URL' && ehImportMetaUrl(n.arguments?.[1]?.expression)
          ? texto(n.arguments[0].expression) : undefined;
        if (alvo?.startsWith('.')) saida.push({ especificador: alvo, tipo: 'url', soTipo: false });
        break;
      }
    }
    for (const k in n) if (k !== 'span' && k !== 'ctxt') visitar(n[k]);
  };
  visitar(parseSync(codigo, { syntax: 'typescript', tsx }).body);
  return saida;
}

/** Resolves a relative specifier: exact file, then `.ts`/`.tsx`, then `index.ts`/`index.tsx`.
 * Returns the absolute path (code or not), or `null`. */
export function resolver(deArquivo: string, especificador: string): string | null {
  const base = resolve(dirname(deArquivo), especificador.replace(/[?#].*$/, ''));
  const ehArquivo = (p: string) => existsSync(p) && statSync(p).isFile();
  for (const c of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')]) if (ehArquivo(c)) return c;
  return null;
}

export const listar = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.name === 'node_modules' ? [] : e.isDirectory() ? listar(join(dir, e.name)) : CODIGO.test(e.name) ? [join(dir, e.name)] : []);

/** Reads every `.ts`/`.tsx` under `raizes` (relative to `base`). Paths in the graph are relative
 * to `base`, with `/`. Non-code targets (css, images) are dropped. Throws, listing every case, on:
 * a relative import that does not resolve; one whose case differs from the disk (Windows accepts
 * it, Linux does not); an absolute `/...` specifier (Vite root path); an `import()` without a string
 * literal. There are no tsconfig `paths` aliases today; if one is added, refuse it here as well. */
export function lerGrafo(raizes: string[], base = process.cwd()): Grafo {
  const arquivos = raizes.flatMap((r) => listar(resolve(base, r)));
  const rel = (p: string) => posixDe(relative(base, p));
  const arestas: Aresta[] = [], problemas: string[] = [];
  for (const abs of arquivos) {
    const de = rel(abs);
    for (const b of lerArestas(readFileSync(abs, 'utf8'), abs.endsWith('.tsx'))) {
      const recusar = (motivo: string) => problemas.push(`${de} → '${b.especificador}': ${motivo}`);
      if (b.problema) { recusar(b.problema); continue; }
      if (b.especificador.startsWith('/')) { recusar('caminho absoluto (/...); use caminho relativo'); continue; }
      if (!b.especificador.startsWith('.')) {
        arestas.push({ de, para: b.especificador, tipo: b.tipo, soTipo: b.soTipo, externo: true });
        continue;
      }
      const alvo = resolver(abs, b.especificador);
      if (alvo === null) { recusar('não resolve'); continue; }
      if (!posixDe(realpathSync.native(alvo)).endsWith(`/${rel(alvo)}`)) {
        recusar(`grafia diferente da do disco (${posixDe(relative(base, realpathSync.native(alvo)))}); quebra no Linux`);
        continue;
      }
      if (CODIGO.test(alvo)) arestas.push({ de, para: rel(alvo), tipo: b.tipo, soTipo: b.soTipo, externo: false });
    }
  }
  if (problemas.length) throw new Error(`Import que o leitor não aceita (ADR 0009):\n  ${problemas.join('\n  ')}`);
  return { arquivos: arquivos.map(rel).sort(), arestas };
}

export const dentro = (pasta: string, arquivo: string) => arquivo.startsWith(posix.join(pasta, '/'));
