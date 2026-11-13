# ADR 0007: Onde a stack real difere da que o guia assume

Status: proposto (aguarda o responsável humano)

## Contexto

O guia assume Node.js no backend, React no frontend e TypeScript nas duas pontas, com a estrutura da seção 3. A stack em si bate: React 19 no cliente, Fastify em Node no servidor, TypeScript nos dois. As diferenças estão em como o projeto usa essa stack. Cada uma pede uma decisão. As maiores têm ADR próprio, e este registra as menores e aponta para os outros.

## Decisões, ponto a ponto

| # | O guia assume | Este projeto (verificado) | Decisão |
|---|---|---|---|
| 1 | `backend/` + `frontend/` em `app/` | front na raiz (`src/`), servidor em `server/`, dois `package.json` sem workspace | ADR 0001 |
| 2 | regra no backend (`service.ts`), frontend fino | regra no cliente; o servidor importa `src/dice/kinds.ts` e `omen.ts` | ADR 0002 |
| 3 | "tabelas" de banco | stores zustand, IndexedDB, `localStorage`, registros em memória e uma coleção MongoDB | ADR 0003 (estado do cliente) e 0006 (como testar) |
| 4 | backend compilado | o servidor roda `.ts` direto no Node (`node src/main.ts`, `erasableSyntaxOnly`) | Código que o servidor importa de `src/` usa só sintaxe apagável e imports relativos com extensão `.ts` (ADR 0002) |
| 5 | `dependency-cruiser` lê o TypeScript | TypeScript 7.0.2, sem a API JS do compilador | parser `swc` ou teste próprio (ADR 0006) |
| 6 | `shared/` com autenticação | não há login; o jogador é um id anônimo no `localStorage` (`src/api/history.ts:7`) | Não criar `shared/auth`. O id anônimo é dado do módulo `historico`. Quando houver login, um ADR define o módulo de contas. |
| 7 | `shared/` com logging | servidor: logger do Fastify; cliente: `console` | Não criar biblioteca de log. No servidor, `shared/` reexpõe o logger do Fastify; no cliente, nada até haver necessidade |
| 8 | frontend com `pages/` e rotas | uma tela só, sem roteador; boa parte da interface é cena 3D (R3F) | Sem `pages/`. Componente R3F fica em `scene/` dentro do módulo e segue a mesma regra dos componentes React: sem regra de negócio |
| 9 | testes dentro do módulo (regra 7) | unitários todos em `tests/` na raiz (Vitest só inclui `tests/**`); E2E em `e2e/` | Ver abaixo |
| 10 | — | um Web Worker (`physics/presim.worker.ts`) criado com `new URL(..., import.meta.url)` | O worker é arquivo interno do módulo que simula, e só ele o cria. O teste de arquitetura conta esse vínculo como import (ADR 0006) |
| 11 | — | chunks sob demanda: importador de modelos, assistente de importação, arquivo da mesa (`import()` em `Die.tsx`, `Controls.tsx`, `TablePanel.tsx`) | Ver abaixo |
| 12 | ESLint implícito | `oxlint` | As regras de fronteira ficam no teste de arquitetura, não no lint |

### Ponto 9: onde ficam os testes

- O teste unitário de um módulo vai para `src/modules/<m>/tests/*.test.ts` e só importa o próprio módulo (ou o `index.ts` de outros, quando inevitável). O Vitest da raiz passa a incluir `src/**/tests/**/*.test.ts` além de `tests/**`. O `tsconfig.app.json` exclui `src/**/tests/**`, e o `tsconfig.test.json` os inclui, porque precisam de tipos do Node.
- `tests/` na raiz fica para o que atravessa módulos: a física real de ponta a ponta (`tests/helpers/sim.ts` roda a mesma `presimulate` do app), a rede de segurança da fase 3 e a suíte `tests/arquitetura/`.
- `e2e/` é teste do sistema inteiro e não pertence a módulo. Continua onde está.
- No servidor: `server/src/modules/historico/tests/`, com o `include` do `server/vitest.config.ts` ajustado.

### Ponto 11: chunks sob demanda

Se um `index.ts` reexportar estaticamente um arquivo que hoje entra por `import()`, quem importar esse `index.ts` puxa o chunk para o bundle principal. Isso acontece sem aviso: o build continua verde e só o tamanho muda. Por isso:

- o `index.ts` expõe o que é pesado como função de carregamento (`carregarImportador = () => import('./domain/importer')`) e só reexporta tipos estaticamente;
- o critério de aceite de cada extração inclui conferir a lista de chunks do `vite build`: os mesmos chunks sob demanda continuam existindo (hoje `ImportDie`, `importer`, `tableFile`, `HDRLoader`, `presim.worker`).

## Consequências

- Nenhuma diferença de stack exige trocar biblioteca ou versão.
- As exigências que vêm do Node com TS nativo (ponto 4) e do TypeScript 7 (ponto 5) caem sobre poucos arquivos e são conferidas pelo teste de arquitetura.
