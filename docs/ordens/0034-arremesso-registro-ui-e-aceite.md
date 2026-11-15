# Ordem de serviço: `arremesso`, registro de corpos, componentes, inspeção e CLAUDE.md

Ordem: OS-0034 (extração nº 6, `arremesso`, parte 5 de 5)
Módulo: `arremesso`
Escopo de escrita:
- `src/modules/arremesso/`: `scene/*`, `ui/*.tsx`, `index.ts`, `cena.ts`, `contracts.ts` (só para acrescentar), `tests/`, `CLAUDE.md` (novo) e `NOTAS.md` (novo).
- **Casca:** `src/app/Cena.tsx` (o registro de corpos, `launches`, o test hook) e `src/app/testHook.ts` (só se o tipo `UltimoLancamento` for reusado).
- **Legado:**
  - `src/scene/Hand.tsx` e `src/scene/Omens.tsx`: só de onde vem `bodies`;
  - `src/ui/Controls.tsx`: saem `RollMode`, `MODES`, `Force` e o parágrafo da dica.
- **Docs:**
  - `docs/contexto/arremesso.md` sai: o conteúdo vai para o `CLAUDE.md` e o `NOTAS.md` do módulo;
  - os links para ele (`grep -rn "arremesso.md" docs CLAUDE.md src`);
  - `docs/contexto/testes.md`, onde cita o test hook.

Objetivo: fechar o `arremesso`.
- O registro dos corpos da cena e o registro de lançamentos passam a ser do módulo.
- Os componentes de UI do arremesso (modo de rolagem, barra de força, dica da fase) passam ao módulo.
- O módulo ganha `inspecao()`, `CLAUDE.md` e `NOTAS.md`.

O DOM e o comportamento não mudam.

Leia antes de começar:
- `docs/specs/arremesso.md`, nas seções do `CLAUDE.md` e em "Dados de que é dono"
- `src/modules/arremesso/index.ts`, `cena.ts`, `contracts.ts` e `scene/*`
- `src/app/Cena.tsx`, inteiro, e `src/app/testHook.ts`
- `src/ui/Controls.tsx`, inteiro
- `docs/contexto/arremesso.md`, inteiro
- `src/modules/meus-dados/tests/componentes.test.ts`, como modelo de teste de DOM, e `src/modules/selecao/CLAUDE.md`, como formato

Decisões do orquestrador:
1. **Registro de corpos.**
   - O módulo é dono do registro (spec). Ele fica em `scene/corpos.ts`, sem React: `registroDeCorpos: { current: (RapierRigidBody | null)[] }`.
   - `CorpoDoDado` se registra nele sozinho, e sai a prop `register`.
   - `LoopDoArremesso` e `MaoDoArremesso` o leem direto, e sai a prop `bodies`.
   - O `index.ts` exporta `registroDeCorpos`, que o legado (`Hand`, `Omens`) e a casca (test hook, `previewSurface`, `ready`) passam a usar. O legado deixa de receber `bodies` por prop.
   - O `type` do Rapier entra como `import type`. Confira que o `index.ts` continua sem React e que o worker não cresce.
2. **Lançamentos.**
   - `recordLaunch` e o ref `launches` saem da casca. O `LoopDoArremesso` grava num registro do módulo.
   - `inspecao()` do `index.ts` devolve `{ corpos(), lancamentos() }`, com o mesmo formato de `bodies()` e `launches()` do test hook de hoje.
   - A casca passa a montar `bodies` e `launches` do `__dice` a partir dela, e o `DiceHook` não muda.
3. **Componentes**, em `ui/`, exportados por `cena.ts`:
   - `<ModoDeRolagem/>`, que é o `RollMode` com `MODES`;
   - `<BarraDeForca/>`, que é o `Force`;
   - `<DicaDaFase/>`, que é o `<p>` com os textos por fase e o aviso de física (`useFalha() === 'physics'`).
   - O código e o DOM ficam iguais.
   - O `Controls.tsx` os usa nos mesmos lugares, e o `{phase === 'charging' && <BarraDeForca />}` continua no `Controls`.
   - Teste de DOM como nas OS-0026/0029:
     - capture a fixture do `<footer>` do HEAD **antes** de mexer, em `hand`, `charging`, `settled` e com a falha `physics`;
     - compare depois.
4. **`CLAUDE.md` e `NOTAS.md`.**
   - O `CLAUDE.md` tem os cinco blocos da spec, entre 30 e 50 linhas, com os nomes reais. Ele diz:
     - as duas portas;
     - o worker por `criarWorkerDePresimulacao`;
     - `resultadoPublicado` (dois `set` no mesmo tique, OS-0031);
     - o que o módulo possui: o estado, a chave `diceroller.rolagem`, o registro de corpos, o worker e os lançamentos;
     - o que ainda vem do legado por prop-função (`omenTest`).
   - O detalhe de `docs/contexto/arremesso.md` que não cabe no `CLAUDE.md` vai para `NOTAS.md`. É o que se lê só quando a ordem manda (plano §5).
   - `docs/contexto/arremesso.md` sai, e os links passam a apontar para o `CLAUDE.md` do módulo.

Entregáveis:
1. O registro de corpos e o de lançamentos no módulo, e `inspecao()`.
2. Os três componentes e o teste de DOM.
3. A casca e o legado ajustados.
4. `CLAUDE.md`, `NOTAS.md` e as docs.

