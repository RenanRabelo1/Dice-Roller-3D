# Ordem de serviço: `shared/plataforma` — falha registrada, Guard, sonda de WebGL e renderizador por software

Ordem: OS-0008 (F-5, parte 1 de 2, fundação, dev de shared)
Escopo de escrita:
- novos:
  - `src/shared/plataforma/index.ts`, `falha.ts`, `Safeguard.tsx`, `webgl.ts`, `software.ts`
  - `src/shared/plataforma/tests/falha.test.ts`
- removidos: `src/failure.ts`, `src/ui/Safeguard.tsx`
- alterados:
  - `src/store.ts` (só `error`, `setError` e `DiceError`)
  - `src/App.tsx`, `src/scene/Stage.tsx`, `src/ui/Controls.tsx`, `src/testHook.ts`, `src/scene/tableImages.ts`
  - `docs/contexto/apresentacao.md` e `docs/contexto/visao-geral.md`, só nas linhas que citam esses arquivos
  - `docs/contexto/armadilhas.md` e `docs/contexto/testes.md`, se citarem

**Escopo ampliado pelo orquestrador (2026-11-13):** `tsconfig.test.json` (só `"jsx": "react-jsx"`, porque o `index.ts` da plataforma reexporta `Safeguard.tsx` e o projeto de testes passa a alcançá-lo por `tableImages.ts` e `testHook.ts`) e `docs/contexto/mesa.md` (a citação de `markSoftwareGl`). O primeiro grep dos critérios pega também o `setError` do `useState` local de `ImportDie.tsx` e `TablePanel.tsx`, que não tem relação com esta ordem; esses ficam.

Objetivo: a falha da plataforma (`webgl`, `graphics`, `physics`) deixa de ser campo do `useDice` e passa a ser estado de `src/shared/plataforma`, junto com o `Guard`, a mensagem de falha, a sonda de WebGL e a marca de renderizador por software (ADR 0008). O comportamento não muda.

O movimento reduzido fica para a OS-0009.

Leia antes de começar:
- `docs/adr/0008-casca-e-shared-do-cliente.md`, item `plataforma/`
- `src/failure.ts`, `src/ui/Safeguard.tsx`
- `src/store.ts`: as linhas de `DiceError`, `error` e `setError` (`grep -n`)
- `src/scene/tableImages.ts:50-80`
- os pontos de uso, por `grep -n "setError\|\.error\b\|DiceError\|Guard\|Failure\|hasWebGL\|markSoftwareGl" src`

Desenho (decidido pelo orquestrador):
- **`falha.ts`:**
  - Tem um store próprio (zustand), privado do arquivo.
  - Expõe `type Falha = 'webgl' | 'graphics' | 'physics'`, `falha(): Falha | null`, `useFalha(): Falha | null` e `registrarFalha(f: Falha | null)`.
  - `registrarFalha` **sobrescreve**, como o `setError` de hoje.
  - A regra "a primeira vence" continua só dentro do `Guard`: `if (!falha()) registrarFalha(kind)`.
  - O `Stage.tsx` continua sobrescrevendo com `physics` no fallback e limpando com `null` a cada arremesso, exatamente como hoje.
- **`Safeguard.tsx`:** `Guard` e `Failure`, como estão hoje, lendo e escrevendo pelo `falha.ts`. O texto das mensagens (`FAILURE`) fica neste arquivo ou em `falha.ts`, sem mudar uma letra.
- **`webgl.ts`:** `hasWebGL()`, com o mesmo cache de uma sonda só.
- **`software.ts`:** `marcarRenderizadorPorSoftware()` e `renderizadorPorSoftware(): boolean`. Isso substitui o `let softwareGl` e o `markSoftwareGl` de `tableImages.ts`, que passa a ler `renderizadorPorSoftware()`.
- **`index.ts`:** é a porta. Reexporta só o que os pontos de uso precisam. O legado importa de `src/shared/plataforma` (o `index.ts`), nunca de um arquivo interno.
- **Restrições:**
  - Nenhum import de `src/store.ts` nem de outro arquivo do legado dentro de `src/shared/plataforma/`.
  - `zustand` e `react` são permitidos.

Entregáveis:
1. Os arquivos de `src/shared/plataforma/` conforme o desenho. Remover `src/failure.ts` e `src/ui/Safeguard.tsx`.
2. `src/store.ts` perde `error`, `setError` e `DiceError`, e não mexe em mais nada.
3. Os pontos de uso passam a usar a plataforma:
   - `App.tsx`: a sonda, o `registrarFalha('webgl')`, o `useFalha()` que esconde o canvas, `Guard` e `Failure`;
   - `Stage.tsx`: os dois `registrarFalha`, o `Guard`, a marca de software e o campo `error` do `window.__dice`;
   - `Controls.tsx`: `useFalha() === 'physics'`;
   - `testHook.ts`: o tipo do campo `error`, que passa a ser `Falha | null`.

   O `window.__dice.state().error` continua com o mesmo nome e os mesmos valores.
