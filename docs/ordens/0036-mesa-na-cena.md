# Ordem de serviço: `mesa`, a mesa e o fundo na cena

Ordem: OS-0036 (extração nº 7, `mesa`, parte 2 de 3)
Módulo: `mesa`
Escopo de escrita:
- `src/modules/mesa/`: `scene/*.tsx` (novo), `ui/FundoCss.tsx` (novo), `cena.ts`, `index.ts`, `store.ts` (só para `coresDaMesa`), `contracts.ts` (só para acrescentar) e `tests/`.
- **Legado:**
  - `src/scene/Tray.tsx` vai para `src/modules/mesa/scene/MesaNaCena.tsx`, com `git mv`, e perde a regra `broken()` (decisão 2);
  - `src/scene/Backdrop.tsx` vai para `src/modules/mesa/ui/FundoCss.tsx`, com `git mv`;
  - `src/scene/QuebraDaMesa.tsx` é novo, no legado de `pressagios` (decisão 2);
  - `src/scene/Omens.tsx`: só a leitura das cores (`coresDaMesa`).
- **Casca:** `src/App.tsx` (`<FundoCss/>`) e `src/app/Cena.tsx`. Na `Cena`, saem o panorama, a cor de fundo e as props do `EnvironmentPortal` (linhas 29-61 e 197-211), e entram `<MesaNaCena/>`, `<QuebraDaMesa/>` e `<AmbienteDaMesa/>`.
- **Docs:** `docs/contexto/mesa.md`, `apresentacao.md` e `visao-geral.md`, onde citam `Tray`, `Backdrop` e o panorama na `Cena`.

Objetivo: o que a mesa põe na tela passa a ser do módulo `mesa`. São a bandeja visível (o tema, a mesa importada e as cores), o fundo em CSS (foto e tema pronto) e o ambiente na cena (a cor de fundo, o panorama 360° e o mapa de reflexo).
- A regra de quando a bandeja quebra (kraken) sai da mesa. Fica no legado de `pressagios`, que avisa a mesa por `ocultarPiso(on)`.
- O comportamento, o visual e o número de luzes não mudam.

Leia antes de começar:
- `docs/specs/mesa.md`, em "Regras de negócio" e "Expõe"
- `src/modules/mesa/index.ts`, `cena.ts` e `store.ts`
- `src/scene/Tray.tsx` e `src/scene/Backdrop.tsx`, inteiros
- `src/app/Cena.tsx`, inteiro
- as linhas de `src/scene/Omens.tsx` que usam `useMesa`/`mesa()`
- `src/modules/arremesso/cena.ts` (`ColisoresDaBandeja`)
- `docs/contexto/armadilhas.md`, nos itens de luzes, shaders e panorama

Decisões do orquestrador:
1. **`<MesaNaCena/>`.**
   - É o `Tray` movido, com o mesmo código: o build padrão, o `.glb` carregado sob demanda, o `compileAsync`, o `setColors`, o `<ColisoresDaBandeja>` de `arremesso/cena` envolvendo a mesa e o `SURFACE`.
   - O `setColors` agora tem um escritor só, dentro do módulo (spec).
   - O `index.ts` exporta `coresDaMesa = () => mesa().colors`, e o `Omens.tsx` passa a usá-lo.
2. **`ocultarPiso(on)`.**
   - O módulo guarda `pisoOculto` (uma variável do módulo, não estado de render) e uma referência ao `surface` atual da `MesaNaCena`.
   - `ocultarPiso(on)` grava a flag e aplica `visible = !on` na hora no `surface` atual. Na troca de mesa, o `useLayoutEffect` aplica `!pisoOculto` ao novo piso, como hoje aplica `!broken()`, e no desmonte devolve `visible = true`.
   - O `useFrame` da `MesaNaCena` que hoje faz `setVisible(surface, !broken())` sai, porque quem chama `ocultarPiso` a cada quadro é o `QuebraDaMesa`.
   - **`<QuebraDaMesa/>`** (`src/scene/QuebraDaMesa.tsx`, no legado, porque é de `pressagios`) leva a função `broken()` de hoje, sem mudar, e faz `useFrame(() => ocultarPiso(broken()))`.
   - A casca o monta **antes** da `<MesaNaCena/>`, no lugar onde hoje está o `<Tray/>`. Assim o piso fica com a visibilidade certa no mesmo quadro, porque `ocultarPiso` aplica na hora.
   - Confira que o `visible` do piso, quadro a quadro, fica igual ao de hoje, inclusive na troca de mesa durante a quebra.