Critérios de aceite:
- `grep -n "useRef<(RapierRigidBody\|recordLaunch\|launches = useRef" src/app/Cena.tsx` volta vazio.
- `grep -n "RollMode\|MODES\|function Force\|A física não respondeu" src/ui/Controls.tsx` volta vazio.
- `docs/contexto/arremesso.md` não existe, e `grep -rn "contexto/arremesso.md" docs CLAUDE.md src` volta vazio.
- `npm test`, `npm run build`, `npm run lint` e `npm run test:server` passam. O `index` fica sem React, o worker não cresce e a arquitetura passa.
- **Sem E2E no dev.** O orquestrador roda o E2E completo de aceite.

Fora do escopo:
- O enquadramento da câmera com `envelopeDaMao()`, `dadoNaCena` e `moverDado`. Esses ficam para a `vitrine`, quando houver quem os chame. Registre na spec da `vitrine`.
- A parte `settled` do `Hand.tsx` e o `Omens.tsx`, além de trocar a fonte de `bodies`.

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev
- Registro: `scene/corpos.ts` (sem React, `RapierRigidBody` só como tipo) com `registroDeCorpos`, `registrarLancamento` e `inspecao()` → `{ corpos(), lancamentos() }`. O `index.ts` exporta `registroDeCorpos` e `inspecao`.
- `CorpoDoDado` se registra sozinho (saiu `register`). `LoopDoArremesso` e `MaoDoArremesso` leem o registro (saiu `bodies`), e o laço grava o lançamento (saiu `recordLaunch`). `Hand` e `Omens` perderam a prop `bodies`.
- Casca: `Cena.tsx` sem `bodies`, `launches`, `recordLaunch` e `register`. `bodies()`/`launches()` do `__dice` vêm de `inspecao()`; `ready`, `meshes` e `previewSurface` usam `registroDeCorpos`. `DiceHook` e `testHook.ts` ficaram iguais.
- `ui/ModoDeRolagem.tsx`, `BarraDeForca.tsx` e `DicaDaFase.tsx`, exportados por `cena.ts`. O `Controls` os usa, e o `phase === 'charging'` ficou nele.
- DOM: `tests/fixtures/rodape-antes.json` foi capturado do HEAD antes da mudança (hand, charging, settled, physics), com `useFalha` mockado em `vi.mock`. O `<footer>` recapturado depois ficou byte a byte igual (script temporário, já apagado). `tests/componentes.test.ts` tem 6 casos.
- Docs: `CLAUDE.md` (36 linhas) e `NOTAS.md` do módulo; `git rm docs/contexto/arremesso.md`. Links refeitos em `CLAUDE.md`, `visao-geral.md` e `dados.md`, e `testes.md` cita o test hook. Em `specs/vitrine.md`, ficou registrado o adiamento de `dadoNaCena`, `moverDado` e `envelopeDaMao`.
- Gate: `npm test` 52 arquivos / 492 testes; `test:server` 23; build ok, worker `presim.worker-BHo0CnSe.js` de 2.379.760 B, mesmo hash e tamanho de antes; lint limpo. Greps 1 e 2 vazios.
- Divergência: o grep 3 não volta vazio. Sobram citações históricas em `docs/ordens/*` (esta incluída), `docs/diagnostico.md` e `docs/superpowers/`. Não as mudei: são registro, e esta ordem não pode ser editada.

## Parecer do revisor

**APROVADO COM RESSALVAS** (revisão da OS e auditoria de aceite do `arremesso`).

**Revisão:**
- **Registro de corpos:** igual ao `register` do HEAD, inclusive a limpeza no desmonte. Todos os leitores usam o mesmo array.
- **`corpos()`/`lancamentos()`:** mesmo formato de antes.
- **DOM do `<footer>`:** idêntico byte a byte em 9 casos, numa comparação independente.
- **Worker:** mesmo hash e tamanho.
- **`CLAUDE.md`:** 36 linhas, com os 5 blocos.

**Auditoria:**
- O `useDice` só tem presságio e `showcased`.
- Os testes de física não mudaram de asserção.
- O worker existe.
- As escritas de pose fora de `apply.ts` (`previewSurface`, laço, mão, `Hand`) são as mesmas do HEAD. Não houve regressão, mas o critério da spec não vale ao pé da letra até o `moverDado` (vitrine).

**Ressalvas, corrigidas pelo orquestrador:**
1. Os nomes da spec que não existem (`fase()`, `resultado()`, `throwIdAtual()`, `<Arremesso/>`…) ficaram registrados nas specs de `pressagios` e `vitrine`, com os nomes reais (`arremesso()`, `useArremesso`, `registroDeCorpos`, `inspecao()`).
2. `MaoDoArremesso` ainda procura `die-i`/`gem-i` pelo nome. O adiamento de `definirOpacidade`/`definirSombra` para a `vitrine` está registrado no `CLAUDE.md` do módulo e na spec da `vitrine`.
3. `mapa-modulos.md`: `arremesso` concluído, e a linha do registro de corpos e de lançamentos atualizada.
4. `NOTAS.md`: voltaram os dois `set` agrupados pelo React e os leitores do movimento reduzido.
5. `NOTAS.md`: anotado que o registro e os lançamentos não zeram se a `Cena` for remontada.

Também: o `CLAUDE.md` raiz lista `arremesso` como extraído e as pastas legadas que restam, e `docs/specs/arremesso.md` foi absorvida.

## Gate

2026-11-14, rodado pelo orquestrador. É o **aceite do módulo `arremesso`**, com E2E e com a máquina livre.

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ worker 2379,76 kB |
| `npm run lint` | ✅ |
| `npm test` | ✅ 52 arquivos, 492 testes |
| `npm run test:server` | ✅ 23 testes |
| `npm run e2e` | ✅ 98 de 98 (18,6 min) |
