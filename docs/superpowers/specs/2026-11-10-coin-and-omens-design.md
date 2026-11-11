# Moeda 3D e animações de crítico: design

Data: 2026-11-10. Branch: `feat/dice-3d` (local, sem push). Base: `59361c1`.
Este documento também é o handoff para outro agente, caso o trabalho precise continuar em outra sessão. A seção "Handoff" no fim diz o que já está feito.

## O que o usuário pediu

1. **Moeda 3D de cara ou coroa**, junto com os dados que já existem.
2. **Animações de resultado**, tocadas *depois que os dados param e antes de o resultado aparecer ou subir*:

| Caso | Quando | Animação |
| --- | --- | --- |
| Crítico do d20 | algum d20 tirou 20 | um raio cai no dado |
| Crítico do d100 | algum d100 tirou 1 (Call of Cthulhu: menor é melhor) | dez tentáculos rompem o piso da bandeja; o dado voa para a frente com o 1 dourado, asas e halo; a bandeja se recompõe |
| Falha crítica ("piu") | algum d20 tirou 1 ou algum d100 tirou 100 | sangue na tela |
| Dualidade | pelo menos um crítico **e** pelo menos uma falha no mesmo arremesso | yin-yang 3D (os dois peixes) voando sobre a bandeja, com tremida de tela na colisão |

Regras do pedido:

- Basta **pelo menos um**. Com 5d20, um 20 dispara o crítico e um 1 dispara a falha.
- A quantidade não importa por enquanto: dois "piu" e um crítico continua sendo dualidade.
- Com d20 e d100 juntos:
  - crítico nos dois: crítico (raio no d20 e kraken no d100);
  - falha nos dois: falha;
  - um de cada: dualidade.
- Só d20 e d100 contam. d10 de Vampiro, d6 de Fogo e a moeda não disparam nada.

## Decisões de design

### Moeda (`coin`)

- Novo `Shape`/`DieKind` `'coin'`. O corpo é um disco de 48 lados (raio aproximado 0,75, espessura 0,16), com aro em relevo. O colisor é um cilindro arredondado: o casco convexo fino balançava sem parar sobre as tampas. Uma moeda lenta e deitada tem a rotação travada para a fricção conseguir pará-la, inclusive em pilhas.
- `faces` tem **só as duas tampas**: valor 1 = **Cara** (+y) e 2 = **Coroa** (−y). Assim, `readUp` sempre devolve cara ou coroa, mesmo se a moeda parar encostada.
- Os rótulos são texto: "CARA" e "COROA", gravados nas tampas, no mesmo `BatchedText` por dado.
- O material é ouro metálico e opaco (`metalness` 1).
- Painel:
  - a moeda aparece como "Moeda: Cara";
  - a soma (`strong`) conta só os dados;
  - quando a seleção tem só moedas, o `strong` mostra a face (1 moeda) ou a contagem ("2 caras, 1 coroa").
- Notação:
  - `moeda`, `2moedas` e `2 moedas` (os espaços são ignorados);
  - `formatDice` escreve `1 moeda` ou `2 moedas`, e o texto lê de volta.
- O botão "Moeda" fica depois de "d6 Fogo".

### Presságios (omens)

- **Unidade pura** `src/dice/omen.ts`:
  - `omenOf(dice, results)` devolve `{ crits: number[]; fumbles: number[] } | null`, com os índices dos dados;
  - `omenKind(o)` devolve `'crit' | 'fumble' | 'duality'`;
  - `omenMs(o, dice)` dá a duração: raio 1.300 ms, tentáculos/ascensão 5.600 ms, sangue 1.700 ms, dualidade 2.600 ms.
- **Store:**
  - `publish` calcula `omen` junto com o resultado: `{ throwId, crits, fumbles } | null`;
  - com `reducedMotion`, o presságio é sempre `null`;
  - `omenDone: number` guarda o `throwId` cujo presságio acabou, e `setOmenDone` o grava;
  - `omenRig` é usado só no modo de teste e força os índices.