3. **`<FundoCss/>`.** É o `Backdrop` movido, sem mudança. O `App.tsx` o usa no mesmo lugar.
4. **`<AmbienteDaMesa podeTrocar>{children}</AmbienteDaMesa>`.**
   - Fica com o estado `pano`/`wanted`, o efeito que carrega o panorama, o `useFrame` que aplica o panorama, o `<color attach="background">` e o `<EnvironmentPortal …>`, com as mesmas props.
   - Os `Lightformer`s são da casca e entram como `children`.
   - `podeTrocar: () => boolean` é a condição de hoje (`hand`, ou `settled` com `showcased === throwId`). A casca passa essa função.
   - A ordem dos filhos na cena não muda: `color` (se houver), as luzes da casca e o `EnvironmentPortal`. Se não der para manter a ordem com o componente, pare e reporte.
5. **Sem React no `index.ts`.** `ocultarPiso` e `coresDaMesa` são puros. A referência ao `surface` pode ficar num arquivo `scene/piso.ts` sem React, como o `corpos.ts` do `arremesso`.

Entregáveis:
1. `MesaNaCena`, `AmbienteDaMesa`, `FundoCss`, `ocultarPiso` e `coresDaMesa`, com o `cena.ts` e o `index.ts`.
2. O `QuebraDaMesa` no legado e o `Omens.tsx` com `coresDaMesa`.
3. A casca compondo tudo na mesma ordem. Mostre o JSX da `Cena` antes e depois.
4. Um teste no módulo para `ocultarPiso`: a flag, a aplicação imediata e o novo piso herdando a flag, se der para testar sem cena. Se não der, registre.
5. Docs.

Critérios de aceite:
- `src/scene/Tray.tsx` e `src/scene/Backdrop.tsx` não existem.
- `grep -n "panoramaTexture\|EnvironmentPortal map\|attach=\"background\"" src/app/Cena.tsx` só mostra o que a decisão 4 deixa na casca (nada de panorama).
- `grep -rn "useMesa\|mesa()" src/scene src/app src/ui` mostra só o `TablePanel` (OS-0037) e o test hook (`table()`).
- `npm test`, `npm run build`, `npm run lint` e `npm run test:server` passam. A arquitetura passa: `mesa` só importa `arremesso` pela porta, o `index` fica sem React e não há ciclo. O worker não cresce, e o chunk `tableFile` continua sob demanda.
- **Sem E2E no dev.** O orquestrador roda uma amostra (`table`, `table-kraken`, `kraken`, `smoke`, `screens`).

Fora do escopo:
- O `TablePanel`, a conversão pura da mesa importada, `inspecao()` e o `CLAUDE.md`, que são a OS-0037.
- Mudar a regra de quebra (`trayBrokenAt`) ou os cacos do kraken.

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev
- `git mv`: `scene/Tray.tsx` → `modules/mesa/scene/MesaNaCena.tsx` (sem `broken()` nem `useFrame`; `setColors` interno) e `scene/Backdrop.tsx` → `modules/mesa/ui/FundoCss.tsx` (só os imports e o nome mudam). Novos: `mesa/scene/piso.ts`, `mesa/scene/AmbienteDaMesa.tsx`, `mesa/tests/piso.test.ts` e `src/scene/QuebraDaMesa.tsx`.
- Portas: `index` ganha `coresDaMesa` e `ocultarPiso` e perde `setColors`, `buildDefault` e `SURFACE`, que agora só são usados dentro do módulo. `cena` ganha `MesaNaCena`, `AmbienteDaMesa` e `FundoCss`. O `Omens` usa `coresDaMesa()`, e o `App` monta `<FundoCss/>` no mesmo lugar.
- Cena, antes: `color?`, `ambientLight`, `directionalLight`, `EnvironmentPortal{3 Lightformer}`, `Guard>Physics{Tray, MaoDoArremesso, …}`. Depois: `AmbienteDaMesa(podeTrocar=entreAnimacoes, luzes={ambient+directional}){3 Lightformer}`, que renderiza `color?`, luzes e portal, e `Guard>Physics{QuebraDaMesa, MesaNaCena, MaoDoArremesso, …}`. Para manter a ordem, acrescentei a prop `luzes`. `entreAnimacoes` é a condição de antes, agora usada também pelo DPR.
- **Visibilidade do piso:**
  - **Quadro a quadro.** Antes, o `useFrame` do `Tray` fazia `visible = !broken()`. Agora o do `QuebraDaMesa` faz `ocultarPiso(broken())`, que aplica o mesmo valor na hora. Ele ocupa a mesma posição na ordem dos `useFrame`, antes de `Mao`, `Hand`, `Loop` e `Omens`, porque é montado no lugar do `Tray`.
  - **Troca de mesa, inclusive durante a quebra.** No cleanup, o piso antigo volta a `visible = true` e sai do registro. No setup, o novo recebe `!pisoOculto`. Antes recebia `!broken()`, calculado no commit. O commit acontece fora do laço de quadros (promise ou UI), e o `useFrame` seguinte do `QuebraDaMesa` reaplica `broken()` antes do `gl.render`. Assim, nenhum quadro desenhado difere.
  - **Única diferença.** Entre o commit e o quadro seguinte, `visible` vale o `broken()` do último quadro. Só o test hook (`trayBroken`) leria isso, e nesse intervalo de menos de um quadro.
