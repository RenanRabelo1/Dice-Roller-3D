# ADR 0006: Testes de arquitetura (imports, ciclos e dono dos dados)

Status: proposto (aguarda o responsável humano)

## Contexto

O guia (seção 8) pede testes automáticos para as regras 1 (porta única), 2 (dono dos dados) e 4 (sem ciclos), com o `dependency-cruiser` cobrindo imports e ciclos. Dois fatos deste projeto mudam a forma de fazer:

1. **TypeScript 7.** O pacote `typescript@7.0.2` instalado não expõe mais a API JS do compilador (`require('typescript').createSourceFile` é `undefined`; o pacote só exporta `version` e APIs `unstable/*`). Verificado em 2026-11-12. O `dependency-cruiser` usa essa API para ler `.ts`. Nesta versão do TS, então, ele precisa do parser alternativo (`swc`), e isso **não foi testado aqui**.
2. **"Tabela" aqui não é SQL.** O dado mora em stores zustand, stores do IndexedDB, chaves do `localStorage`, registros em memória (por exemplo, o de dados importados) e na coleção `rolls` do MongoDB. O `dependency-cruiser` não enxerga acesso a dado, só imports.

Há ainda imports que um analisador comum pode não ver: `import()` dinâmico (`Die.tsx:92`, `Controls.tsx:20`, `TablePanel.tsx:54,72`, `Stage.tsx`) e o worker criado com `new URL('../physics/presim.worker.ts', import.meta.url)` (`Stage.tsx:52`).

## Decisão

Uma suíte `tests/arquitetura/`, rodando no `npm test` (portanto no gate), em duas partes:

**A. Imports e ciclos (regras 1 e 4), com `dependency-cruiser`.**

- A fundação instala o `dependency-cruiser` com `parser: "swc"` (dependência de desenvolvimento `@swc/core`) e confirma, num caso de teste, que ele vê imports estáticos, `import type`, `import()` dinâmico e o `new URL(..., import.meta.url)` do worker. Se não vir tudo, a parte A passa a ser um teste próprio do Vitest, com o mesmo leitor de imports do diagnóstico, e isso vira um ADR de ajuste. **Não** se rebaixa o TypeScript para servir à ferramenta.
- Regras:
  - um arquivo de `src/modules/<a>/` só importa de `src/modules/<b>/` o `index.ts` ou o `contracts.ts` (este, só `type-only`);
  - nenhum ciclo entre módulos, contando imports de tipo e dinâmicos;
  - `src/shared/**` não importa de `src/modules/**` nem da casca;
  - nenhum módulo importa a casca (`src/main.tsx`, `src/App.tsx`, `src/app/**`);
  - `src/modules/regras/**` não importa `three`, `react`, `@react-three/*`, `@dimforge/*`, `zustand` nem nada fora do próprio módulo (ADR 0002);
  - de `server/**` para `src/**`, só `src/modules/regras/index.ts`; de `src/**` para `server/**`, só `import type` de `server/src/modules/*/contracts.ts` (ADR 0004);
  - em `server/`, `routes.ts` de um módulo só importa o próprio `service.ts`/`contracts.ts`, e `mongodb` só é importado por `repository.ts` e por `server/src/shared/db.ts`.

**B. Dono dos dados (regra 2), com um teste próprio do Vitest.**

O `docs/mapa-modulos.md` tem um bloco `json` marcado `donos-dos-dados`, com cada dado e o módulo dono: as stores do IndexedDB (`customDice`, `tables`), as chaves do `localStorage` (`diceroller.player`, `mesa.ativa`) e a coleção `rolls`. O teste lê esse bloco (o documento é a fonte única) e varre o código:

- `indexedDB` só aparece em `src/shared/db`. O nome de store passado ao `shared/db` só aparece dentro do módulo dono;
- `localStorage`/`sessionStorage` só aparecem no `repository.ts` do módulo dono da chave usada;
- `.collection('<nome>')` e os estágios `$lookup`/`$graphLookup` só aparecem no `repository.ts` do módulo dono. Um `$lookup` para coleção de outro módulo falha (join entre domínios);
- `create(` do zustand só aparece em `src/modules/*/store.ts`. Nenhum `index.ts` reexporta o store cru, só funções e hooks de leitura (ADR 0003). Um arquivo `store.ts` não pode ser importado de fora do próprio módulo, e isso a parte A já garante.

**Exceções** à suíte só existem com ADR, e o arquivo de configuração cita o número do ADR ao lado de cada uma.

## Consequências

- O gate do projeto (`build → lint → test → e2e`) passa a bloquear a quebra de fronteira sem passo novo: a suíte roda dentro do `npm test`.
- Durante a extração (fase 5), os módulos ainda não extraídos ficam fora de `src/modules/` e a suíte não os cobre. Ela cresce módulo a módulo, e na fase 7 roda sem nenhuma exceção.
- A parte B é heurística (procura padrões no texto). Pega o caso comum, não acesso indireto e deliberado. A revisão da seção 7 continua obrigatória.

## Alternativas descartadas

- **`eslint-plugin-boundaries`.** O projeto usa `oxlint`, não ESLint. Seria uma segunda ferramenta de lint só para isso.
- **Só a revisão humana para a regra 2.** É justamente a regra mais fácil de violar sem perceber (é o que o store único faz hoje).
- **Rebaixar o TypeScript para 5.x.** Mexe no build de todo o projeto para servir a uma ferramenta de verificação.