- **Sequência:**
  - enquanto `omen.throwId === throwId && omenDone !== throwId`, o `Hand` segura a apresentação comum. No crítico do d100, o próprio dado sorteado voa durante o presságio e o número cresce sobre sua face;
  - o painel não mostra o resultado;
  - quando o presságio acaba, tudo segue como hoje.
- **3D** (`src/scene/Omens.tsx`, montado no `Stage`):
  - **Raio:** fita em zigue-zague virada para a câmera, com núcleo branco, saindo de cima da tela até cada d20 crítico. São no máximo 3 lampejos (sem estroboscópio), com brilho aditivo no impacto e uma `pointLight` fixa que só muda de intensidade (não recompila shaders).
  - **Tentáculos e ascensão** (`src/scene/Kraken.ts`, `krakenMotion.ts`): um efeito por arremesso, com dez tentáculos, ventosas e lascas instanciadas. O piso visual se divide em fragmentos, com madeira exposta nas laterais. O dado real sobe com giro e arco, vira sua face sorteada para a câmera, recebe asas, halo e raios dourados e termina na posição comum do resultado. O enquadramento reserva espaço para as asas em desktop e celular. O relógio `omenAt` sincroniza todos os elementos.
  - **Dualidade:** as duas metades do yin-yang (os "peixes", com o olho da cor oposta) são extrudadas, uma clara e uma escura. Elas entram por lados opostos em espiral sobre a bandeja, colidem e formam o disco, que gira e encolhe.
  - Tudo é criado uma vez e compilado na montagem (`gl.compile`). Fica invisível fora do presságio, então custa 0 draw calls com a mesa parada.
  - O componente marca `omenDone` ao fim da linha do tempo. Se o arremesso mudar ou os dados forem recolhidos, ele esconde tudo.
- **DOM** (`src/ui/OmenOverlay.tsx`, dentro da `.game-area`):
  - **sangue:** vinheta vermelha, respingos SVG e escorridos animados por CSS, que desaparecem no fim;
  - **raio:** um único clarão branco suave;
  - **kraken:** vinheta verde-escura;
  - **dualidade:** `data-omen="duality"` na `.game-area` faz o canvas tremer (CSS, cerca de 500 ms) no instante da colisão.
- **Movimento reduzido:** não há presságio.

## Testes

- **Unitários:**
  - `polyhedron('coin')`: 2 faces lidas, rótulos e raio;
  - `readUp` da moeda;
  - `toResults`;
  - `parseDice`/`formatDice` com moeda;
  - `omenOf` e `omenKind` em todos os casos do pedido (d20, d100, misto, dualidade, ignora outros dados);
  - `omenMs`;
  - store: `publish` grava `omen`, e não grava com `reducedMotion`.
- **Física:** coin × 10 com força 0 e 1 para antes do limite, sem escapar.
- **E2E:**
  - moeda pelo botão e pelo chat; o painel mostra Cara/Coroa igual à face mostrada;
  - presságio forçado por `omenRig`: durante o presságio, o painel fica vazio e `showcased` não avança; depois a apresentação acontece;
  - capturas de cada presságio para conferir o visual.
- **Gate:** `npm run build`, `npm run lint`, `npm test`, `npx playwright test e2e/smoke.spec.ts e2e/roll.spec.ts e2e/chat.spec.ts e2e/omen.spec.ts`.
- **Desempenho:** 60 FPS com 10 dados parados (Chrome real). Durante o presságio, sem travada visível na primeira vez.

## Handoff (para continuar em outra sessão)

Regras do projeto:

- **ponytail:** a menor mudança completa.
- UI em português do Brasil.
- Commits locais na `feat/dice-3d`, sem push.
- Gravação atômica de arquivos (um Vite servindo arquivo truncado já deixou a tela branca).
- Não voltar a um `Text` por número.

Estado: veja `git log` a partir de `59361c1`. A ordem é moeda (commit 1), presságios (commit 2) e atualização da nota `02-Projetos/Ativos/DiceRoller.md` no vault do Obsidian `C:\Users\renpo\Downloads\SegundoCérebro`.

