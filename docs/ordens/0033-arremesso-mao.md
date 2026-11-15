# Ordem de serviço: `arremesso`, a mão (gesto, mira, redemoinho, seta, retorno)

Ordem: OS-0033 (extração nº 6, `arremesso`, parte 4 de 5)
Módulo: `arremesso`
Escopo de escrita:
- `src/modules/arremesso/`: `scene/MaoDoArremesso.tsx` (novo), `cena.ts` e `tests/`.
- **Legado:** `src/scene/Hand.tsx`. Saem as partes do arremesso, e fica só a parte `settled` (vitrine e presságio).
- **Casca:** `src/app/Cena.tsx`, só a composição (`<MaoDoArremesso … />` ao lado do `<Hand … />`).
- **Docs:** `docs/contexto/arremesso.md` e `apresentacao.md`, onde citam `Hand.tsx`; `docs/specs/vitrine.md`, a linha de origem de `Hand.tsx`.

Objetivo: o que a mão faz no arremesso passa a ser do módulo. São a entrada (ponteiro e teclado), a mira, a seta, o redemoinho dos dados na mão, a passagem do movimento da mão para o lançamento (`motion`) e o retorno à mão.
- O `Hand.tsx` do legado fica só com o que acontece em `settled`: o voo, os números em destaque, a gravação acesa e o presságio. Isso é da `vitrine` e dos `pressagios`.
- O comportamento, a física, o tempo e o visual não mudam.

Leia antes de começar:
- `src/scene/Hand.tsx`, **inteiro** (362 linhas). É o arquivo central desta ordem.
- `docs/specs/arremesso.md`, nas regras de mira, teclado, carga, lançamento e retorno
- `docs/specs/vitrine.md`, na linha de origem de `Hand.tsx`
- `src/modules/arremesso/cena.ts` e `scene/LoopDoArremesso.tsx`, como modelo
- `docs/contexto/armadilhas.md`, nos itens de corpos cinemáticos, CCD e desempenho

Decisões do orquestrador:
1. **Divisão por fase.** O `useFrame` único de hoje faz, nesta ordem:
   1. a visibilidade da seta e o `live()`;
   2. o início de `hand`/`charging` (sombras, `toKinematic`, redemoinho, rotações, `setOpacity(1)`);
   3. o início de `returning`;
   4. esconder os números fora de `settled`;
   5. o início e a animação de `settled`;
   6. `mode.current = nextMode`;
   7. a animação de `returning`;
   8. o redemoinho e a seta em `hand`/`charging`.

   Os itens 1, 2, 3, 7 e 8, os efeitos de entrada (`useEffect` das linhas 80-145), a seta, `motion`, `handX`, `whirl`, `whirled`, `rotations`, `returning`, `previousAim` e o próprio `mode` vão para `MaoDoArremesso`.

   O `Hand` do legado fica com os itens 4 e 5, numbers, glyphs, showcase e glows, e com um `mode` próprio, atualizado no mesmo ponto relativo.

   As fases são exclusivas, então as duas metades nunca agem no mesmo quadro sobre a mesma coisa. **Confirme isso linha a linha**, e se achar uma escrita compartilhada (por exemplo, o mesmo corpo ou a mesma opacidade em duas fases), pare e reporte.
2. **Ordem de montagem.** `<MaoDoArremesso>` entra no lugar onde hoje está o `<Hand>`, dentro do `<Physics>`, e o `<Hand>` vem logo depois. Assim o `useFrame` da mão roda antes do da vitrine, como na ordem interna de hoje: os itens 2 e 3 antes do 5.
3. **Código igual.** As partes movidas são cópia. Muda só o que for preciso para cada metade ter o seu `live()`, o seu `current` e o seu `mode`. `setOpacity`, `shadows`/`shade`, `toKinematic` e `clampTarget` ficam com quem os usa. Se as duas metades usarem a mesma função auxiliar e ela for pura, ela vai para o módulo e o legado a importa do `index` ou do `cena`.
4. **Props.**
   - `MaoDoArremesso` recebe `gameArea` e `bodies`, como o `Hand` de hoje (o registro de corpos ainda é ponte até a OS-0034).
   - O que ela lê do legado hoje (`useDice`, `omenPlaying`, se ler) entra por prop-função, como o `omenTest` da OS-0032.
   - O módulo não importa o legado nem a casca.
5. **Nada de mudança visual.** O `return` do `Hand` hoje tem `<arrowHelper>` e o `<group name="result-highlights">`. A seta vai para a `MaoDoArremesso` e o grupo fica no `Hand`. Os dois continuam irmãos no grafo de cena, dentro do `<Physics>`, e o grupo mantém o nome.

6. **Decisão do orquestrador (2026-11-14), depois do mapeamento do dev.**
   - **O que o dev achou:** a única escrita compartilhada é a opacidade do brilho da gravação. O `ink-glow-i` fica dentro do grupo `die-i`, que o `setOpacity` percorre.
   - **O que muda:** no primeiro quadro de `returning`, o `setOpacity` da mão passa a rodar **antes** do `dropGlows` da vitrine, e não depois.
   - **Decisão (a), aceita:** o brilho é removido e descartado no mesmo quadro, antes de desenhar, então nada aparece diferente. Só acontece com dado gravado e sem movimento reduzido.
   - **`shade`:** não é pura (muda `castShadow`), então cada metade fica com uma cópia.