- **Achado no portal.** O drei só recaptura o cubemap e reaplica rotação, brilho e desfoque quando os `children` do `EnvironmentPortal` mudam de identidade. Antes, todo render da `Cena` criava `Lightformer`s novos. Agora o `AmbienteDaMesa` embrulha os `children` em `<>…</>` novo a cada render, e assim uma troca de `pano` ou de `background` recaptura como antes.
- **Divergência.** O `useFrame` do panorama vinha depois de todos os filhos, porque era da `Cena`. Agora roda antes deles, porque o `AmbienteDaMesa` é o primeiro filho, exigido pela ordem da cena. Ao voltar a `hand` ou ao fim do showcase (Hand/Loop no quadro), o panorama pode entrar um quadro depois. Nunca entra durante uma animação, porque a saída de `hand`/`settled` só ocorre por evento (`press`, `selection`).
- Teste `piso.test.ts`, sem cena: cobre a flag, a aplicação imediata e o novo piso herdando a flag. O piso que saiu deixa de ser tocado.
- Gate: `npm test` 495/495, `test:server` 23/23, build ok (worker 2.379,76 kB, igual; `tableFile` 42,40 kB em chunk próprio; `index` 690,01 kB, +0,17 kB), lint sem avisos e greps de aceite ok. E2E não rodados.

## Parecer do revisor

**APROVADO COM RESSALVAS.** O checklist §7 passou.
- **`MesaNaCena`:** é o `Tray` menos `broken()` e o `useFrame`.
- **`FundoCss`:** é o `Backdrop` sem mudança.
- **Visibilidade do piso:**
  - É igual em quadros normais, na quebra e no desmonte.
  - Na troca de mesa, o piso novo recebe `!pisoOculto`, em vez de `!broken()` calculado no commit. O quadro seguinte reaplica antes do `gl.render`, então nenhum quadro desenhado muda.
  - Os E2E leem depois de um quadro.
- **`AmbienteDaMesa`:**
  - A ordem `color`, luzes, portal é igual. A prop `luzes` é a solução mínima.
  - A recaptura do portal depende de `[children]` (drei 10.7.9, `Environment.js:134`), e o `<>…</>` a cada render reproduz o HEAD.
  - O panorama pode entrar um quadro depois, só ao sair de uma animação: uns 16 ms, imperceptível.
  - `entreAnimacoes()` é a mesma condição de antes, também no DPR.
- **`piso.test.ts`:** testa o que diz.

Ressalvas, corrigidas pelo orquestrador:
1. `docs/specs/mesa.md:33`: `AmbienteDaMesa` com `luzes` e `children`.
2. `docs/specs/pressagios.md:70`: a origem passa a ser `QuebraDaMesa.tsx`.
3. `src/modules/arremesso/NOTAS.md:30,39` cita `QuebraDaMesa` e `MesaNaCena`.

## Gate

2026-11-14, rodado pelo orquestrador.

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ worker 2379,76 kB; `tableFile` sob demanda |
| `npm run lint` | ✅ |
| `npm test` | ✅ 54 arquivos, 495 testes |
| `npm run test:server` | ✅ 23 testes |
| amostra de E2E (`table`, `table-kraken`, `kraken`, `smoke`, `screens`) | ✅ 33 de 33 (4,8 min) |
