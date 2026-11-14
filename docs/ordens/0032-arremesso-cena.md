# Ordem de serviço: `arremesso`, corpos, colisores e laço do arremesso na cena

Ordem: OS-0032 (extração nº 6, `arremesso`, parte 3 de 5)
Módulo: `arremesso`
Escopo de escrita:
- `src/modules/arremesso/`: `scene/*.tsx` (novo), `cena.ts`, `domain/vies.ts`, `index.ts`, `contracts.ts` (só para acrescentar) e `tests/`.
- **Legado:**
  - `src/scene/Die.tsx` vai para `src/modules/arremesso/scene/CorpoDoDado.tsx`, com `git mv`;
  - `src/scene/Tray.tsx` perde os colisores (decisão 3);
  - `src/dice/omenTest.ts` perde o `omenKinds` (decisão 4).
- **Casca:** `src/app/Cena.tsx`. Saem o `ThrowLoop` e o `WORKER_TIMEOUT` (linhas 30-104) e o `<Die>` passa a ser `<CorpoDoDado>`.
- **Pontos de chamada de `omenKinds`,** só os imports (`grep -rn omenKinds src tests`).
- **Docs:** `docs/contexto/arremesso.md`, onde cita `ThrowLoop`, `Die.tsx` e `Tray.tsx`.

Objetivo: o que o arremesso põe na cena passa a ser do módulo, menos a mão. São o laço que pede a gravação ao worker (ou calcula na thread principal) e a reproduz passo a passo, o corpo físico de cada dado e os colisores da bandeja.
- A mão (`Hand.tsx`) fica para a próxima ordem, porque mistura arremesso, vitrine e presságio no mesmo `useFrame`.
- O registro de corpos (`bodies`) continua nascendo na casca e é passado por prop, como ponte até a OS-0033.
- O comportamento, a física e o grafo de cena não mudam.

Leia antes de começar:
- `docs/specs/arremesso.md`, nas seções "Regras de negócio" (worker, replay) e "Expõe"
- `src/modules/arremesso/index.ts`, `cena.ts` e `contracts.ts`
- `src/app/Cena.tsx`, inteiro (312 linhas)
- `src/scene/Die.tsx` e `src/scene/Tray.tsx`, inteiros
- `src/dice/omenTest.ts` e `src/dice/omen.ts:1-15` (`isD20`)
- `docs/contexto/armadilhas.md`, nos itens de CCD e de corpos cinemáticos

Decisões do orquestrador:
1. **`LoopDoArremesso`.**
   - O `ThrowLoop` vai para `scene/LoopDoArremesso.tsx`, junto com o `WORKER_TIMEOUT`. O código fica igual.
   - Ele recebe por prop `bodies` (o ref) e `recordLaunch`.
   - O tipo do parâmetro de `recordLaunch` (`{ before, after }`) vira tipo do `contracts.ts` (`UltimoLancamento`), e o `testHook.ts` da casca o reusa, se der, ou mantém o seu. O módulo não importa a casca.
   - Os imports que o `ThrowLoop` faz da casca ou do legado (`omenKinds`, `DiceHook`) são resolvidos pelas decisões 4 e esta.
2. **`CorpoDoDado`.** É o `Die.tsx` movido com `git mv` e renomeado, sem mudar o código. Continua sem CCD (armadilhas).
3. **Colisores.**
   - `scene/ColisoresDaBandeja.tsx` é o `<RigidBody type="fixed" colliders={false}>` com os `CuboidCollider` de `trayColliders()`, e recebe `children`.
   - O `Tray.tsx` do legado, que vai ser da `mesa`, passa a renderizar `<ColisoresDaBandeja><primitive object={table} /></ColisoresDaBandeja>`.
   - Assim o grafo de cena fica **idêntico**: a mesa continua filha do mesmo corpo fixo.
4. **`omenKinds`.**
   - Sai de `src/dice/omenTest.ts` e vai para `domain/vies.ts` do arremesso, como `dice.map((k) => (paraRegras(k) === 'd20' ? 'd20' : k))`, com `paraRegras` de `dados`.
   - Isso é equivalente ao de hoje, porque `isD20(k)` é `paraRegras(k) === 'd20'` (OS-0022).
   - O `index.ts` o exporta, e os chamadores do legado (`omenTest.ts`, `store.ts`…) importam de lá.
   - O teste dele, se houver, vai junto e fica sem mudar asserções.
5. **`cena.ts`** exporta `LoopDoArremesso`, `CorpoDoDado` e `ColisoresDaBandeja`. O `index.ts` continua sem React.
6. **Casca.** O `Cena.tsx` passa a compor `<LoopDoArremesso bodies recordLaunch />` e `<CorpoDoDado …/>` nos mesmos lugares de hoje, dentro do `<Physics>` e na mesma ordem dos filhos.

