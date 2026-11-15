# Ordem de serviço: `pressagios`, camada HTML, CSS, botões de teste, inspeção e CLAUDE.md

Ordem: OS-0040 (extração nº 8, `pressagios`, parte 3 de 3)
Módulo: `pressagios`
Escopo de escrita:
- `src/modules/pressagios/`: `ui/*.tsx`, `ui/presagios.css` (novo), `domain/percurso.ts`, `domain/plano.ts`, `index.ts`, `cena.ts`, `contracts.ts` (só para acrescentar), `tests/`, `CLAUDE.md` (novo) e `NOTAS.md` (novo).
- **Legado movido** com `git mv`:
  - `src/ui/OmenOverlay.tsx` vai para `src/modules/pressagios/ui/OverlayDoPresagio.tsx`;
  - `src/ui/OmenTests.tsx` vai para `src/modules/pressagios/ui/BotoesDeTeste.tsx`.
- **Outros arquivos legados:**
  - `src/index.css`: saem os blocos `.omen*`, `.game-area[data-omen|data-kraken|data-storm]`, `.omen-tests`, se houver, e as `@keyframes` usadas só por eles;
  - `src/scene/Hand.tsx`: só a sombra e o fim do percurso (decisão 3);
  - `src/App.tsx` e `src/ui/Controls.tsx`: só os imports e as tags.
- **Casca:** `src/app/Cena.tsx`. O test hook (`omen`, `omenDone`, `omenTime`, `trayBroken`, `burning`, `shards`, `rigOmen`) passa a montar esses campos a partir do `inspecao()` do módulo.
- **Docs:** `docs/contexto/apresentacao.md`. A parte de presságio passa ao `CLAUDE.md`/`NOTAS.md` do módulo, e fica o que é da `vitrine` com um ponteiro. Também os links que mudarem.

Objetivo: fechar os `pressagios`.
- A camada HTML do presságio (o flash, o calor, o fundo do kraken e da tempestade, os peixes e o anúncio `role="status"`) passa ao módulo, com o CSS dela.
- O mesmo vale para os botões de teste.
- A vitrine deixa de ler `KRAKEN`/`STORM`.
- O módulo ganha `inspecao()`, `CLAUDE.md` e `NOTAS.md`.

O comportamento, o visual e os tempos do CSS não mudam.

Leia antes de começar:
- `docs/specs/pressagios.md`, inteiro
- `src/modules/pressagios/index.ts`, `cena.ts`, `contracts.ts` e `domain/plano.ts`/`percurso.ts`
- `src/ui/OmenOverlay.tsx` e `src/ui/OmenTests.tsx`, inteiros
- `src/scene/Hand.tsx:160-175`
- `src/app/Cena.tsx`, no test hook
- `grep -n "omen\|data-kraken\|data-storm\|omen-tests" src/index.css` e os blocos achados
- `docs/contexto/apresentacao.md`, inteiro
- `src/modules/mesa/CLAUDE.md` e `NOTAS.md`, como modelo

Decisões do orquestrador:
1. **`OverlayDoPresagio`.**
   - É o `OmenOverlay` movido.
   - O flash (`d20` crítico) e o calor (`d20` falha) passam a vir do `planoDoPresagio` (`raios`, `fogo`) **só se** um teste de equivalência, como o da OS-0039, provar que é igual. Se não for, fica o cálculo de hoje, registrado.
   - O DOM e os atributos em `.game-area` não mudam.
   - Teste de DOM com fixture capturada **antes**, nos casos crítico d20, kraken, falha d20, tempestade e dualidade, como nas OS-0026/0029/0034.
2. **CSS.**
   - Os blocos saem de `src/index.css` para `ui/presagios.css`, sem mudar uma regra, e entram pelo `import './presagios.css'` no `OverlayDoPresagio.tsx`. O Vite os injeta junto.
   - Confira no `vite build` que o CSS continua na carga inicial e que a ordem das regras não muda a especificidade. Se alguma regra de `index.css` depois do bloco o sobrescrever, mantenha a ordem relativa ou pare e reporte.
