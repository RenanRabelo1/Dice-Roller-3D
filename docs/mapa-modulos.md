# Mapa de módulos

Proposto em 2026-11-13, a partir de [diagnostico.md](diagnostico.md), e aprovado pelo responsável humano na mesma data. A fundação (fase 4) foi concluída nas OS-0004 a OS-0013; nenhum módulo foi extraído ainda.

Os módulos seguem domínios de negócio, não as pastas de hoje. As decisões que sustentam este mapa estão nos ADRs 0001 a 0008 (`docs/adr/`).

## Módulos

| Módulo | Responsabilidade | Dono dos dados | Pode depender de | Estado |
|---|---|---|---|---|
| `regras` | As regras do jogo que o servidor também aplica: tipos de dado, faces válidas, limite de 10 dados, total (moeda não soma), crítico, falha e dualidade. Puro, sem estado (ADR 0002). | nenhum | — | concluído (OS-0014 a OS-0017) |
| `historico` | Gravar cada arremesso publicado na API, com o jogador anônimo. Único módulo com metade no servidor (rotas, regra de gravação, coleção). | `localStorage['diceroller.player']`, coleção `rolls` | `regras`, `dados`, `arremesso` (evento) | pendente |
| `dados` | O dado como objeto: catálogo vivo dos tipos jogáveis (embutidos + importados registrados), sólidos, numeração, leitura da face, símbolos e aparência na cena (gema, tinta, numerais, modelo importado). | catálogo de tipos (registro em memória), caches de sólido, símbolo e modelo | `regras` | pendente |
| `selecao` | Quais dados estão na mão: botões, chat com notação, nomes de exibição e regras de apelido. | `dice` (a seleção) | `regras`, `dados` | pendente |
| `meus-dados` | Os dados que o jogador importa: assistente (arquivo, forma, calibração, tinta), salvar, editar tinta, excluir. Entrega cada dado salvo ao catálogo de `dados`. | IndexedDB `customDice`, a lista "Meus dados" e o aviso de sessão | `regras`, `dados`, `selecao` | pendente |
| `arremesso` | Do gesto à publicação: mira, carga, redemoinho na mão, lançamento, pré-simulação (worker e fallback), parada, replay, publicação do resultado e retorno à mão. Dono da área de jogo física (bandeja, colisores). | `gesture`, `throwId`, `aim`, `force`, `chargeMode`, `launch`, `results`, `raw`, `ready`, registro de corpos, worker, `localStorage['diceroller.rolagem']` | `regras`, `dados`, `selecao` | pendente |
| `mesa` | Aparência da mesa e do fundo: temas, cores, texturas, foto, fundo 360°, mesas salvas, exportar e importar `.glb`. Só visual: nunca muda colisores nem resultados. | store da mesa (`theme`, `tables`, `colors`, `sessionOnly`), IndexedDB `tables`, `localStorage['mesa.ativa']`, caches de textura e panorama | `arremesso` | pendente |
| `pressagios` | Decidir e mostrar o presságio de um resultado (raio, kraken, fogo, tempestade, dualidade) em 3D e em HTML, com duração, relógio e quebra da mesa. | `omen`, `omenAt`, `omenDone`, `omenRig` | `regras`, `dados`, `arremesso`, `mesa` | pendente |
| `vitrine` | Mostrar o resultado: o voo dos dados até a câmera, os números em destaque, a gravação acesa e o painel com total e detalhe. Espera o presságio terminar. | `showcased`, cache do brilho da gravação | `regras`, `dados`, `arremesso`, `pressagios` | pendente |

O que não é módulo:

- **`src/shared/`** é infraestrutura do cliente, sem regra de negócio (ADR 0008): banco IndexedDB, sinais (eventos), plataforma (falhas, movimento reduzido, renderizador por software), leitura segura de arquivo 3D, matemática vetorial e easing.
- **Casca** (`src/main.tsx`, `src/App.tsx`, `src/app/`): compõe os módulos, monta o Canvas, a câmera, as luzes e o DPR adaptativo, e reúne o `window.__dice` dos testes. Pode importar o `index.ts` de qualquer módulo. Nenhum módulo importa a casca.
- **`server/src/shared/`**: conexão MongoDB e logger do Fastify.

## Dependências permitidas

```
regras ◄──────────────────────────────────────────── (todos)
dados ──► regras
selecao ──► dados, regras
meus-dados ──► selecao, dados, regras
arremesso ──► selecao, dados, regras
mesa ──► arremesso
pressagios ──► arremesso, mesa, dados, regras
vitrine ──► pressagios, arremesso, dados, regras
historico (cliente) ──► arremesso, dados        historico (servidor) ──► regras
```

O grafo não tem ciclo. Uma seta significa importar o `index.ts` (valores) ou o `contracts.ts` (só tipos) do módulo de destino. Todos podem depender de `src/shared/`. O `shared/` não depende de nenhum módulo.

## Eventos

O mecanismo está no ADR 0005: síncrono, e quem publica é dono do sinal. Quem assina depende de quem publica.