Entregáveis:
1. `scene/MaoDoArremesso.tsx` e o `cena.ts`.
2. O `Hand.tsx` só com a parte `settled`.
3. O `Cena.tsx` com a composição.
4. As docs, e na spec da `vitrine` a origem atualizada ("o que sobrou de `Hand.tsx`").

Critérios de aceite:
- `grep -nE "addEventListener|arrowHelper|stepWhirl|restingPlaces|clampTarget|setAim|setForce" src/scene/Hand.tsx` volta vazio.
- `src/modules/arremesso/` não importa o legado nem a casca, e o `index` fica sem React.
- `npm test`, `npm run build`, `npm run lint` e `npm run test:server` passam. O worker não cresce.
- **Sem E2E no dev.** O orquestrador roda uma amostra (`roll`, `kraken`, `showcase`/vitrine, `omen`, `reduced-motion`, se houver) depois da revisão.

Fora do escopo:
- O registro de corpos no módulo, `dadoNaCena`/`moverDado`, os componentes de UI, `inspecao()` e o `CLAUDE.md`, que são a OS-0034.
- Qualquer mudança na parte `settled`, além de separá-la.

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

- **Mapeamento:** a única escrita compartilhada é a opacidade do `ink-glow-i` (decisão 6, opção a). A `shade` tem uma cópia em cada metade.
- **`MaoDoArremesso`** (`src/modules/arremesso/scene/MaoDoArremesso.tsx`, novo): cópia das linhas antigas 28-36 e 71-145 (seta, `preview`, `live`, entrada), dos itens 1, 2, 3, 7 e 8 e de `setOpacity`/`shadows`. Tem o `mode` próprio, atualizado no mesmo ponto. Lê só `arremesso()`, sem `useDice` nem `omenPlaying`, então não precisa de prop-função. Devolve `<arrowHelper>`.
- **`Hand.tsx`** (de 362 para 203 linhas): numbers, glyphs, showcase, glows, `live`, `mode` próprio e os itens 4 e 5. A prop `gameArea` saiu porque ficou sem uso. O `<group name="result-highlights">` continua aqui.
- **`cena.ts`** exporta `MaoDoArremesso`. No **`Cena.tsx`**, `<MaoDoArremesso gameArea bodies />` vem logo antes de `<Hand bodies />`, dentro do `<Physics>`.
- **Docs:** `contexto/arremesso.md` (cabeçalho, movimento reduzido, mira, retorno), `contexto/apresentacao.md` (cabeçalho) e a origem do `Hand.tsx` em `specs/vitrine.md`, com o d100 agora em 164-173.
- **Gate:** `npm test` 51 arquivos e 486 testes; `test:server` 2 e 23; `build` ok, com o worker igual (2.379,76 kB antes e depois); `lint` ok, código de saída 0. O grep de aceite volta vazio. O módulo só importa `dados`, `regras`, `selecao` e `shared`, e o `index` continua sem React.
- **Pendências:** `docs/contexto/armadilhas.md` (itens 8, 9 e 11) ainda cita `Hand.tsx` para o retorno e o `pointerdown`. Está fora do escopo de escrita. `specs/arremesso.md:91` mantém as linhas antigas, como registro de origem. Não criei teste novo: a cena não roda em Node, e os testes de arquitetura cobrem as portas. Sem E2E.

## Parecer do revisor

**APROVADO COM RESSALVAS.**

O revisor conferiu com `diff` mecânico:
- `MaoDoArremesso` é o `useFrame` do HEAD sem os itens 4 e 5.
- `Hand` é o mesmo `useFrame` sem os itens 1, 2, 3, 7 e 8.
- Não há outra linha alterada.

Transições conferidas uma a uma: `hand`, `charging`, cancelamento, `rolling`, `settled`, `settled→returning`, `returning→hand` e `settled→hand` por troca de mão.
- Todas são iguais ao HEAD, menos a da decisão 6. O material do brilho é próprio de cada malha e é descartado no mesmo quadro.
- Os dois `mode` são gravados no ponto certo, e o `live()` dá o mesmo resultado nas duas metades.
- Os efeitos de entrada são idênticos.
- O grafo de cena e a ordem de montagem também.

Ressalvas, corrigidas pelo orquestrador:
- `armadilhas.md:9` foi corrigido. Os itens 8 e 11 já tinham sido.
- `visao-geral.md:54,65`.
- Não há teste unitário novo, porque a cena não roda em Node. A cobertura é a amostra de E2E abaixo.

## Gate

2026-11-14, rodado pelo orquestrador.

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ worker 2379,76 kB |
| `npm run lint` | ✅ |
| `npm test` | ✅ 51 arquivos, 486 testes |
| `npm run test:server` | ✅ 23 testes |
| amostra de E2E (`roll`, `kraken`, `omen`, `screens`, `coin-performance`) | ✅ 49 de 49 (9,5 min), inclusive os botões de teste dos presságios e o movimento reduzido |