3. **Sombra e fim.**
   - `movimentoNoPresagio` passa a devolver também `sombra` (o momento em que a sombra some, hoje `KRAKEN.grab` ou `STORM.approach`) e `fim` (`KRAKEN.duration` ou `STORM.duration`), com o mesmo valor que o `Hand.tsx` usa hoje.
   - O `Hand.tsx:168,171` passa a usar esses campos, e `KRAKEN`/`STORM` saem do import dele.
   - O teste do percurso ganha os dois campos.
4. **`BotoesDeTeste`.** É o `OmenTests` movido, sem mudança, e o `App` o usa no mesmo lugar e na mesma condição (só em desenvolvimento ou teste).
5. **`inspecao()`.**
   - O `index.ts` exporta `inspecao(cena)`, que devolve `{ omen, omenDone, omenTime, trayBroken, burning, shards }` com o mesmo formato e o mesmo cálculo do test hook de hoje. O `omen` é o `omenKind` do arremesso corrente.
   - `rigOmen` continua como ação do store.
   - A casca monta o `__dice` a partir disso, e o `DiceHook` não muda.
6. **`CLAUDE.md` e `NOTAS.md`.**
   - O `CLAUDE.md` tem os cinco blocos da spec, entre 30 e 50 linhas, com os nomes reais. Ele diz:
     - as duas portas;
     - o presságio decidido em `resultadoPublicado`;
     - o cancelamento por movimento reduzido;
     - `planoDoPresagio` como fonte única;
     - o percurso que a vitrine pergunta;
     - `ocultarPiso`/`coresDaMesa` de `mesa`;
     - as luzes sempre na cena;
     - o que o módulo possui: o estado e os caches de shader.
   - O detalhe de presságio de `docs/contexto/apresentacao.md` vai para `NOTAS.md`, e a parte da `vitrine` continua lá.

Entregáveis:
1. `OverlayDoPresagio`, `BotoesDeTeste`, `presagios.css` e o teste de DOM.
2. A sombra e o fim no percurso, com o `Hand.tsx` ajustado.
3. `inspecao()` e o test hook.
4. `CLAUDE.md`, `NOTAS.md` e as docs.

Critérios de aceite:
- `src/ui/OmenOverlay.tsx` e `src/ui/OmenTests.tsx` não existem.
- `grep -n "KRAKEN\|STORM" src/scene/Hand.tsx` volta vazio.
- `grep -n "\.omen" src/index.css` volta vazio.
- `npm test`, `npm run build`, `npm run lint` e `npm run test:server` passam. O `index` fica sem React, o worker não cresce e a arquitetura passa.
- **Sem E2E no dev.** O orquestrador roda o E2E completo de aceite.