| Evento | Publicado por | Quando | Payload (nível de planejamento) | Assinado por |
|---|---|---|---|---|
| `catalogoAlterado` | `dados` | um tipo importado entra, muda ou sai | tipos atuais | `selecao` (tira da mão o que sumiu), componentes que listam tipos |
| `selecaoAlterada` | `selecao` | a mão muda | `dice` | `arremesso` (volta à mão, novo `throwId`, limpa o lançamento) |
| `resultadoPublicado` | `arremesso` | o último quadro do replay | `throwId`, `dice`, `results`, `raw`, `force` | `pressagios` (decide o presságio), `historico` (grava) |
| `movimentoReduzidoAlterado` | `shared/plataforma` (infra) | a preferência do sistema muda | `boolean` | `pressagios` (cancela o show em curso) |

## Dados disputados hoje e quem fica como dono

Verificado no código. O detalhe e as linhas estão no diagnóstico, §6.

| Dado | Quem escreve hoje | Dono | Como os outros obtêm ou mudam |
|---|---|---|---|
| `gesture`, `throwId`, `launch`, `results`, `force` | `selection()` da seleção, `input` do arremesso, `publish` | `arremesso` | `selecao` não escreve mais. `arremesso` assina `selecaoAlterada` e se reinicia |
| `dice` (seleção) | `addDie`/`removeDie`/`setDice` e `removeCustom` | `selecao` | `meus-dados` exclui no catálogo de `dados`, e `selecao` reage a `catalogoAlterado` |
| `omen`, `omenAt` | `publish` (arremesso) e `setReducedMotion` | `pressagios` | `pressagios` assina `resultadoPublicado` e `movimentoReduzidoAlterado`. Os outros leem `presagioTocando()` e `tempoDoPresagio()` |
| `error` | `App` (WebGL), `Guard` (renderizador/física), `app/Cena` (física) | `shared/plataforma` | `registrarFalha(tipo)` (o primeiro vence, como hoje) e `falha()` |
| `reducedMotion` | `App` | `shared/plataforma` | `movimentoReduzido()` e o evento acima |
| `ready` | o efeito do test hook em `app/Cena` | `arremesso` (cena pronta = corpos registrados) | `prontoParaJogar()` |
| `showcased` | `Hand` (parte do showcase) | `vitrine` | `vitrineConcluida(throwId)`; a casca usa para o DPR e o panorama |
| registro de importados (`Map` em `custom.ts`) e `store.customs` (cópia) | `registerCustom` e as ações do store | registro → `dados` (catálogo); registros salvos → `meus-dados` | `meus-dados` chama `dados.registrarTipo/removerTipo`. Ninguém mais lê o registro direto |
| `omenD20s` (`Set` global em `kinds.ts`) | `custom.ts` | deixa de existir | `dados.paraRegras(kind)` devolve `'d20'` para um importado que conta como d20, antes de chamar `regras` (como o servidor já faz) |
| `useTable.colors` | `tableState` (cores do tema) e `Tray` (cores do objeto 3D) | `mesa` | `coresDaMesa()`. A fonte de verdade dentro da `mesa` é decisão de negócio (dúvida 5) |
| Visibilidade do piso na quebra | `Tray` chama `trayBrokenAt` do kraken | regra em `pressagios`, objeto em `mesa` | `pressagios` chama `mesa.ocultarPiso(bool)`; a `mesa` não conhece o kraken |
| Registro de corpos (ref `bodies` em `app/Cena`) | `Die` | `arremesso` | Leitura de pose por `corpos()`. Em `settled`, a `vitrine` move os dados por `arremesso.moverDado(i, pose)` e é a única que move nessa fase |
| Nomes de objeto (`die-i`, `gem-i`, `tray-surface`, `result-highlights`…) | `Die`, `tableBuild`, `Hand` | quem nomeia | Os outros não procuram por nome: o dono expõe a função (opacidade, sombra, ocultar piso). O test hook usa a inspeção de cada módulo |
| `softwareGl` (`tableImages`) | `app/Cena` | `shared/plataforma` | `renderizadorPorSoftware()` |
| Banco IndexedDB `dice-roller` (abre e atualiza as duas stores) | `indexedDb.ts` | infra `shared/db`; cada store é do módulo dono | o `repository.ts` de cada módulo declara a própria store |
| `parseGlb` (leitura de GLB que a mesa usa do importador de dados) | `dice/importer.ts` | infra `shared/modelos3d` | limites por parâmetro. `dados`, `meus-dados` e `mesa` usam |

```json donos-dos-dados
{
  "indexedDB": { "customDice": "meus-dados", "tables": "mesa" },
  "localStorage": { "diceroller.player": "historico", "mesa.ativa": "mesa", "diceroller.rolagem": "arremesso" },
  "mongodb": { "rolls": "historico" }
}
```

O bloco acima é lido pelo teste de arquitetura (ADR 0006). Mudou um dono? Mude aqui.

## Ciclos de hoje e como somem

Estado em 2026-11-13, depois da fundação até a OS-0010: os ciclos de import que restam são os de `CICLOS_CONHECIDOS` em `tests/arquitetura/config.ts`, que falha se surgir um novo ou se um deles sumir.