Entregáveis:
1. `scene/LoopDoArremesso.tsx`, `scene/CorpoDoDado.tsx`, `scene/ColisoresDaBandeja.tsx` e o `cena.ts`.
2. `omenKinds` no módulo e os chamadores ajustados.
3. O `Cena.tsx` e o `Tray.tsx` usando os componentes.
4. Docs.

Critérios de aceite:
- `src/scene/Die.tsx` não existe, e `grep -n "ThrowLoop\|WORKER_TIMEOUT\|useBeforePhysicsStep" src/app/Cena.tsx` volta vazio.
- `grep -rn "omenKinds" src/dice` só mostra imports.
- A ordem dos filhos dentro do `<Physics>` é a mesma. Mostre o JSX antes e depois.
- `npm test`, `npm run build`, `npm run lint` e `npm run test:server` passam. A arquitetura passa: o módulo não importa o legado nem a casca, e o `index` fica sem React. O worker não cresce além de 2379,76 kB.
- **Sem E2E no dev.** O orquestrador roda uma amostra (`roll`, `coin`, `coin-performance`, `failure`, `worker`) depois da revisão.

Fora do escopo:
- `Hand.tsx` (mão, mira, redemoinho, seta, retorno), que é a OS-0033.
- O registro de corpos no módulo, `dadoNaCena`/`moverDado`, os componentes de UI (`Force`, `RollMode`, a dica da fase), `inspecao()` e o `CLAUDE.md`, que são as OS-0033 e 0034.

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

- Novos: `scene/LoopDoArremesso.tsx` (o `ThrowLoop` e o `WORKER_TIMEOUT`, mesmo código) e `scene/ColisoresDaBandeja.tsx`. `Die.tsx` foi movido com `git mv` para `scene/CorpoDoDado.tsx`; só mudaram o nome e os imports. O `cena.ts` exporta os três.
- `contracts.ts` ganhou `UltimoLancamento { before: Pose[]; after: Pose[] }`. O `testHook.ts` ficou com o tipo dele (estruturalmente igual), porque não está no escopo de escrita.
- `omenKinds` foi para `domain/vies.ts` com `paraRegras` e sai pelo `index.ts`. Os imports foram trocados em `omenTest.ts`, `store.ts`, `tests/custom.test.ts` e `tests/omenTest.test.ts`. Não havia teste próprio de `omenKinds`.
- `Tray.tsx` renderiza `<ColisoresDaBandeja><primitive object={table} /></ColisoresDaBandeja>`, e o grafo continua o mesmo.
- **Divergência:** o `ThrowLoop` lia `useDice.getState().omenTest`, do store legado, e o módulo não pode importar o legado. Por isso o `LoopDoArremesso` recebe também a prop `omenTest: () => OmenTest | null`, lida no mesmo ponto do passo. A casca passa `useCallback(() => useDice.getState().omenTest, [])`. A lógica não mudou.
- Ordem dentro do `<Physics>`, antes: `Tray`, `Hand`, `ThrowLoop`, `group > Die*`. Depois: `Tray`, `Hand`, `LoopDoArremesso`, `group > CorpoDoDado*`. A ordem não mudou.
- O grep de `omenKinds` em `src/dice` mostra o import e uma chamada em `withDiceFor` (linha 18). Não sobrou definição.
- **Pendência fora do escopo:** `docs/contexto/armadilhas.md:14` ainda cita `Die.tsx`.
- Gate: `npm test` 486/486; `test:server` 23/23; build ok, com worker de 2379,76 kB (sem crescimento); lint limpo.

## Parecer do revisor

**APROVADO COM RESSALVAS.**
- As decisões 1 a 6 estão cumpridas.
- **Prop `omenTest`:** foi acrescentada pelo dev e aceita pelo orquestrador. É lida no mesmo ponto do passo físico, com um getter estável.
- **`LoopDoArremesso`:** cópia fiel do `ThrowLoop`.
- **`CorpoDoDado`:** igual ao `Die`, sem CCD.
- **Grafo de cena:** idêntico, inclusive a mesa dentro do mesmo `RigidBody` fixo.
- **`omenKinds`:** equivalente ao anterior.
- **Arquitetura:** passa.

**Ressalvas**, corrigidas pelo orquestrador: as citações mortas de `ThrowLoop` e de `Die.tsx` em:
- `armadilhas.md:8,14`;
- `dados.md:3,58,65`;
- `visao-geral.md:43,66`;
- `dados/CLAUDE.md:36`;
- os comentários de `e2e/worker.spec.ts:3` e `e2e/screens.spec.ts:26`.

## Gate

2026-11-14, rodado pelo orquestrador.

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ worker 2379,76 kB |
| `npm run lint` | ✅ |
| `npm test` | ✅ 51 arquivos, 486 testes |
| `npm run test:server` | ✅ 23 testes |
| amostra de E2E (`roll`, `coin`, `coin-performance`, `failure`, `worker`) | ✅ 27 de 27 (4,7 min) |
