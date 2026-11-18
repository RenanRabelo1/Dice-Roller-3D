# Módulo `dados`

Duas portas (ADR 0010): `index.ts`, puro e sem React (o worker e os testes em Node o importam), e `cena.ts`, com os componentes e hooks React. Tipos em `contracts.ts`, código em `domain/` (puro) e `scene/` (React). `domain/modelo.ts` puxa os carregadores GLB/STL e é um chunk à parte: só entra por `carregarModelo`, com `import()`. Nunca o importe estaticamente.

## Responsabilidade
O dado como objeto: o catálogo dos tipos jogáveis (embutidos e importados registrados), o sólido de cada tipo (geometria, faces, numeração, rótulos), a leitura da face de cima e a aparência do dado na cena (gema, tinta, numerais, símbolos, modelo importado). Não sabe quem está na mão, como se joga nem como um dado é importado. É dono do registro de importados (o `Map` de `domain/catalogo.ts`) e dos caches de poliedro, de símbolo e de modelo carregado.

## Regras de negócio
- Circunraio por forma (`RADIUS`; forma livre 0,85). `RAIO_MAXIMO` é o maior deles (0,9).
- Faces opostas somam (`OPPOSITE_SUM`): d6 7, d8 9, d10 9 (faces 0 a 9), d12 13, d20 21. O d100 tem 100 faces, numeradas `((rank*37) % 100) + 1`. O d4 é numerado por vértice. O 6 e o 9 ganham ponto em d10, d12, d20 e d100.
- Moeda: prisma de 48 lados; só as tampas são faces (1 = Cara em cima, 2 = Coroa).
- Símbolos por dígito do d10: `vtm` (6–9 ankh, 0 crit) e `hunger` (1 skull, 6–9 ankh, 0 fangs). Face vazia mantém o rótulo `''`.
- Leitura: a face cuja normal está mais alinhada com +Y; no d4, o vértice; com `readsDown` (forma livre), a de baixo. Só faces `readable !== false` contam. O d10 (inclusive `vtm`/`hunger`) lê 0 e vale 10.
- Ordem do catálogo: embutidos em `KINDS`, depois os importados em ordem de criação. Importado fora do catálogo vale como d20 (`baseOf`).
- `paraRegras(kind)`: um importado d20 com `omens` conta como `'d20'` para presságio (via `regras.tipoParaPresagio`).
- Tinta de importado: `auto` usa a escura (`#1B1A16`) se a luminância linear da gema passa de 0,5, senão a dourada (`#D4A93F`). Sem gravação ou `nenhuma`, sem tinta. Acabamento padrão: `gema`.
- Nome de exibição (`nomeDoTipo`): `d10 Vampiro`, `d10 Fome`, `Moeda`; importado `<base> <nome>`; forma livre só `<nome>`.
- Um objeto por dado para todos os numerais (desempenho). Gema sem passe de refração.
- `catalogoAlterado` emite `registrado` em `registerCustom` (também ao re-registrar o mesmo `kind` numa edição) e `removido` em `unregisterCustom`. `registerPoly` (só o worker) não emite. `customDie` devolve a mesma referência entre emissões.
- A aparência segue o catálogo sozinha: `AparenciaDoDado` lê o registro com `useSyncExternalStore` e a cor com `gemColor`.
- Remover um tipo libera o modelo carregado (`forgetModel`, assinado por `domain/modelo.ts` ao carregar). Só libera memória.

## Expõe
- `index.ts`, catálogo: `allKinds`, `baseOf`, `customDie`, `customKind`, `customList`, `customsOf` (os sólidos que o worker precisa), `paraRegras`, `polyhedron`, `registerCustom`, `registerPoly`, `sortDice`, `unregisterCustom`, `catalogoAlterado` (só `subscribe`).
- `index.ts`, sólidos e leitura: `fromTriangles`, `OPPOSITE_SUM`, `RADIUS`, `RAIO_MAXIMO`, `readUp`, `toResults`, `symbolGeometry`.
- `index.ts`, aparência pura: `GEM`, `gemColor`, `FONT`, `FONT_URL`, `SYMBOL`, `nomeDoTipo`, `finishOf`, `inkColorOf`, `carregarModelo` (sob demanda), `hasTexture`, `markInk`, `inkTriangles`, `dentTester`, `LIMITES_DO_MODELO_SALVO`.
- `index.ts`, teste: `inspecao = { rotulos, numeraisVisiveis, aparenciaDaGema }`, que recebe a raiz onde procurar (`die-i`/`gem-i`) e o índice; o `window.__dice` usa.
- `index.ts`, o dado na cena: `dadoNaRaiz`, `gemaNaRaiz`, `definirOpacidade` (todas as malhas sob `die-i`, o brilho da gravação incluído) e `definirSombra` (as malhas de `gem-i`), que recebem a raiz onde procurar e o índice; `sombraNaGema(gema, on)`, a mesma sombra sobre uma gema já achada com `gemaNaRaiz`, para quem a troca a cada quadro sem procurar na cena. Os nomes `die-i`/`gem-i` só existem dentro de `dados`.
- Tipos (`index.ts`): `CustomDie`, `Polyhedron`, `Numbering`, `StdBase`, `Ink`, `Finish`. `Face`, `Label`, `SymbolName`, `RotuloNaCena` e `AparenciaDaGema` ficam em `contracts.ts`, fora da porta.
- `cena.ts`: `<AparenciaDoDado index kind />` (malha e numerais, sem corpo físico), `GemMaterial`, `usePainted`, `paintGlb`.

## Consome
- `regras`: `BASE`, `KINDS`, `isCustom`, `tipoParaPresagio` e os tipos de dado.
- `src/shared/events` (`createSignal`), `src/shared/math` (`Vec3`, `Quat`, `sub`, `dot`, `cross`, `unit`) e `src/shared/modelos3d` (`readModel`, leitura do arquivo do modelo).

## Fora do escopo
- O corpo físico e o colisor do dado (`modules/arremesso/scene/CorpoDoDado.tsx`): `arremesso`.
- Importar, calibrar, salvar e excluir dados do jogador (quem chama `registerCustom`/`unregisterCustom`): `meus-dados`.
- Notação e apelidos do chat: `selecao`.
- A pose do dado no voo e o número em destaque: `vitrine`.
- Renomear as funções para os nomes em português da spec.