| Ciclo (verificado no grafo de imports) | O que o sustenta | Como some |
|---|---|---|
| pastas `physics ↔ throw` (era `dice ↔ physics ↔ throw`; o lado `dice` sumiu com `shared/math`, OS-0005/0006) | `Vec3`/`Quat` em `physics/world.ts`, usados pela geometria; parâmetros do arremesso (`TRAY`, `LAUNCH`, `SETTLE`, `HAND`) no mesmo arquivo do motor; `presim` lendo o registro de importados | Vetores vão para `shared/`; `throw/` + `physics/` viram o módulo `arremesso`; `MAX_RADIUS` vai para `dados`; a pré-simulação recebe os sólidos prontos (já chegam em `RollRequest.customs`) |
| arquivos `custom.ts ↔ polyhedra.ts` | `polyhedron(kind)` resolve importados pelo registro | Interno a `dados`: tipos, construtores de sólido e catálogo em arquivos separados, nessa ordem de dependência |
| ~~pastas `scene ↔ ui`~~ — **desfeito** na OS-0008 (o `Guard` foi para `shared/plataforma`); resta `ui → scene` em sentido único (`TablePanel` importa a mesa) | — | A mesa vira módulo próprio, com o painel dentro |
| `mesa ↔ presságio` (`Tray → trayBrokenAt`, `Omens → useTable.colors`) | a regra de quebra é executada pela mesa | `pressagios → mesa` em sentido único (`coresDaMesa`, `ocultarPiso`) |
| latente `showcase ↔ presságio` (aparece ao partir `Hand.tsx`) | `krakenMotion` usa `Pose`/`easeOut` de `showcase`/`highlight`; `Hand` usa o caminho do d100 do kraken | `Pose`/`easeOut`/`span` vão para `shared/`; `vitrine → pressagios` (`movimentoDoDadoNoPresagio`), e a pose final do voo entra por parâmetro |
| gatilho do histórico na casca (`App.tsx:26`) | a casca assina o store e chama `saveRoll` | `historico` assina `resultadoPublicado` |

## Fronteiras discutíveis (alternativa descartada e motivo)

1. **`regras` separado de `dados`.** A alternativa era um módulo `dados` só. Descartada porque o servidor importa as regras, e o `index.ts` de `dados` puxaria `three`: o servidor roda TS direto no Node, sem `three` instalado.
2. **`meus-dados` separado de `dados`.** A alternativa era juntar os dois (cerca de 1.900 linhas, com o importador de 495). Descartada porque o importador é um subdomínio grande e sem estado. Junto, toda mudança no assistente pediria ler o módulo que desenha todos os dados. O custo da separação: o catálogo (em `dados`) guarda o necessário para jogar com um importado, e o registro salvo (em `meus-dados`) guarda arquivo e escolhas. É um dado derivado com dono explícito, no lugar das duas cópias sem dono de hoje.
3. **`selecao` separada de `arremesso`.** A alternativa era a mão ser parte do arremesso. Descartada porque a seleção tem UI própria (botões, chat, notação) e regras próprias (apelido, ambiguidade, limite), e porque `meus-dados` precisa dela sem depender do arremesso.
4. **`pressagios` separado de `vitrine`.** A alternativa era um módulo só, "apresentação do resultado" (cerca de 1.200 linhas), como `docs/contexto/apresentacao.md` faz. Os dois se tocam num ponto só, o caminho do d100 no kraken e na tempestade. Esse ponto se resolve em sentido único (a vitrine pergunta ao presságio). São duas features que o negócio nomeia separadamente, e juntas formariam o maior módulo do sistema.
5. **`mesa` dependendo de `arremesso`.** É só pelas medidas da área de jogo (`TRAY`), porque a mesa encaixa o visual nelas. A alternativa era pôr `TRAY` em `regras`. Descartada porque o servidor não usa as medidas e `regras` deve continuar estreito.
6. **Painel de resultado na `vitrine`.** Hoje está em `Controls.tsx`, junto com os botões. A dica por fase e a barra de força vão para o `arremesso`; os botões vão para `selecao` e `meus-dados`; a casca monta o cabeçalho e o rodapé com os componentes que cada módulo expõe.

## Ordem de extração

Do que tem menos dependências para o que tem mais. Um módulo só começa quando o anterior foi aceito.

1. `regras`: zero dependências. Tira o `omenD20s` e a duplicação do total, e muda o caminho que o servidor importa.
2. `historico`: depende só de `regras` no servidor. No cliente, até o `arremesso` existir, a casca entrega o arremesso por função (`historico.registrar(...)`). A troca para o evento é uma ordem da fase 6.
3. `dados`
4. `selecao`
5. `meus-dados`
6. `arremesso`
7. `mesa`
8. `pressagios`
9. `vitrine`

Enquanto um módulo não é extraído, o código dele continua nas pastas atuais (o "legado"). Como o código já extraído convive com o legado é definido no plano (`docs/plano-refatoracao.md`, entrega 2).
