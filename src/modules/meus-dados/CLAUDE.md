# Módulo `meus-dados`

Duas portas (ADR 0010): `index.ts`, puro e sem React (testes em Node), e `cena.ts`, com os hooks e os componentes. Tipos em `contracts.ts`, regras puras em `domain/` (`importador.ts`, `montagem.ts`), a gravação em `repository.ts`, o estado em `store.ts` e os componentes em `ui/`. O importador e o assistente só entram por `import()`: `carregarImportador()` no `index.ts` e o `AssistenteDeImportacao` lazy (montado por `<Importacao/>`), que é um chunk à parte. Já o `repository.ts` precisa ser carregado estaticamente: o `defineStore('customDice')` roda antes de o banco abrir (armadilhas.md).

## Responsabilidade
Os dados que o jogador traz de arquivo `.stl` ou `.glb`: o assistente de importação (arquivo, forma, números, salvar), a calibração, a tinta e o acabamento, a lista "Meus dados" com a ficha de cada dado (editar tudo, excluir) e a gravação no navegador. Cada dado salvo é entregue ao catálogo de `dados` (`registerCustom`), que o torna jogável. É dono do store `customDice` do IndexedDB, da lista `customs`, do `sessionOnly` (store `store`) . O estado do assistente (aberto, montado) não é daqui: a casca controla os capítulos (`importando`/`montado` saíram do store; o `montado` é estado local de `<Importacao/>`).

## Regras de negócio
- Arquivo de até 10 MB, 50 mil triângulos e texturas de 2048 px (`LIMITS`). GLB só aceita recursos `data:`/`blob:`.
- Dado padrão: o menor N em {4, 6, 8, 10, 12, 20} cujas N maiores faces cobrem 60% da área, com a face seguinte abaixo de 25% da menor e faces opostas (fora o d4). Sem isso: "Não reconheci um d4–d20" e a forma livre.
- O colisor é o sólido ideal (planos opostos simetrizados, escala `RADIUS[base]`), não a malha. Forma livre: de 3 a 60 faces de apoio; "não é justo" é aviso.
- Calibração padrão de 1 a N (d10 de 0 a 9), cada valor uma vez; livre de −99 a 999 (`FREE_VALUES`), com repetição. Oposta sugerida: `OPPOSITE_SUM − v`.
- `montarDado` (pura): `omens` só em d20 (`tipoParaPresagio`), cor e acabamento só em STL, tinta só se `printed`; `tintaPermitida`: com textura, só escura ou nenhuma.
- `salvar`: disco cheio (`QuotaExceededError`) recusa com mensagem e não registra; outra falha registra só na sessão (`sessionOnly`). Ao salvar, o dado entra na mão se houver vaga.
- `atualizar` aplica na hora e grava depois; se a gravação falhar, vale só na sessão.
- `excluir` (o botão pede confirmação) apaga o registro e depois tira o tipo do catálogo; `selecao` reage a `catalogoAlterado`.
- "Meus dados" e "Importar dado" são capítulos do livro, controlados pela casca (`Painel.tsx`) por props: `<MeusDados aberto onFechar onImportar/>` e `<Importacao aberto onFechar onSalvo/>`. O assistente monta na primeira abertura e continua montado depois de fechar (estado local `montado`). Salvar chama `onSalvo` (a casca vira a página para Meus dados) e zera o assistente; fechar pelo × ou Esc chama `onFechar`.
- O assistente mostra os quatro passos (`ol.import-passos`, `aria-current="step"`). Modelo não padrão: a explicação (`role="alert"`) fica dentro do `.import-choice`, antes do botão de forma livre.
- **Ficha do dado** (OS-0085): em "Meus dados", a página esquerda tem a lista e o "Forjar um dado novo" embaixo dela; a direita, a ficha (`ui/FichaDoDado.tsx`, `section.ficha-do-dado`) do dado escolhido. O botão **Editar** de todo cartão (`aria-pressed`) escolhe; ao abrir vale o primeiro, e excluir o escolhido passa para o primeiro que restar. O `InkButton` e o `details.ink-pop` saíram. A janela 3D (`ui/JanelaDoDado.tsx`) é um `<Canvas>` próprio, montado só com o capítulo aberto, com `AparenciaDoDado` (`dados/cena.ts`), giro lento e arrastar; sem giro em perfil leve e movimento reduzido (`frameloop="demand"` no leve).
  - Campos (`camposDaFicha`, `domain/ficha.ts`): nome e apelido sempre; tinta se `printed`; acabamento e cor da gema se STL; presságios se `base === 'd20'`. Cada mudança chama `atualizar({ ...die, ...patch })`, partindo do dado atual do catálogo. A cor espera 300 ms depois do último movimento (e grava ao sair da ficha). Nome (até 40) e apelido gravam no Enter ou ao sair do campo; nome vazio volta ao anterior; o apelido passa por `slugProblem` contra os **outros** dados, e o erro (`role="alert"`) impede a gravação. Mudar o apelido só muda como o dado se chama no chat: a mão o guarda por `custom:<id>`.
  - Motion (só `transform` e `opacity`; nada com movimento reduzido): o cartão escolhido sobe 2 px; ao trocar, o conteúdo velho some em 150 ms, a página faz a virada, o dado se materializa (escala 0,6 a 1, giro de 6 rad/s caindo em 700 ms) sobre o lampejo dourado, os campos entram em cascata (50 ms entre linhas, a partir de 200 ms) e cada mudança dá um pulso de 180 ms. Dado, lampejo e pulso são WAAPI (`JanelaDoDado`); os campos, CSS (`ficha-sobe`).