### Entrega e validação — 2026-11-10

- Moeda entregue em `59f2d99`; presságios concluídos na sequência, na mesma branch local.
- `e2e/omen.spec.ts` força somente a classificação do presságio pelo gancho de teste. A rolagem e o resultado continuam vindo da física, sem alterar a face sorteada.
- Cobertura: raio, kraken, sangue, dualidade e crítico simultâneo em d20/d100; dados e painel aguardam o fim do efeito; recolher cancela e o arremesso seguinte toca novamente.
- Movimento reduzido desativa os presságios e, se ativado durante um efeito, interrompe-o imediatamente, libera o resultado e mantém os dados onde pararam, sem o voo seguinte.
- Gate: build aprovado, lint sem avisos, 182 testes em 13 arquivos e 32 E2E aprovados (smoke, roll, chat, omen; Chrome com SwiftShader). O build mantém o aviso de tamanho do bundle.
- Chrome com Intel Iris Xe / D3D11, 1440×900, 180 quadros por amostra, sem relógio simulado: d20×10 e d100×10 a 60,3 FPS, p95 de 17,1 ms; nenhum mesh dos presságios visível fora de um efeito.
- Capturas conferidas em `screens/verified-{lightning,kraken,blood,duality,both}.png`; `screens/verification.json` guarda a medição e os estados. O relógio simulado foi usado somente nas capturas para fixar o instante do efeito. Esses artefatos são locais e ignorados pelo Git.
- Tasks 11–12 do plano original (fronteiras de erro e revisão geral) continuam no backlog; esta entrega conclui moeda e presságios.

### Revisão do crítico do d100 — 2026-11-10

Pedido: substituir o efeito anterior por uma ruptura da bandeja com muitos tentáculos, voo angelical do dado mostrando o 1 e restauração completa ao final.

- 0–450 ms: fissuras se desenham no piso.
- 450–1.450 ms: ruptura, lascas e dez tentáculos com ventosas; tremida breve no impacto.
- 1.450–2.600 ms: lançamento do dado real em arco, com giro desacelerando até a face correta olhar para a câmera.
- 2.600–4.200 ms: destaque dourado do 1, asas, halo, raios e iluminação quente.
- 4.200–5.400 ms: tentáculos recolhem, fragmentos voltam ao encaixe e o dado converge para sua posição habitual.
- 5.600 ms: resultado liberado e cena normal; o d100 não repete o voo comum.
- Recolher, trocar a seleção ou ativar movimento reduzido restaura imediatamente a bandeja e remove os efeitos. Os demais dados e a dualidade seguem suas regras.
- Testes de geometria verificam a cobertura do piso; testes da trajetória verificam a face correta e o encaixe final. Os E2E de desktop e 390 px encontram uma semente que realmente tira 1 na física, sem trocar a numeração nem fabricar o resultado.
- Capturas locais: `screens/kraken-{rupture,angel,restored}-{1440,390}.png`. O relógio controlado é usado somente nessas capturas e nas verificações de sequência.
- Desempenho da revisão, Chrome/Intel Iris Xe D3D11 em 1440×900: d20×10 e d100×10 a 60,3 FPS (p95 16,8 ms); sequência completa a 59,1 FPS (p95 16,8 ms, máximo 66,8 ms), com a cena restaurada e sem erros. Registro em `screens/kraken-performance.json`, medido sem relógio simulado.
- Para evitar recompilações durante o crítico, as luzes continuam presentes com intensidade zero fora do efeito. Depois que o mapa de reflexão fica pronto, os materiais e pipelines do ANGLE recebem um desenho de aquecimento, imediatamente substituído pela cena normal no mesmo quadro.
- Validação da revisão: build e lint aprovados, 191 testes em 14 arquivos e 37 E2E (smoke, roll, chat, omen, kraken). O build mantém o aviso já existente de tamanho do bundle.
