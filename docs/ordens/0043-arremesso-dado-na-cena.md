# Ordem de serviço: `arremesso`, dado na cena, mover dado, envelope da mão

Ordem: OS-0043 (pedido da `vitrine` ao `arremesso`, extração nº 9, parte 3 de 4)
Módulo: `arremesso`
Escopo de escrita:
- `src/modules/arremesso/`: `domain/*.ts`, `scene/*.tsx`, `index.ts`, `contracts.ts` (só para acrescentar), `tests/`, `CLAUDE.md` e `NOTAS.md`.
- **Legado da vitrine:** `src/scene/Hand.tsx`, só as linhas que movem corpos em `settled` (decisão 2).
- **Casca:** `src/app/Cena.tsx`, só o enquadramento da câmera (decisão 3).

Objetivo: o `arremesso` passa a oferecer o que a spec prometeu e a OS-0034 adiou:
- `moverDado(i, pose)`, só em `settled`, delegando a `apply`;
- `dadoNaCena(i)`;
- `envelopeDaMao()`, para o enquadramento da câmera.

A `MaoDoArremesso` passa a usar as funções de objeto do `dados` (OS-0042). O comportamento não muda.

Leia antes de começar:
- `src/modules/arremesso/CLAUDE.md`, `NOTAS.md`, `index.ts`, `domain/apply.ts` e `scene/corpos.ts`
- `src/modules/arremesso/scene/MaoDoArremesso.tsx:110-125`
- `src/scene/Hand.tsx`, as linhas que chamam `setTranslation`/`setRotation`/`setNextKinematic*` (`grep -n`)
- `src/app/Cena.tsx`, o efeito do enquadramento da câmera (procure "Fit the largest hand")
- `src/modules/dados/index.ts` (`definirOpacidade`, `definirSombra`, vindos da OS-0042)
- `docs/contexto/armadilhas.md`, nos itens de pose fixada antes de anunciar e de `apply.ts`

Decisões do orquestrador:
1. **`MaoDoArremesso`.** O `setOpacity` e o `shadows` dela passam a chamar `definirOpacidade(scene, i, o)` e `definirSombra(scene, i, on)` do `dados`. A cópia de `shade` sai. O resultado é o mesmo.
2. **`moverDado(i, pose)`.**
   - Fica em `domain/apply.ts` (o único lugar que muda pose, armadilhas), ou num arquivo que delega a ele, e é exportado pelo `index`.
   - Faz em `registroDeCorpos.current[i]` exatamente o que o `Hand.tsx` faz hoje para fixar a pose em `settled`, na mesma ordem: `setTranslation`/`setRotation` e/ou `setNextKinematic*`. Leia o `Hand.tsx` e reproduza.
   - Só age em `settled` e devolve sem fazer nada em outra fase. Confira que o `Hand` só move em `settled`. Se mover em outra fase, pare e reporte.
   - O `Hand.tsx` passa a chamar `moverDado`, e não sobra escrita direta de pose nele.
3. **`envelopeDaMao()`.**
   - Devolve os pontos extremos da mão e do redemoinho que o enquadramento da câmera na `Cena.tsx` calcula hoje inline (o "largest hand (20 bodies)" e os cantos).
   - A casca passa a chamar `envelopeDaMao()` e só faz a conta da câmera com os pontos.
   - Os valores são os mesmos de hoje, e há um teste que compara com os números atuais.
4. **`dadoNaCena(i)`** devolve o `Object3D` do dado `i` (`dadoNaRaiz` do `dados` sobre a raiz da cena). Só crie se o `Hand` ou a casca o usarem nesta ordem. Se não tiver chamador, não crie e registre.
5. **Docs.** O `CLAUDE.md` do módulo (Expõe) ganha `moverDado`, `envelopeDaMao` e, se criado, `dadoNaCena`, e perde a nota de adiamento. O `NOTAS.md` registra que, em `settled`, só `moverDado` mexe na pose.

Entregáveis:
1. A `MaoDoArremesso` com as funções do `dados`.
2. `moverDado`, `envelopeDaMao` e, se houver chamador, `dadoNaCena`, com testes.
3. O `Hand.tsx` e a casca usando as funções.
4. As docs.

Critérios de aceite:
- `grep -n "gem-\|die-\|shade" src/modules/arremesso/scene/MaoDoArremesso.tsx` volta vazio.
- `grep -nE "setTranslation|setRotation|setNextKinematic" src/scene/Hand.tsx` volta vazio.
- `npm test`, `npm run build`, `npm run lint` e `npm run test:server` passam. O `index` fica sem React, e o worker não cresce além de 2379,76 kB. Confira que `moverDado` em `apply.ts` não puxa React nem cena para o worker.
- **Sem E2E no dev.** O orquestrador roda uma amostra (`roll`, `coin`, `kraken`, `screens`, `omen`).

