# ADR 0009: Leitor de imports próprio para os testes de arquitetura

Status: aceito. É o ajuste que o ADR 0006 já previa ("se não vir tudo, a parte A passa a ser um teste próprio do Vitest… e isso vira um ADR de ajuste"), registrado pelo orquestrador em 2026-11-13.

## Contexto

A OS-0011 testou o `dependency-cruiser@18.7.2` com `parser: 'swc'` (`@swc/core@1.16.22`) sobre `src/`. Ele enxergou o import estático, o `import type` e o `import()` dinâmico. **Não** enxergou o worker `new Worker(new URL('../physics/presim.worker.ts', import.meta.url))` (`Stage.tsx:54`), que aparece no grafo sem nenhuma aresta de entrada.

O que o dev tentou:
- O visitor swc do cruiser só trata declarações de import/export, `require`, `import()` e "exotic requires".
- A opção `exoticRequireStrings` olha só chamadas de função, e `new` é outro tipo de nó.
- Com `parser: 'tsc'` o resultado é o mesmo, e o cruiser declara suporte só a TypeScript abaixo da 7.

Além disso, a instalação avisou `EBADENGINE`: o cruiser pede Node `^22 || ^24 || >=26`, e esta máquina roda o 25.9.0.

## Decisão

- A parte A do ADR 0006 (imports e ciclos) vira um **teste próprio do Vitest** em `tests/arquitetura/`. As regras são as mesmas do ADR 0006.
- O leitor usa o **`parseSync` do `@swc/core`** (versão exata, em `devDependencies`), que devolve a AST do TypeScript. Ele percorre a AST e extrai quatro tipos de aresta:
  - `import`/`export … from`, marcando se é `type-only`;
  - `import()` dinâmico com string literal;
  - `new URL('<relativo>', import.meta.url)`;
  - `new Worker(new URL(...))`.
- A resolução de caminho é própria: caminhos relativos, com ou sem extensão, e `index.ts`/`index.tsx` de pasta. Um import relativo que não resolve faz o teste falhar.
- Os ciclos são detectados por componentes fortemente conexos (Tarjan) sobre o grafo, contando arestas de tipo e dinâmicas.
- O `dependency-cruiser` é desinstalado.

## Consequências

- Não há dependência de uma ferramenta que não suporta o TypeScript 7 nem a versão de Node em uso. Fica uma dependência só, o `@swc/core`, que é binário nativo. A regra de versões fixas (`armadilhas.md`) vale para ele.
- O código do leitor e das regras é nosso e precisa de teste: o próprio leitor é provado contra as quatro arestas reais e contra fixtures.
- Um `new URL` que não seja de código, como uma imagem, vira aresta para um arquivo que não é `.ts`. O leitor só considera destinos `.ts`/`.tsx` e ignora os outros.

## Alternativas descartadas

- **Manter o cruiser e completar só a aresta do worker.** Seriam duas fontes de grafo, e o detector de ciclos do cruiser não veria a aresta extra. Também manteria a ferramenta sem suporte ao TS 7 nem ao Node em uso.
- **Leitor por expressão regular.** Frágil com imports em várias linhas e com strings ou comentários que contenham `import`. A AST custa o mesmo e não tem esse risco.
- **Ignorar a aresta do worker.** O `new URL` é justamente o vínculo que o ADR 0007 (ponto 10) manda o teste contar.
