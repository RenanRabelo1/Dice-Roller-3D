# Módulo `meus-dados`

Duas portas (ADR 0010): `index.ts`, puro e sem React (testes em Node), e `cena.ts`, com os hooks e os componentes. Tipos em `contracts.ts`, regras puras em `domain/` (`importador.ts`, `montagem.ts`), a gravação em `repository.ts`, o estado em `store.ts` e os componentes em `ui/`. O importador e o assistente só entram por `import()`: `carregarImportador()` no `index.ts` e o `AssistenteDeImportacao` lazy (montado por `<Importacao/>`), que é um chunk à parte. Já o `repository.ts` precisa ser carregado estaticamente: o `defineStore('customDice')` roda antes de o banco abrir (armadilhas.md).

## Responsabilidade
Os dados que o jogador traz de arquivo `.stl` ou `.glb`: o assistente de importação (arquivo, forma, números, salvar), a calibração, a tinta e o acabamento, a lista "Meus dados" (mudar a tinta, excluir) e a gravação no navegador. Cada dado salvo é entregue ao catálogo de `dados` (`registerCustom`), que o torna jogável. É dono do store `customDice` do IndexedDB, da lista `customs`, do `sessionOnly` (store `store`) e do estado do assistente (store `assistente`: `importando`, `montado`).

## Regras de negócio
- Arquivo de até 10 MB, 50 mil triângulos e texturas de 2048 px (`LIMITS`). GLB só aceita recursos `data:`/`blob:`.
- Dado padrão: o menor N em {4, 6, 8, 10, 12, 20} cujas N maiores faces cobrem 60% da área, com a face seguinte abaixo de 25% da menor e faces opostas (fora o d4). Sem isso: "Não reconheci um d4–d20" e a forma livre.
- O colisor é o sólido ideal (planos opostos simetrizados, escala `RADIUS[base]`), não a malha. Forma livre: de 3 a 60 faces de apoio; "não é justo" é aviso.
- Calibração padrão de 1 a N (d10 de 0 a 9), cada valor uma vez; livre de −99 a 999 (`FREE_VALUES`), com repetição. Oposta sugerida: `OPPOSITE_SUM − v`.
- `montarDado` (pura): `omens` só em d20 (`tipoParaPresagio`), cor e acabamento só em STL, tinta só se `printed`; `tintaPermitida`: com textura, só escura ou nenhuma.
- `salvar`: disco cheio (`QuotaExceededError`) recusa com mensagem e não registra; outra falha registra só na sessão (`sessionOnly`). Ao salvar, o dado entra na mão se houver vaga.
- `atualizar` aplica na hora e grava depois; se a gravação falhar, vale só na sessão.
- `excluir` (o botão pede confirmação) apaga o registro e depois tira o tipo do catálogo; `selecao` reage a `catalogoAlterado`.
- O assistente monta na primeira abertura (`alternarImportacao`) e continua montado depois de fechar (`fecharImportacao`).
- Só registros `version === 1` são carregados, em ordem de `createdAt`.
- O DOM dos componentes (textos, `aria-label`, roles, classes) é contrato dos E2E e do CSS; `tests/componentes.test.ts` o compara com o cabeçalho legado.

## Expõe
- `index.ts`: `carregar()` (a casca chama na montagem), `salvar`, `atualizar`, `excluir`, `meusDados()`, `alternarImportacao()`, `fecharImportacao()`, `inspecao()` (o `customs` do test hook), `montarDado`, `tintaPermitida`, `carregarImportador()`.
- Tipos (`contracts.ts`): `MeusDados`, `EstadoDoAssistente`, `DadoInspecionado`, `PedidoDeMontagem`; e `Imported`, `Plane`, `Solid` do importador.
- `cena.ts`: `useMeusDados()`; `<MeusDados/>` (o `div.selection` "Meus dados": por importado, `<BotaoDeDado kind/>`, Tinta e 🗑; no fim, "Importar dado"); `<Importacao/>` (o assistente, sob demanda; mora no próprio `cena.ts` porque o `import()` do `AssistenteDeImportacao` lazy fica ali, ADR 0009); `AssistenteDeImportacao`.

## Consome
- `dados`: catálogo (`registerCustom`, `unregisterCustom`, `customDie`, `customKind`, `customList`, `nomeDoTipo`), sólido (`fromTriangles`, `RADIUS`, `OPPOSITE_SUM`; `polyhedron` só nos testes), aparência (`GemMaterial`, `usePainted`, `paintGlb`, `GEM`, `inkColorOf`, `finishOf`, `inkTriangles`, `markInk`, `dentTester`, `carregarModelo`, `hasTexture`; `LIMITES_DO_MODELO_SALVO` só nos testes).
- `selecao`: `adicionar`, `slugOf`, `slugProblem`, `useSelecao`, `BotaoDeDado`.
- `regras`: `SIDES`, `FREE_VALUES`, `MAX_DICE`, `tipoParaPresagio`.
- `src/shared/db` (`defineStore`), `src/shared/modelos3d` (leitura do arquivo, limites por parâmetro), `src/shared/math`.

## Fora do escopo
- Como um dado importado é desenhado na mesa e lido: `dados`. O nome de exibição: `dados.nomeDoTipo`.
- A física: `arremesso`. `RollMode`, a força, o resultado e os textos de status: `arremesso` e `vitrine`.
- O CSS do grupo e do assistente.