Fora do escopo:
- Mover o `Hand.tsx` para a `vitrine`, que é a OS-0044.

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

- **MaoDoArremesso:** `setOpacity`/`shadows` chamam `definirOpacidade(scene, i, o)`/`definirSombra(scene, i, on)`, e o `shade` saiu. O `shadows` só roda nas transições, então `definirSombra` basta. A opacidade roda a cada quadro do retorno (150 a 400 ms), mas antes já fazia uma busca por dado; mantive `definirOpacidade`, como manda a decisão 1, porque o `dados` não tem uma variante sobre o objeto. `Mesh`/`Object3D` saíram dos imports.
- **moverDado(i, pose, fixar = true):** fica em `domain/mover.ts` e delega a `moverCorpo` (novo, em `apply.ts`). Reproduz o `Hand`: com `fixar`, `setTranslation`/`setRotation` (sem acordar), e depois sempre `setNextKinematicTranslation/Rotation`. O 3º parâmetro cobre o voo (`fixar = t === 1`). Fora de `settled` ou em vaga vazia, não faz nada. O `Hand` só movia em `settled` (o bloco `phase === 'settled' && showcase.current`). Ficou fora de `apply.ts` porque o worker (`presim` → `apply`) puxaria o store.
- **Hand.tsx:** `pin(i, p, q, fixar)` → `moverDado(i, { p: p.toArray(), q: q.toArray() }, fixar)`. Ele usa o índice do registro, e não mais o corpo de `live()`. Em `settled` os dois coincidem (a vaga `i` é o dado `i`, e `live()` exige todos válidos).
- **envelopeDaMao():** `domain/envelope.ts` traz o código da casca sem mudança. A `Cena.tsx` faz `corners.push(...envelopeDaMao())`, e saíram os imports `HAND`, `handPositions`, `VORTEX`, `vortexCenter`, `vortexRadius`, `MAX_DICE` e `RAIO_MAXIMO`.
- **dadoNaCena:** não criado, porque não tem chamador (o `Hand` usa `dadoNaRaiz` de `dados`).
- **Testes (TDD, falharam antes):** `tests/mover.test.ts` (4; o "nada fora de `settled`" cobre `hand`, `charging`, `rolling` e `returning`, este por `press` em `settled`) e `tests/envelope.test.ts` (2: a cópia do cálculo antigo e os literais de hoje, com 176 pontos, x ±6,9, y 0,665..5,8, z −0,68..4,4, por `toBeCloseTo`). Na ressalva, `npm test` 555 ok e lint 0.
- **Docs:** `CLAUDE.md` (Expõe, Consome, Fora do escopo, lista de `domain/`) e `NOTAS.md` (passo 7 e `apply.ts`).
- **Gate:** `npm test` 66 arquivos/554 testes ok; `test:server` 23 ok; build ok, worker 2.379,76 kB (igual), sem store; lint exit 0; os dois greps de aceite vazios.

## Parecer do revisor

**APROVADO COM RESSALVAS.**
- **Pose:** as três escritas do `Hand` (`still`, presságio, voo) foram reproduzidas por `moverDado`/`moverCorpo` com a mesma ordem, o mesmo `wake` (`false`) e o mesmo momento (`t === 1`).
- **Índice do registro e `live()`:** coincidem sempre em `settled`, também na troca de mão.
- **Fora de `settled`:** o `Hand` já não escrevia pose fora de `settled`.
- **`envelopeDaMao`:** código idêntico, e a câmera fica igual.
- **Opacidade e sombra:** o mesmo efeito.
- **Worker:** não puxa o store.

Ressalvas:
1. `mapa-modulos.md:16`: `moverDado`/`envelopeDaMao` existem desde esta ordem, e `dadoNaCena` não existe porque não tem chamador. Corrigido pelo orquestrador.
2. `envelope.test.ts` comparava só com uma cópia do cálculo. O dev acrescentou valores literais de hoje: 176 pontos e o mínimo e o máximo de x, y e z.
3. `arremesso/CLAUDE.md:3` agora marca o `mover` como o único não puro, por ler o store e o registro. Corrigido pelo orquestrador.
4. `mover.test.ts` passou a cobrir `returning`, que o dev acrescentou.

## Gate

2026-11-14, rodado pelo orquestrador.

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ worker 2379,76 kB |
| `npm run lint` | ✅ |
| `npm test` | ✅ 66 arquivos, 555 testes |
| `npm run test:server` | ✅ 23 testes |
| amostra de E2E (`roll`, `coin`, `kraken`, `screens`, `omen`) | ✅ 48 de 48 (10,0 min) |