4. `src/shared/plataforma/tests/falha.test.ts`, em Node, cobrindo:
   - `registrarFalha` sobrescreve;
   - `null` limpa;
   - `falha()` reflete o último registro.

   O `Guard` e o `Failure` já são cobertos pelo `e2e/failure.spec.ts` e pelo `e2e/worker.spec.ts`, e não precisam de teste de componente.
5. Nas docs de contexto, troque as citações de `failure.ts`, `ui/Safeguard.tsx`, `store.error` e `markSoftwareGl` pelos nomes novos.

Critérios de aceite:
- `grep -rn "setError\|DiceError\|markSoftwareGl\|from '.*failure'\|ui/Safeguard" src tests e2e` volta vazio.
- `grep -rn "from '.*shared/plataforma/" src` volta vazio, ou seja, ninguém importa arquivo interno da plataforma. A exceção é o próprio teste, dentro de `plataforma/tests/`.
- `npm test`, `npm run build`, `npm run lint` e `npm run test:server` passam.
- `npm run e2e` completo passa; quem roda é o orquestrador. Em especial `failure.spec.ts` (sem WebGL, renderer que falha, física que não carrega), `worker.spec.ts` (o caso de falha dupla, que confere `error: 'physics'`, a mensagem e o rodapé) e `coin-software.spec.ts` (renderizador por software).

Fora do escopo:
- Movimento reduzido (`reducedMotion`, `setReducedMotion`): é da OS-0009.
- Mudar qualquer texto, ordem de prioridade entre falhas ou condição de quando a falha é registrada ou limpa.
- Corrigir o defeito do §10 item 1 (mensagem "carregar" quando a física carregou).

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

Arquivos:
- **Novos**, em `src/shared/plataforma/`: `index.ts`, `falha.ts`, `Safeguard.tsx`, `webgl.ts`, `software.ts`, `tests/falha.test.ts`.
- **Removidos:** `src/failure.ts`, `src/ui/Safeguard.tsx`.
- **Alterados:** `store.ts` (sem `error`/`setError`/`DiceError`), `App.tsx`, `Stage.tsx`, `Controls.tsx`, `testHook.ts`, `tableImages.ts`, `visao-geral.md`, `armadilhas.md`, mais o que entrou na ampliação: `tsconfig.test.json` (`jsx`) e `mesa.md`.

Nenhuma linha de comportamento mudou:
- os textos de `FAILURE` são idênticos;
- o `Guard` mantém o `if (!falha())`;
- o `Stage` continua sobrescrevendo com `physics` e limpando com `null`;
- `window.__dice.state().error` lê `falha()`.

Foi feito em TDD.

**Divergência:** o primeiro build falhou com `TS6142`. O `index.ts` reexporta `Safeguard.tsx`, e o projeto de testes passou a alcançá-lo por `tableImages.ts` e `testHook.ts`, mas não tinha `jsx`. O orquestrador ampliou o escopo (registrado no topo) e o dev acrescentou `"jsx": "react-jsx"`.

Verificação do dev:

| Verificação | Resultado |
|---|---|
| `npm test` | 354 |
| build e lint | ok |
| `test:server` | 23 |
| E2E de `failure`, `worker`, `coin-software` e `smoke` | 13/13 |

## Parecer do revisor

**APROVADO.**

- ✅ (a) Os arquivos tocados são os do escopo mais a ampliação.
- ✅ (b) A plataforma só importa `zustand` e `react`. As mensagens de falha são de plataforma, como diz o ADR 0008.
- ✅ (c) `falha.test.ts` cobre a sobrescrita, a limpeza e o último registro.
- ✅ (d) Os nove pontos de comportamento conferem. A reatividade é a mesma: `App`, `Failure` e `Controls` continuam reativos, e `Guard` e `__dice` continuam com leitura única.
- ✅ (e) Docs atualizadas.
- ✅ (f) O grep 1 só pega o `useState` local, que está ressalvado. O grep 2 volta vazio.

Observações sem bloqueio:
1. `tableImages.ts` passa a carregar `react` e `Safeguard.tsx` pelo `index.ts`. O custo é baixo.
2. A frase "o primeiro erro registrado vale", em `armadilhas.md`, era imprecisa. O orquestrador a corrigiu neste commit: entre os `Guard` vale a primeira, e o `Stage` sobrescreve e limpa.
3. `shared/` continua sem ponto e vírgula.

## Gate

2026-11-13, pelo orquestrador.

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ Mesmos chunks sob demanda, com o mesmo tamanho. O worker de física tem o mesmo hash. |
| `npm run lint` | ✅ |
| `npm test` | ✅ 26 arquivos, 354 testes |
| `npm run test:server` | ✅ 23 testes |
| `npm run e2e` | ⚠️ 97 de 98 (21,1 min). `roll.spec.ts:135` estourou os 120 s esperando a navegação inicial terminar, antes de executar qualquer passo do teste. |
| `npx playwright test e2e/roll.spec.ts`, sozinho | ✅ 16 de 16 (3,0 min) |

A falha é de ambiente, não da ordem. A página não terminou de carregar, e o teste não chegou a tocar em nada do que mudou. O mesmo spec passou inteiro logo em seguida.