- `inspecao()` traz também `ink`, `finish`, `color` e `omens`, para o E2E conferir a ficha.
- Só registros `version === 1` são carregados, em ordem de `createdAt`.
- O DOM dos componentes (textos, `aria-label`, roles, classes) é contrato dos E2E e do CSS; `tests/componentes.test.ts` confere o DOM dos dois capítulos.

## Expõe
- `index.ts`: `carregar()` (a casca chama na montagem), `atualizar`, `meusDados()`, `inspecao()` (o `customs` do test hook), `carregarImportador()`. `salvar`, `excluir`, `montarDado` e `tintaPermitida` não saem do módulo: o assistente, a lista e os testes os importam de `store.ts` e `domain/montagem.ts`.
- Tipos: `MeusDados` (`contracts.ts`); e `Imported`, `Plane`, `Solid` do importador. `DadoInspecionado` e `PedidoDeMontagem` ficam em `contracts.ts`, de uso interno.
- `cena.ts`: `<MeusDados aberto onFechar onImportar/>` (o capítulo: por importado, `<BotaoDeDado kind/>`, Editar e Excluir; embaixo da lista, "Forjar um dado novo"; à direita, a ficha); `<Importacao aberto onFechar onSalvo/>` (o assistente, sob demanda; mora no próprio `cena.ts` porque o `import()` do `AssistenteDeImportacao` lazy fica ali, ADR 0009); `AssistenteDeImportacao`.

## Consome
- `dados`: catálogo (`registerCustom`, `unregisterCustom`, `customDie`, `customKind`, `customList`, `nomeDoTipo`), sólido (`fromTriangles`, `RADIUS`, `OPPOSITE_SUM`; `polyhedron` só nos testes), aparência (`GemMaterial`, `usePainted`, `paintGlb`, `GEM`, `inkColorOf`, `finishOf`, `inkTriangles`, `markInk`, `dentTester`, `carregarModelo`, `hasTexture`; `LIMITES_DO_MODELO_SALVO` só nos testes).
- `selecao`: `adicionar`, `slugOf`, `slugProblem`, `useSelecao`, `BotaoDeDado`.
- `regras`: `SIDES`, `FREE_VALUES`, `MAX_DICE`, `tipoParaPresagio`.
- `src/shared/plataforma` (`perfilLeve`, `movimentoReduzido`), `src/shared/db` (`defineStore`), `src/shared/modelos3d` (leitura do arquivo, limites por parâmetro), `src/shared/math`.

## Fora do escopo
- Como um dado importado é desenhado na mesa e lido: `dados`. O nome de exibição: `dados.nomeDoTipo`.
- A física: `arremesso`. `RollMode`, a força, o resultado e os textos de status: `arremesso` e `vitrine`.
- O CSS dos capítulos (`index.css`, dentro do `.livro`).
