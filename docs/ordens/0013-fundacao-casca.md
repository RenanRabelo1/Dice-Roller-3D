# Ordem de serviço: a casca em `src/app/`

Ordem: OS-0013 (F-8, fundação, dev de shared/casca)
Escopo de escrita:
- **arquivos movidos:** `src/scene/Stage.tsx` → `src/app/Cena.tsx` e `src/testHook.ts` → `src/app/testHook.ts`, ambos com `git mv`
- **arquivos alterados:**
  - `src/App.tsx`, só o import e o uso do componente
  - `e2e/global.d.ts`
  - `e2e/worker.spec.ts`, só o comentário que cita o caminho
  - `tests/arquitetura/leitor.test.ts`, só os caminhos esperados das arestas reais
  - `docs/contexto/*.md`, só as citações de `Stage.tsx`/`testHook.ts`

Objetivo: a raiz de composição do cliente passa a ter pasta própria, `src/app/` (ADR 0008, item 1). `Stage.tsx` vira `src/app/Cena.tsx`, e o componente passa de `Stage` para `Cena`. O `testHook.ts` vai junto. O comportamento não muda.

Leia antes de começar:
- `docs/adr/0008-casca-e-shared-do-cliente.md`, item 1
- `docs/plano-refatoracao.md` §2, linha F-8
- as linhas de import de `src/scene/Stage.tsx` e de `src/testHook.ts`; use `grep -n "^import"`
- `grep -rn "scene/Stage\|testHook\|Stage.tsx" src tests e2e docs/contexto`

Entregáveis:
1. **Mover os arquivos com `git mv`**, para o histórico seguir o arquivo, e ajustar os imports relativos internos. O `new URL('../physics/presim.worker.ts', import.meta.url)` precisa continuar apontando para o worker a partir do novo lugar.
2. **Renomear o componente** exportado `Stage` para `Cena`, junto com o uso em `App.tsx`. Nada mais muda de nome. Funções internas, componentes internos como `ThrowLoop` e o `window.__dice` ficam iguais.
3. **Fora de escopo nesta ordem:** montar o `window.__dice` a partir da inspeção de cada módulo, como pede o ADR 0003. Isso depende de existir módulo. A `Cena` continua chamando `installTestHook` como hoje. Deixe um comentário curto no `testHook.ts` dizendo que a montagem por partes entra com as extrações.
4. **Atualizar as citações:**
   - em `e2e/global.d.ts` e `e2e/worker.spec.ts` (só o comentário);
   - nos caminhos esperados de `tests/arquitetura/leitor.test.ts`;
   - nas docs de `docs/contexto/`, de `scene/Stage.tsx` para `app/Cena.tsx` e de `testHook.ts` para `app/testHook.ts`.

   **Não** mude `docs/specs/` nem `docs/mapa-modulos.md`; quem atualiza esses dois é o orquestrador.

Critérios de aceite:
- `git log --follow src/app/Cena.tsx` mostra o histórico de `Stage.tsx`.
- `grep -rn "scene/Stage\|'\.\./testHook'\|from '\./testHook'" src tests e2e` volta vazio. A exceção é o próprio `src/app/Cena.tsx`, que pode importar `./testHook`.
- O diff de `Cena.tsx` contra o `Stage.tsx` antigo (`git diff -M HEAD --stat` e `git diff -M HEAD -- src/app/Cena.tsx`) mostra só imports, o nome do componente e nada mais.
- `npm test` passa, inclusive a suíte de arquitetura: os ciclos conhecidos não mudam e as quatro arestas reais continuam sendo vistas. Também passam `npm run build`, `npm run lint` e `npm run test:server`.
- `npm run e2e` completo passa; quem roda é o orquestrador.

Fora do escopo:
- Dividir a `Cena` ou tirar dela o `ThrowLoop`, o panorama, o DPR ou a câmera. Isso vai nas extrações de `arremesso`, `mesa` e `vitrine`.
- Mover `App.tsx` ou `main.tsx`, que já são casca (ADR 0008).

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

Movimentações com `git mv`: `src/scene/Stage.tsx` foi para `src/app/Cena.tsx` (97% de similaridade) e `src/testHook.ts` foi para `src/app/testHook.ts` (90%).

Em `Cena.tsx`, a única linha que mudou além dos imports é a 104: `export function Stage(` virou `export function Cena(`. O `new URL('../physics/presim.worker.ts', import.meta.url)` continua resolvendo a partir de `src/app/`.

O `testHook.ts` mudou só nos caminhos de `import type` e ganhou um comentário dizendo que a montagem do `__dice` por partes entra com as extrações.

Também foram ajustados:
- `App.tsx`;
- `e2e/global.d.ts`;
- o comentário de caminho em `e2e/worker.spec.ts`;
- os caminhos esperados em `tests/arquitetura/leitor.test.ts`;
- as citações de caminho em `docs/contexto/*`.

Verificação do dev:
- `npm test`: 396;
- build e lint: ok;
- `test:server`: 23;
- `smoke` + `worker` + `roll`: 24/24.

## Parecer do revisor

**APROVADO.**
- ✅ (a) Só arquivos do escopo. As mudanças em `docs/specs/` e no mapa são do orquestrador.
- ✅ (b) Comportamento igual. O diff de `Cena.tsx` mexe só nos imports e na linha 104. O worker resolve. Os imports por URL dos E2E e o `global.d.ts` continuam válidos.
- ✅ (c) Arquitetura: 30/30. A casca já inclui `src/app/**`, nenhum ciclo novo apareceu e os `CICLOS_CONHECIDOS` não mudaram.
- ✅ (d) Doc atualizada.

O orquestrador também atualizou o que estava fora do escopo do dev:
- trocou o nome `Stage` por `Cena` em `docs/contexto/` (`armadilhas`, `mesa` ×3, `visao-geral`);
- atualizou as citações em `docs/specs/` e no mapa;
- anotou no plano que a montagem do `__dice` por partes foi adiada.

Ainda há comentários de código que citam `Stage` pelo nome: `src/scene/Backdrop.tsx:6`, `src/scene/tableImages.ts:74` e `e2e/worker.spec.ts:23,24,55`. Eles serão trocados na próxima ordem que mexer nesses arquivos.

## Gate

2026-11-13, rodado pelo orquestrador.

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ (worker de física com o mesmo hash) |
| `npm run lint` | ✅ |
| `npm test` | ✅ 31 arquivos, 396 testes |
| `npm run test:server` | ✅ 23 testes |
| `npm run e2e` | ✅ 98 passaram (18,1 min) |