Fora do escopo:
- O voo comum, os números e o painel do resultado, que são da `vitrine`.
- Mudar duração, cores ou animações.

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev
- Fixture capturada do `OmenOverlay` legado **antes** de mexer (`tests/fixtures/overlay-antes.json`, `renderToStaticMarkup` com o efeito rodado na hora sobre uma `.game-area` falsa): crítico d20, kraken, falha d20, tempestade, dualidade, d20+d100 crítico, d20+d100 falha, sem presságio e encerrado. `tests/overlay.test.ts` compara HTML e atributos; passa com o `OverlayDoPresagio`.
- Decisão 1: equivalência escrita antes da troca (`tests/plano.test.ts`): flash = `raios.length > 0` e calor = `fogo.length > 0` nos 208 casos. Igual, então o overlay lê o plano. O `--ms` continua `omenMs` (idêntico a `plano.ms`).
- `git mv` dos dois arquivos; `BotoesDeTeste` só trocou imports e o nome da função. `App` os monta no mesmo lugar, `BotoesDeTeste` sob `import.meta.env.DEV`.
- CSS: 28 regras (`.omen*`, `.omen-tests`, `.game-area[data-*]`, as `@keyframes`) em `ui/presagios.css`, sem mudar regra. `.sr-only` é genérica e ficou em `index.css`. No build: um CSS só, na carga inicial (10,99 kB, igual); as mesmas 118 regras; o bloco na mesma ordem interna, agora no fim. Nenhuma regra depois dele atinge esses seletores.
- Decisão 3: `movimentoNoPresagio` dá `sombra`/`fim`; o `Hand.tsx` os usa e não importa mais `KRAKEN`/`STORM`; o teste do percurso cobre os dois.
- Decisão 5: `inspecao(cena)` no `index.ts` (tipo `PresagioInspecionado`) e `tests/inspecao.test.ts`. A casca monta `omen`/`omenDone`/`omenTime`/`trayBroken`/`burning`/`shards` com ela; `DiceHook` e `rigOmen` iguais.
- Docs: `CLAUDE.md` (32 linhas) e `NOTAS.md` novos; `apresentacao.md` ficou com a vitrine e um ponteiro. Atualizei também os links e referências que mudaram: a linha da tabela no `CLAUDE.md` da raiz, `visao-geral.md` (3 linhas) e `backlog.md` (2 linhas).
- Gate: `npm test` 61 arquivos/534 testes; `test:server` 23; `build` ok, worker 2.379.760 bytes (igual, mesmo hash); `lint` limpo; os greps de aceite voltam vazios.
- Pendência fora do escopo: o comentário de `scene/PresagiosNaCena.tsx:21` ainda diz "see OmenOverlay". Os `docs/diagnostico/*` são histórico e não foram tocados.

## Parecer do revisor

**APROVADO COM RESSALVAS** (revisão da OS e auditoria de aceite dos `pressagios`).

**Revisão:**
- **Overlay:** idêntico ao HEAD em 9 casos, numa comparação independente. Flash e calor vêm do plano, com equivalência provada em 208 casos.
- **CSS:** as linhas 98-141 do `index.css` são iguais às de `presagios.css`. Nenhuma regra depois do bloco atinge os mesmos elementos, então mover o bloco para o fim não muda nada.
- **Percurso:** sombra e fim têm os mesmos valores.
- **`inspecao(cena)`:** campo a campo igual ao de antes.
- **`BotoesDeTeste`:** inalterado.
- **Docs:** `CLAUDE.md` e `NOTAS.md` completos.

**Auditoria, com as ressalvas tratadas pelo orquestrador:**
1. **Efeito por dado num lugar só.** O `plays` de `arremesso/domain/vies.ts` repete a escolha, e não pode importar `pressagios` sem criar ciclo. O orquestrador acrescentou em `pressagios/tests/plano.test.ts` um teste de equivalência entre `plays` e `planoDoPresagio`, com os 5 botões em todas as jogadas de 9 mãos. A duplicação ficou registrada no `CLAUDE.md` do módulo e no mapa.
2. **Resultado antes do fim do presságio.** O orquestrador acrescentou ao `estado.test.ts` um passo: `presagioTocando()` continua verdadeiro até `setOmenDone(throwId)` e cai depois dele.
3. **`tempoDoPresagio()` não existe.** Fica registrado no mapa e na spec da `vitrine`: quem precisa lê `presagio().omenAt`.
4. **`CLAUDE.md` raiz:** agora lista `pressagios` entre os extraídos.

**Também na auditoria:**
- As luzes são criadas só no construtor.
- A duplicação de `regras` em `omenTest` foi desfeita.
- Os nomes diferentes da spec estão registrados: `rigOmen`, `inspecao(cena)`, `ui/presagios.css` e `aoMudarMovimentoReduzido`.

## Gate

2026-11-14, rodado pelo orquestrador. É o **aceite do módulo `pressagios`**, com E2E.

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ worker 2379,76 kB, um só CSS na carga inicial |
| `npm run lint` | ✅ |
| `npm test` | ✅ 61 arquivos, 535 testes |
| `npm run test:server` | ✅ 23 testes |
| `npm run e2e` | ✅ 98 de 98 (19,0 min) |

A primeira tentativa de E2E foi interrompida por falta de memória, com o Firefox aberto. Depois que o usuário fechou o Firefox, a segunda passou.
